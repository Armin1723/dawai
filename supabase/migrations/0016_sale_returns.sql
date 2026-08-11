-- ============================================================================
-- MediFlow AI — 0016_sale_returns.sql
-- Sales returns & refunds (finishes Phase 6):
--   1. create_sale_return — atomic partial/full return of a completed sale:
--      - validates the sale belongs to the store and is 'completed'
--      - rejects quantities that exceed what is still returnable per line
--      - restores stock to the allocated batch (FEFO-earliest fallback when a
--        legacy line has no batch_id); the batch trigger syncs the inventory
--        cache automatically
--      - inserts one `returns` row per returned line (return_type 'return')
--      - reduces the sale header totals by the returned share (so reports
--        stay accurate), recomputes payment_status from *positive* payments,
--        and marks a fully-returned sale 'returned' / 'refunded'
--      - mirrors the refund on the invoice (total / amount_paid / amount_due;
--        full return → status 'refunded')
--      - records a negative payment row for non-credit refunds (money-out)
--      - decrements the customer's outstanding_balance by the refund, capped
--        at what THIS sale still owed (never touches older unrelated dues)
--   2. record_customer_payment is recreated to sum only *positive* payments
--      so a previously issued refund can never inflate an invoice's due.
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
  v_batch_id uuid;
  v_line_refund numeric;
  v_line_cost numeric;
  v_gross_total numeric := 0;      -- Σ(line_total) across sale items (pre-sale-discount gross)
  v_returned_gross numeric := 0;   -- gross share of the returned lines
  v_gst_refund numeric := 0;       -- GST portion of the refund
  v_refund numeric := 0;
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

  -- Pass 1: validate quantities + compute the refund (share of line gross,
  -- with the sale-level discount allocated proportionally).
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

    select coalesce(sum(quantity), 0) into v_returned_before
    from public.returns
    where sale_id = p_sale_id and sale_item_id = v_sale_item_id;

    if v_returned_before + v_quantity > v_sale_item.quantity then
      raise exception 'Return quantity exceeds the quantity sold for this item';
    end if;

    v_line_refund := v_sale_item.line_total * (v_quantity / v_sale_item.quantity);
    v_returned_gross := v_returned_gross + v_line_refund;
    v_gst_refund := v_gst_refund + (v_sale_item.gst_amount * (v_quantity / v_sale_item.quantity));
    v_refund := v_refund + v_line_refund;
    v_cost := v_cost + (v_sale_item.cost_price * v_quantity);
  end loop;

  if v_sale.discount > 0 and v_gross_total > 0 then
    v_refund := v_refund - (v_sale.discount * (v_returned_gross / v_gross_total));
  end if;
  v_refund := round(v_refund, 2);
  v_gst_refund := round(v_gst_refund, 2);

  if v_refund > v_sale.total + 0.005 then
    raise exception 'Refund amount exceeds the sale total';
  end if;

  -- Pass 2: restore stock + insert returns rows.
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

    insert into public.returns (
      store_id, sale_id, sale_item_id, medicine_id, batch_id, customer_id,
      quantity, refund_amount, reason, return_type, processed_by
    ) values (
      p_store_id, p_sale_id, v_sale_item_id, v_sale_item.medicine_id, v_batch_id,
      v_sale.customer_id, v_quantity, round(v_line_refund, 2), v_reason,
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

-- ----------------------------------------------------------------------------
-- Harden record_customer_payment: only *positive* payments count towards an
-- invoice's paid total, so a refund (negative row) can never inflate the due
-- and overcharge a customer settling their balance.
-- ----------------------------------------------------------------------------
create or replace function public.record_customer_payment(
  p_store_id uuid,
  p_customer_id uuid,
  p_amount numeric,
  p_method public.payment_method default 'cash',
  p_reference text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outstanding numeric;
  v_remaining numeric := p_amount;
  v_sale_id uuid;
  v_sale_total numeric;
  v_sale_paid numeric;
  v_sale_due numeric;
  v_applied numeric;
  v_breakdown jsonb := '[]'::jsonb;
  v_cursor cursor for
    select s.id, s.total
    from public.sales s
    where s.store_id = p_store_id
      and s.customer_id = p_customer_id
      and s.status = 'completed'
      and s.payment_status in ('pending', 'partial', 'overdue')
    order by s.sold_at asc, s.id asc;
begin
  if p_amount <= 0 then
    raise exception 'Payment amount must be positive';
  end if;

  select outstanding_balance into v_outstanding
  from public.customers
  where id = p_customer_id and store_id = p_store_id
  for update;

  if not found then
    raise exception 'Customer not found';
  end if;

  if v_outstanding <= 0 then
    raise exception 'This customer has no outstanding balance';
  end if;

  if p_amount > v_outstanding then
    raise exception 'Payment exceeds the outstanding balance (due %)', v_outstanding;
  end if;

  -- Settle oldest open invoices first (FIFO). Refund rows (amount <= 0) are
  -- excluded so a returned line can never inflate the amount still due.
  open v_cursor;
  loop
    fetch next from v_cursor into v_sale_id, v_sale_total;
    exit when not found or v_remaining <= 0;

    select coalesce(sum(amount) filter (where amount > 0), 0) into v_sale_paid
    from public.payments
    where sale_id = v_sale_id;

    v_sale_due := v_sale_total - v_sale_paid;
    if v_sale_due <= 0 then
      continue;
    end if;

    v_applied := least(v_remaining, v_sale_due);

    insert into public.payments (
      store_id, sale_id, customer_id, amount,
      method, status, reference, notes, paid_at
    ) values (
      p_store_id, v_sale_id, p_customer_id, v_applied,
      p_method, 'paid', p_reference, p_notes, now()
    );

    select coalesce(sum(amount) filter (where amount > 0), 0) into v_sale_paid
    from public.payments
    where sale_id = v_sale_id;

    update public.sales
    set payment_status = case
          when v_sale_paid >= v_sale_total then 'paid'::public.payment_status
          else 'partial'::public.payment_status
        end,
        updated_at = now()
    where id = v_sale_id;

    v_remaining := v_remaining - v_applied;

    v_breakdown := v_breakdown || jsonb_build_object(
      'sale_id', v_sale_id,
      'applied', v_applied,
      'status', case when v_sale_paid >= v_sale_total then 'paid' else 'partial' end
    );
  end loop;
  close v_cursor;

  -- Safety net: any remainder not matched to an invoice (balance drift)
  -- is recorded as a customer-level payment so no money is lost.
  if v_remaining > 0 then
    insert into public.payments (
      store_id, customer_id, amount,
      method, status, reference, notes, paid_at
    ) values (
      p_store_id, p_customer_id, v_remaining,
      p_method, 'paid', p_reference, p_notes, now()
    );
    v_breakdown := v_breakdown || jsonb_build_object(
      'customer_balance', true,
      'applied', v_remaining
    );
  end if;

  -- Decrement the stored balance by the full amount.
  update public.customers
  set outstanding_balance = outstanding_balance - p_amount,
      updated_at = now()
  where id = p_customer_id;

  return jsonb_build_object(
    'customer_id', p_customer_id,
    'applied', p_amount,
    'outstanding_balance', v_outstanding - p_amount,
    'invoices_settled', v_breakdown
  );
end $$;
