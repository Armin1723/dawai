-- ============================================================================
-- MediFlow AI — 0017_fix_sale_return_validation.sql
-- Code-review fixes for 0016's create_sale_return:
-- 1. Cumulative validation: Pass 1 now tracks the quantities already validated
--    for each sale_item *within the same payload*, so duplicate lines can no
--    longer over-return a line (e.g. two [{qty:2}] entries against a 3-unit
--    line used to pass both checks and insert 4 units of returns).
-- 2. Per-line rounding: each line's refund is rounded to 2dp in Pass 2 and
--    the sale header is decremented by the *sum of the rounded lines*, so
--    sales.total always equals Σ(returns.refund_amount) — no paisa drift.
-- ============================================================================

create or replace function public.create_sale_return(
  p_store_id uuid,
  p_sale_id uuid,
  p_processed_by uuid,
  p_items jsonb,
  p_refund_method payment_method default 'cash',
  p_refund_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale record;
  v_item jsonb;
  v_sale_item_id uuid;
  v_quantity numeric;
  v_reason text;
  v_sale_item record;
  v_returned_before numeric;
  v_validated jsonb := '{}'::jsonb; -- sale_item_id -> qty accepted in this payload
  v_validated_qty numeric;
  v_batch_id uuid;
  v_line_refund numeric;
  v_line_cost numeric;
  v_gross_total numeric := 0;      -- Σ(line_total) across sale items (pre-sale-discount gross)
  v_returned_gross numeric := 0;   -- gross share of the returned lines
  v_gst_refund numeric := 0;       -- GST portion of the refund
  v_refund numeric := 0;           -- Σ of rounded per-line refunds (source of truth)
  v_refund_est numeric := 0;       -- rounded total used for the over-refund guard
  v_cost numeric := 0;
  v_restored integer := 0;
  v_customer_id uuid;
  v_due_before numeric := 0;
  v_paid numeric := 0;
  v_item_total integer := 0;
  v_item_returned integer := 0;
  v_full_return boolean := false;
  v_items_count integer := 0;
  v_return_id uuid;
  v_return_ids jsonb := '[]'::jsonb;
begin
  -- Load + lock the sale so two cashiers can't return the same sale twice.
  select * into v_sale
  from public.sales
  where id = p_sale_id and store_id = p_store_id
  for update;

  if not found then
    raise exception 'Sale not found';
  end if;

  if v_sale.status <> 'completed' then
    raise exception 'Only completed sales can be returned';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Nothing to return';
  end if;

  -- How much this sale still owes (used to cap the balance forgiveness below).
  select coalesce(sum(amount), 0) into v_paid
  from public.payments
  where sale_id = p_sale_id and amount > 0;
  v_due_before := greatest(v_sale.total - v_paid, 0);

  select coalesce(sum(si.line_total), 0) into v_gross_total
  from public.sale_items si
  where si.sale_id = p_sale_id and si.store_id = p_store_id;

  -- Pass 1: validate quantities (cumulative within this payload) + estimate
  -- the refund so the over-refund guard can reject early.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_sale_item_id := (v_item->>'sale_item_id')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;
    v_reason := nullif(v_item->>'reason', '');

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Return quantity must be positive';
    end if;

    select * into v_sale_item
    from public.sale_items
    where id = v_sale_item_id and sale_id = p_sale_id and store_id = p_store_id;

    if not found then
      raise exception 'Sale item not found on this sale';
    end if;

    -- Already returned in previous calls + already accepted in this payload.
    select coalesce(sum(quantity), 0) into v_returned_before
    from public.returns
    where sale_id = p_sale_id and sale_item_id = v_sale_item_id;

    v_validated_qty := coalesce((v_validated->>v_sale_item_id::text)::numeric, 0);

    if v_returned_before + v_validated_qty + v_quantity > v_sale_item.quantity then
      raise exception 'Return quantity exceeds the quantity sold for this item';
    end if;

    v_validated := jsonb_set(
      v_validated,
      array[v_sale_item_id::text],
      to_jsonb(v_validated_qty + v_quantity),
      true
    );

    v_line_refund := v_sale_item.line_total * (v_quantity / v_sale_item.quantity);
    v_returned_gross := v_returned_gross + v_line_refund;
    v_gst_refund := v_gst_refund + (v_sale_item.gst_amount * (v_quantity / v_sale_item.quantity));
    v_refund_est := v_refund_est + v_line_refund;
  end loop;

  if v_sale.discount > 0 and v_gross_total > 0 then
    v_refund_est := v_refund_est - (v_sale.discount * (v_returned_gross / v_gross_total));
  end if;
  v_refund_est := round(v_refund_est, 2);
  v_gst_refund := round(v_gst_refund, 2);

  if v_refund_est > v_sale.total + 0.005 then
    raise exception 'Refund amount exceeds the sale total';
  end if;

  -- Pass 2: restore stock + insert returns rows; the sale header is decremented
  -- by the SUM OF THE ROUNDED LINES so the math reconciles exactly.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_sale_item_id := (v_item->>'sale_item_id')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;
    v_reason := nullif(v_item->>'reason', '');

    select * into v_sale_item
    from public.sale_items
    where id = v_sale_item_id and sale_id = p_sale_id and store_id = p_store_id;

    v_batch_id := v_sale_item.batch_id;
    if v_batch_id is null then
      -- Legacy rows: restore to the earliest-expiry open batch for the medicine.
      select id into v_batch_id
      from public.medicine_batches
      where medicine_id = v_sale_item.medicine_id and store_id = p_store_id
      order by expiry_date asc nulls last, created_at asc
      limit 1;
    end if;

    if v_batch_id is not null then
      update public.medicine_batches
      set quantity = quantity + v_quantity,
          updated_at = now()
      where id = v_batch_id and store_id = p_store_id;
      v_restored := v_restored + 1;
    end if;

    v_line_refund := v_sale_item.line_total * (v_quantity / v_sale_item.quantity);
    if v_sale.discount > 0 and v_gross_total > 0 then
      v_line_refund := v_line_refund - (v_sale.discount * (v_line_refund / v_gross_total));
    end if;
    v_line_refund := round(v_line_refund, 2);
    v_line_cost := v_sale_item.cost_price * v_quantity;

    v_refund := v_refund + v_line_refund;
    v_cost := v_cost + v_line_cost;

    insert into public.returns (
      store_id, sale_id, sale_item_id, medicine_id, batch_id, customer_id,
      quantity, refund_amount, reason, return_type, processed_by
    ) values (
      p_store_id, p_sale_id, v_sale_item_id, v_sale_item.medicine_id, v_batch_id,
      v_sale.customer_id, v_quantity, v_line_refund, v_reason,
      'return', p_processed_by
    )
    returning id into v_return_id;

    v_return_ids := v_return_ids || to_jsonb(v_return_id);
    v_items_count := v_items_count + 1;
  end loop;

  -- Is every line now fully returned?
  select count(*), count(*) filter (
    where (select coalesce(sum(r.quantity), 0) from public.returns r
           where r.sale_item_id = public.sale_items.id) >= public.sale_items.quantity
  ) into v_item_total, v_item_returned
  from public.sale_items
  where sale_id = p_sale_id and store_id = p_store_id;

  v_full_return := (v_item_total > 0 and v_item_returned >= v_item_total);

  -- Sale header: reduce totals by the returned share; recompute status.
  update public.sales
  set subtotal = greatest(subtotal - (v_refund - v_gst_refund), 0),
      tax_amount = greatest(tax_amount - v_gst_refund, 0),
      total = greatest(total - v_refund, 0),
      cost_of_goods = greatest(cost_of_goods - v_cost, 0),
      profit = greatest(profit - (v_refund - v_cost), 0),
      status = case when v_full_return then 'returned'::public.sale_status else status end,
      payment_status = case
        when v_full_return then 'refunded'::public.payment_status
        when v_paid >= v_sale.total - v_refund then 'paid'::public.payment_status
        when v_paid > 0 then 'partial'::public.payment_status
        else 'pending'::public.payment_status
      end,
      updated_at = now()
  where id = p_sale_id;

  -- Invoice: mirror the refund. A full return zeroes it out.
  update public.invoices
  set total = greatest(total - v_refund, 0),
      amount_paid = greatest(amount_paid - least(v_refund, amount_paid), 0),
      amount_due = greatest(amount_due - v_refund, 0),
      status = case
        when v_full_return then 'refunded'::public.payment_status
        when greatest(amount_due - v_refund, 0) = 0 then 'paid'::public.payment_status
        else status
      end,
      updated_at = now()
  where sale_id = p_sale_id and store_id = p_store_id;

  -- Refund: a negative payment row records money-out for non-credit refunds.
  -- ('credit' refunds stay on the account via the balance decrement below.)
  if p_refund_method <> 'credit' and v_refund > 0 then
    insert into public.payments (
      store_id, sale_id, customer_id, amount, method, status, reference, notes, paid_at
    ) values (
      p_store_id, p_sale_id, v_sale.customer_id, -v_refund,
      p_refund_method, 'refunded', null,
      coalesce('Refund for return', p_refund_note), now()
    );
  end if;

  -- Customer credit: a return forgives the portion of the refund that this
  -- sale still owed (never dips into older unrelated dues).
  if v_sale.customer_id is not null and v_refund > 0 and v_due_before > 0 then
    update public.customers
    set outstanding_balance = greatest(outstanding_balance - least(v_refund, v_due_before), 0),
        updated_at = now()
    where id = v_sale.customer_id;
  end if;

  return jsonb_build_object(
    'sale_id', p_sale_id,
    'returned_items', v_items_count,
    'refund_amount', v_refund,
    'stock_restored', v_restored,
    'full_return', v_full_return,
    'status', case when v_full_return then 'returned' else 'completed' end,
    'payment_status', case
      when v_full_return then 'refunded'
      when v_paid >= v_sale.total - v_refund then 'paid'
      when v_paid > 0 then 'partial'
      else 'pending'
    end,
    'return_ids', v_return_ids
  );
end $$;
