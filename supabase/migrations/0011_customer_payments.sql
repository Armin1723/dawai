-- ============================================================================
-- MediFlow AI — 0011_customer_payments.sql
-- Record a payment against a customer's outstanding balance:
--   - validates the customer belongs to the store
--   - rejects amounts exceeding the outstanding balance
--   - settles the customer's oldest open invoices first (FIFO), writing one
--     payments row per invoice and updating each sale's payment_status
--     (paid / partial) so the dashboard's pending-payments KPI stays live
--   - decrements customers.outstanding_balance (mirrors the += in create_sale)
-- ============================================================================

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

  -- Settle oldest open invoices first (FIFO).
  open v_cursor;
  loop
    fetch next from v_cursor into v_sale_id, v_sale_total;
    exit when not found or v_remaining <= 0;

    select coalesce(sum(amount), 0) into v_sale_paid
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

    select coalesce(sum(amount), 0) into v_sale_paid
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
