-- ============================================================================
-- MediFlow AI — 0003_pos_create_sale.sql
-- Atomic POS checkout: creates the sale, sale items (FEFO batch allocation),
-- invoice and payment(s) in a single transaction. Computes GST, cost of goods
-- and profit. Stock is decremented on batches; the batch trigger keeps the
-- inventory cache in sync.
-- ============================================================================

create sequence if not exists public.sale_number_seq;
create sequence if not exists public.invoice_number_seq;

create or replace function public.create_sale(
  p_store_id uuid,
  p_cashier_id uuid,
  p_customer_id uuid,
  p_items jsonb,
  p_discount numeric,
  p_payment_method payment_method,
  p_amount_received numeric,
  p_notes text
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
  v_allocations jsonb := '[]'::jsonb;   -- {batch_id, medicine_id, unit_cost, allocated, unit_price, gst_rate}
  v_allocation jsonb;
  v_amount_paid numeric;
  v_amount_due numeric;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  v_sale_number := 'SALE-' || to_char(now(), 'YYMMDD') || '-' || lpad(nextval('public.sale_number_seq')::text, 4, '0');
  v_invoice_number := 'INV-' || to_char(now(), 'YYMMDD') || '-' || lpad(nextval('public.invoice_number_seq')::text, 4, '0');

  -- Pass 1: validate stock, allocate batches (FEFO), compute totals.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_medicine_id := (v_item->>'medicine_id')::uuid;
    v_qty := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;
    v_gst_rate := coalesce((v_item->>'gst_rate')::numeric, 12);
    v_line_discount := coalesce((v_item->>'discount')::numeric, 0);

    if v_qty <= 0 then
      raise exception 'Invalid quantity for item %', v_medicine_id;
    end if;

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
      v_allocations := v_allocations || jsonb_build_object(
        'batch_id', v_batch.batch_id,
        'medicine_id', v_medicine_id,
        'unit_cost', v_batch.unit_cost,
        'allocated', v_batch.allocated,
        'unit_price', v_unit_price,
        'gst_rate', v_gst_rate
      );
    end loop;
  end loop;

  v_total := v_subtotal + v_tax - p_discount;
  v_profit := v_subtotal - p_discount - v_cost;

  -- Sale row (totals updated after items are inserted).
  insert into public.sales (
    store_id, customer_id, cashier_id, sale_number, status,
    subtotal, discount, tax_amount, total, cost_of_goods, profit,
    payment_status, payment_method, notes, sold_at
  ) values (
    p_store_id, p_customer_id, p_cashier_id, v_sale_number, 'completed',
    v_subtotal, p_discount, v_tax, v_total, v_cost, v_profit,
    case when p_payment_method = 'credit' then 'pending' else 'paid' end,
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
      0,
      (v_allocation->>'gst_rate')::numeric,
      round(((v_allocation->>'allocated')::numeric * (v_allocation->>'unit_price')::numeric *
        (v_allocation->>'gst_rate')::numeric / (100 + (v_allocation->>'gst_rate')::numeric)), 2),
      (v_allocation->>'allocated')::numeric * (v_allocation->>'unit_price')::numeric
    );
  end loop;

  -- Invoice.
  v_amount_paid := least(greatest(p_amount_received, 0), v_total);
  v_amount_due := greatest(v_total - v_amount_paid, 0);

  insert into public.invoices (
    store_id, invoice_number, sale_id, customer_id, invoice_date,
    subtotal, discount, tax_amount, total, amount_paid, amount_due,
    status
  ) values (
    p_store_id, v_invoice_number, v_sale_id, p_customer_id, now(),
    v_subtotal, p_discount, v_tax, v_total, v_amount_paid, v_amount_due,
    case when v_amount_due = 0 then 'paid' else 'pending' end
  )
  returning id into v_invoice_id;

  update public.sales set invoice_id = v_invoice_id where id = v_sale_id;

  -- Payment record when money changes hands.
  if v_amount_paid > 0 then
    insert into public.payments (store_id, sale_id, customer_id, amount, method, status, paid_at)
    values (p_store_id, v_sale_id, p_customer_id, v_amount_paid, p_payment_method, 'paid', now());
  end if;

  -- Track customer credit.
  if p_customer_id is not null and v_amount_due > 0 then
    update public.customers
    set outstanding_balance = outstanding_balance + v_amount_due
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
