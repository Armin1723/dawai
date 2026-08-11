-- ============================================================================
-- MediFlow AI — 0010_supplier_payments.sql
-- Record a payment against a purchase order:
--   - validates the PO belongs to the store and is not cancelled
--   - rejects amounts exceeding the outstanding balance (no over-payment)
--   - inserts a payments row carrying the supplier_id (keeps supplier
--     aggregates live without a stored counter)
--   - recomputes purchase_orders.paid_amount from the payments table
-- ============================================================================

create or replace function public.record_supplier_payment(
  p_store_id uuid,
  p_po_id uuid,
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
  v_supplier_id uuid;
  v_status public.po_status;
  v_total numeric;
  v_paid numeric;
  v_due numeric;
begin
  if p_amount <= 0 then
    raise exception 'Payment amount must be positive';
  end if;

  select supplier_id, status, total, paid_amount
    into v_supplier_id, v_status, v_total, v_paid
  from public.purchase_orders
  where id = p_po_id and store_id = p_store_id
  for update;

  if not found then
    raise exception 'Purchase order not found';
  end if;

  if v_status = 'cancelled' then
    raise exception 'Cannot record a payment against a cancelled order';
  end if;

  if v_supplier_id is null then
    raise exception 'This order has no supplier';
  end if;

  v_due := v_total - v_paid;
  if p_amount > v_due then
    raise exception 'Payment exceeds the outstanding balance (due %)', v_due;
  end if;

  insert into public.payments (
    store_id, purchase_order_id, supplier_id, amount,
    method, status, reference, notes, paid_at
  ) values (
    p_store_id, p_po_id, v_supplier_id, p_amount,
    p_method, 'paid', p_reference, p_notes, now()
  );

  select coalesce(sum(amount), 0) into v_paid
  from public.payments
  where purchase_order_id = p_po_id;

  update public.purchase_orders
  set paid_amount = v_paid, updated_at = now()
  where id = p_po_id and store_id = p_store_id;

  return jsonb_build_object(
    'po_id', p_po_id,
    'paid_amount', v_paid,
    'due', v_total - v_paid
  );
end $$;
