-- ============================================================================
-- MediFlow AI — 0013_pos_split_payments_categories.sql
-- 1. Extend v_inventory_status with category_id / category_name so the POS can
--    render category filter chips (and the inventory module can group by it).
-- 2. Recreate create_sale with:
--    a. Split payments: a new p_payments jsonb array [{method, amount}, ...]
--       supersedes the single-tender fields. One payments row is written per
--       entry, and the total tendered decides paid / partial.
--    b. Tender-derived payment_status on sales: previously every non-credit
--       sale was stamped 'paid' even when the cashier collected less than the
--       total (invoice said pending but sales said paid — inconsistent).
--       Now: credit → 'pending'; fully tendered → 'paid'; short tender → 'partial'.
--    c. Rejects split tenders that exceed the sale total.
-- Backward compatible: existing callers (single payment_method + amount_received)
-- behave exactly as before.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Inventory view with category data. (Drop first: CREATE OR REPLACE VIEW
--    cannot insert columns in the middle of the column list.)
-- ----------------------------------------------------------------------------
drop view if exists public.v_inventory_status;
create view public.v_inventory_status as
select
  m.id as medicine_id,
  m.store_id,
  m.name,
  m.sku,
  m.barcode,
  m.category_id,
  c.name as category_name,
  m.mrp,
  m.selling_price,
  m.purchase_price,
  m.gst_rate,
  m.min_stock,
  m.location,
  m.is_active,
  coalesce(i.quantity, 0) as current_stock,
  coalesce(i.quantity, 0) * m.selling_price as stock_value,
  case
    when coalesce(i.quantity, 0) <= 0 then 'out of stock'::text
    when coalesce(i.quantity, 0) <= m.min_stock then 'low'::text
    else 'in stock'::text
  end as stock_status,
  min(b.expiry_date) as earliest_expiry,
  case
    when min(b.expiry_date) < current_date then 'expired'::text
    when min(b.expiry_date) <= current_date + interval '30 days' then 'near expiry'::text
    else 'ok'::text
  end as expiry_status
from public.medicines m
left join public.categories c on c.id = m.category_id
left join public.inventory i on i.medicine_id = m.id
left join public.medicine_batches b on b.medicine_id = m.id
group by m.id, i.quantity, c.name;

-- ----------------------------------------------------------------------------
-- 2. create_sale with split payments + tender-derived payment status.
-- ----------------------------------------------------------------------------
create or replace function public.create_sale(
  p_store_id uuid,
  p_cashier_id uuid,
  p_customer_id uuid,
  p_items jsonb,
  p_discount numeric,
  p_payment_method payment_method,
  p_amount_received numeric,
  p_notes text,
  p_payments jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_sale_number text;
  v_invoice_id uuid;
  v_invoice_number text;
  v_subtotal numeric := 0;          -- net of GST (tax-exclusive base)
  v_tax numeric := 0;
  v_cost numeric := 0;
  v_total numeric := 0;
  v_profit numeric := 0;
  v_item jsonb;
  v_batch record;
  v_medicine_id uuid;
  v_qty numeric;
  v_unit_price numeric;
  v_gst_rate numeric;
  v_line_discount numeric;
  v_line_net numeric;
  v_line_gst numeric;
  v_stock numeric;
  v_allocated_this_line numeric := 0;
  v_discount_share numeric;
  v_allocations jsonb := '[]'::jsonb;   -- {batch_id, medicine_id, unit_cost, allocated, unit_price, gst_rate, discount}
  v_allocation jsonb;
  v_amount_paid numeric;
  v_amount_due numeric;
  v_pay jsonb;
  v_split_sum numeric := 0;
  v_credit_limit numeric := 0;
  v_outstanding numeric := 0;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  v_sale_number := 'SALE-' || to_char(now(), 'YYMMDD') || '-' || lpad(nextval('public.sale_number_seq')::text, 4, '0');
  v_invoice_number := 'INV-' || to_char(now(), 'YYMMDD') || '-' || lpad(nextval('public.invoice_number_seq')::text, 4, '0');

  -- Pass 1: validate stock (locking batches to serialize concurrent sales),
  -- allocate batches (FEFO), compute totals.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_medicine_id := (v_item->>'medicine_id')::uuid;
    v_qty := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;
    v_gst_rate := coalesce((v_item->>'gst_rate')::numeric, 12);
    v_line_discount := coalesce((v_item->>'discount')::numeric, 0);
    v_allocated_this_line := 0;

    if v_qty <= 0 then
      raise exception 'Invalid quantity for item %', v_medicine_id;
    end if;
    if v_line_discount > (v_unit_price * v_qty) then
      raise exception 'Line discount exceeds line total';
    end if;

    -- Lock this medicine's batch rows so two concurrent checkouts can't both
    -- pass the stock check and oversell into negative stock.
    perform 1
    from public.medicine_batches
    where medicine_id = v_medicine_id and store_id = p_store_id
    for update;

    select coalesce(sum(quantity), 0) into v_stock
    from public.medicine_batches
    where medicine_id = v_medicine_id and store_id = p_store_id;

    if v_stock < v_qty then
      raise exception 'Insufficient stock for medicine % (have %, need %)', v_medicine_id, v_stock, v_qty;
    end if;

    v_line_net := (v_unit_price * v_qty) - v_line_discount;
    v_line_gst := round((v_line_net * v_gst_rate / (100 + v_gst_rate)), 2);
    v_subtotal := v_subtotal + v_line_net - v_line_gst;
    v_tax := v_tax + v_line_gst;

    for v_batch in select * from public.select_sale_batches(v_medicine_id, v_qty, false)
    loop
      v_allocated_this_line := v_allocated_this_line + v_batch.allocated;
      v_discount_share := round(v_line_discount * v_batch.allocated / v_qty, 2);
      v_cost := v_cost + (v_batch.allocated * v_batch.unit_cost);
      v_allocations := v_allocations || jsonb_build_object(
        'batch_id', v_batch.batch_id,
        'medicine_id', v_medicine_id,
        'unit_cost', v_batch.unit_cost,
        'allocated', v_batch.allocated,
        'unit_price', v_unit_price,
        'gst_rate', v_gst_rate,
        'discount', v_discount_share
      );
    end loop;

    -- If the allocation came up short (e.g. all stock expired, or another
    -- cashier's committed sale took the last sellable units), abort the sale.
    if v_allocated_this_line < v_qty then
      raise exception 'Insufficient sellable stock for medicine % (have %, need %)', v_medicine_id, v_allocated_this_line, v_qty;
    end if;
  end loop;

  v_total := greatest(v_subtotal + v_tax - p_discount, 0);
  v_profit := v_subtotal - p_discount - v_cost;

  -- --------------------------------------------------------------------------
  -- Tender: split payments (p_payments) take precedence over the legacy
  -- single payment_method + amount_received fields.
  -- --------------------------------------------------------------------------
  if p_payments is not null and jsonb_array_length(p_payments) > 0 then
    for v_pay in select * from jsonb_array_elements(p_payments)
    loop
      if (v_pay->>'amount')::numeric <= 0 then
        raise exception 'Invalid payment amount';
      end if;
      v_split_sum := v_split_sum + (v_pay->>'amount')::numeric;
    end loop;
    if v_split_sum > v_total then
      raise exception 'Payments exceed the sale total';
    end if;
    v_amount_paid := v_split_sum;
  else
    -- Non-credit methods with no tender entered default to full payment.
    if p_payment_method <> 'credit' and p_amount_received <= 0 then
      v_amount_paid := v_total;
    else
      v_amount_paid := least(greatest(p_amount_received, 0), v_total);
    end if;
  end if;
  v_amount_due := greatest(v_total - v_amount_paid, 0);

  -- Sale row. payment_status now reflects what was actually tendered:
  -- credit → pending (full balance owed) · fully paid → paid · short → partial.
  insert into public.sales (
    store_id, customer_id, cashier_id, sale_number, status,
    subtotal, discount, tax_amount, total, cost_of_goods, profit,
    payment_status, payment_method, notes, sold_at
  ) values (
    p_store_id, p_customer_id, p_cashier_id, v_sale_number, 'completed',
    v_subtotal, p_discount, v_tax, v_total, v_cost, v_profit,
    case
      when p_payment_method = 'credit' then 'pending'::payment_status
      when v_amount_due = 0 then 'paid'::payment_status
      else 'partial'::payment_status
    end,
    p_payment_method, p_notes, now()
  )
  returning id into v_sale_id;

  -- Pass 2: decrement batches and insert sale items per allocated chunk.
  for v_allocation in select * from jsonb_array_elements(v_allocations)
  loop
    update public.medicine_batches
    set quantity = quantity - (v_allocation->>'allocated')::numeric
    where id = (v_allocation->>'batch_id')::uuid;

    insert into public.sale_items (
      store_id, sale_id, medicine_id, batch_id, quantity, unit_price, cost_price,
      discount, gst_rate, gst_amount, line_total
    ) values (
      p_store_id, v_sale_id,
      (v_allocation->>'medicine_id')::uuid,
      (v_allocation->>'batch_id')::uuid,
      (v_allocation->>'allocated')::numeric,
      (v_allocation->>'unit_price')::numeric,
      (v_allocation->>'unit_cost')::numeric,
      (v_allocation->>'discount')::numeric,
      (v_allocation->>'gst_rate')::numeric,
      round((((v_allocation->>'allocated')::numeric * (v_allocation->>'unit_price')::numeric)
        - (v_allocation->>'discount')::numeric) *
        (v_allocation->>'gst_rate')::numeric / (100 + (v_allocation->>'gst_rate')::numeric), 2),
      ((v_allocation->>'allocated')::numeric * (v_allocation->>'unit_price')::numeric)
        - (v_allocation->>'discount')::numeric
    );
  end loop;

  -- Invoice.
  insert into public.invoices (
    store_id, invoice_number, sale_id, customer_id, invoice_date,
    subtotal, discount, tax_amount, total, amount_paid, amount_due,
    status
  ) values (
    p_store_id, v_invoice_number, v_sale_id, p_customer_id, now(),
    v_subtotal, p_discount, v_tax, v_total, v_amount_paid, v_amount_due,
    case when v_amount_due = 0 then 'paid'::payment_status else 'pending'::payment_status end
  )
  returning id into v_invoice_id;

  update public.sales set invoice_id = v_invoice_id where id = v_sale_id;

  -- Payment rows: one per split entry, or a single row for the legacy path.
  if v_amount_paid > 0 then
    if p_payments is not null and jsonb_array_length(p_payments) > 0 then
      for v_pay in select * from jsonb_array_elements(p_payments)
      loop
        insert into public.payments (store_id, sale_id, customer_id, amount, method, status, paid_at)
        values (
          p_store_id, v_sale_id, p_customer_id,
          (v_pay->>'amount')::numeric,
          (v_pay->>'method')::public.payment_method,
          'paid'::payment_status, now()
        );
      end loop;
    else
      insert into public.payments (store_id, sale_id, customer_id, amount, method, status, paid_at)
      values (p_store_id, v_sale_id, p_customer_id, v_amount_paid, p_payment_method, 'paid'::payment_status, now());
    end if;
  end if;

  -- Track customer credit, enforcing the credit limit (0 = unlimited).
  if p_customer_id is not null and v_amount_due > 0 then
    select credit_limit, outstanding_balance into v_credit_limit, v_outstanding
    from public.customers where id = p_customer_id;
    if v_credit_limit > 0 and (v_outstanding + v_amount_due) > v_credit_limit then
      raise exception 'Credit limit exceeded for customer %', p_customer_id;
    end if;
    update public.customers
    set outstanding_balance = v_outstanding + v_amount_due
    where id = p_customer_id;
  end if;

  return jsonb_build_object(
    'sale_id', v_sale_id,
    'sale_number', v_sale_number,
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'total', v_total,
    'items', jsonb_array_length(p_items)
  );
end $$;
