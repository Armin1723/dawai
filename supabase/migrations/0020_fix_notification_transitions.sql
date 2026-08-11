-- ============================================================================
-- 0020 — Notifications follow-up fixes (from code review)
--
--   1. A batch that crosses from near_expiry -> expired used to leave a stale
--      unread near_expiry alert alongside the new expired one (dedup key is
--      type+link). Now inserting an `expired` alert also resolves the sibling
--      `near_expiry` row for the same batch link.
--   2. Create the realtime publication if it doesn't exist, so a missing
--      publication fails loudly instead of silently disabling realtime.
-- ============================================================================

create or replace function public.generate_notifications(p_store_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
  v_rec record;
  v_type text;
  v_link text;
  v_title text;
  v_body text;
  v_severity text;
begin
  if p_store_id is null then
    return 0;
  end if;

  -- ---- 1. Low stock / out of stock (active items) -------------------------
  for v_rec in
    select medicine_id, name, sku, current_stock, min_stock, stock_status
    from public.v_inventory_status
    where store_id = p_store_id
      and is_active = true
      and stock_status in ('low', 'out of stock')
  loop
    v_type := 'low_stock';
    v_link := '/inventory?medicine=' || v_rec.medicine_id;
    v_severity := case when v_rec.stock_status = 'out of stock' then 'danger' else 'warning' end;
    v_title := v_rec.name || case
      when v_rec.stock_status = 'out of stock' then ' — out of stock'
      else ' — running low'
    end;
    v_body := format(
      'SKU %s · %s left (min %s)',
      coalesce(v_rec.sku, '—'), v_rec.current_stock, coalesce(v_rec.min_stock, 0)
    );

    if not exists (
      select 1 from public.notifications
      where store_id = p_store_id and type = v_type and link = v_link and is_read = false
    ) then
      insert into public.notifications (store_id, type, title, body, severity, link)
      values (p_store_id, v_type, v_title, v_body, v_severity, v_link);
      v_inserted := v_inserted + 1;
    end if;
  end loop;

  -- Auto-resolve low-stock alerts once stock is healthy again.
  update public.notifications n
  set is_read = true, updated_at = now()
  where n.store_id = p_store_id and n.type = 'low_stock' and n.is_read = false
    and not exists (
      select 1 from public.v_inventory_status v
      where v.store_id = p_store_id
        and v.is_active = true
        and v.stock_status in ('low', 'out of stock')
        and '/inventory?medicine=' || v.medicine_id = n.link
    );

  -- ---- 2. Near-expiry + expired batches ------------------------------------
  for v_rec in
    select
      b.id as batch_id,
      m.name as medicine_name,
      b.batch_number,
      b.expiry_date,
      b.quantity,
      case when b.expiry_date < current_date then 'expired' else 'near_expiry' end as kind
    from public.medicine_batches b
    join public.medicines m on m.id = b.medicine_id and m.store_id = p_store_id
    where b.store_id = p_store_id
      and b.quantity > 0
      and b.expiry_date <= (current_date + interval '90 days')::date
  loop
    v_type := v_rec.kind;
    v_link := '/inventory?batch=' || v_rec.batch_id;
    v_severity := case when v_rec.kind = 'expired' then 'danger' else 'warning' end;
    v_title := case when v_rec.kind = 'expired' then 'Expired' else 'Expiring soon' end
      || ': ' || v_rec.medicine_name;
    v_body := format(
      'Batch %s · %s units · expires %s',
      v_rec.batch_number, v_rec.quantity, to_char(v_rec.expiry_date, 'DD Mon YYYY')
    );

    if not exists (
      select 1 from public.notifications
      where store_id = p_store_id and type = v_type and link = v_link and is_read = false
    ) then
      insert into public.notifications (store_id, type, title, body, severity, link)
      values (p_store_id, v_type, v_title, v_body, v_severity, v_link);
      v_inserted := v_inserted + 1;

      -- Transition: a batch that just went expired also retires its sibling
      -- near_expiry alert for the same batch link.
      if v_type = 'expired' then
        update public.notifications
        set is_read = true, updated_at = now()
        where store_id = p_store_id and type = 'near_expiry' and link = v_link and is_read = false;
      end if;
    end if;
  end loop;

  -- Auto-resolve expiry alerts once a batch is gone (qty 0 or deleted).
  update public.notifications n
  set is_read = true, updated_at = now()
  where n.store_id = p_store_id
    and n.type in ('near_expiry', 'expired')
    and n.is_read = false
    and not exists (
      select 1 from public.medicine_batches b
      where b.store_id = p_store_id and b.quantity > 0
        and b.expiry_date <= (current_date + interval '90 days')::date
        and '/inventory?batch=' || b.id = n.link
    );

  -- ---- 3. Supplier dues -----------------------------------------------------
  for v_rec in
    select
      po.id as po_id,
      po.po_number,
      po.total - po.paid_amount as due,
      coalesce(s.name, 'Supplier') as supplier_name
    from public.purchase_orders po
    left join public.suppliers s on s.id = po.supplier_id
    where po.store_id = p_store_id
      and po.status <> 'cancelled'
      and (po.total - po.paid_amount) > 0
  loop
    v_type := 'supplier_due';
    v_link := '/purchases?po=' || v_rec.po_id;
    v_severity := 'warning';
    v_title := 'Supplier payment due';
    v_body := format(
      '%s · %s · %s outstanding',
      v_rec.supplier_name, v_rec.po_number, round(v_rec.due, 2)
    );

    if not exists (
      select 1 from public.notifications
      where store_id = p_store_id and type = v_type and link = v_link and is_read = false
    ) then
      insert into public.notifications (store_id, type, title, body, severity, link)
      values (p_store_id, v_type, v_title, v_body, v_severity, v_link);
      v_inserted := v_inserted + 1;
    end if;
  end loop;

  -- Auto-resolve once fully paid or cancelled.
  update public.notifications n
  set is_read = true, updated_at = now()
  where n.store_id = p_store_id and n.type = 'supplier_due' and n.is_read = false
    and not exists (
      select 1 from public.purchase_orders po
      where po.store_id = p_store_id
        and po.status <> 'cancelled'
        and (po.total - po.paid_amount) > 0
        and '/purchases?po=' || po.id = n.link
    );

  -- ---- 4. Pending customer payments -----------------------------------------
  for v_rec in
    select
      i.id as invoice_id,
      i.invoice_number,
      i.total,
      i.amount_due,
      coalesce(c.name, 'Walk-in') as customer_name
    from public.invoices i
    left join public.customers c on c.id = i.customer_id
    where i.store_id = p_store_id
      and i.status in ('pending', 'partial')
  loop
    v_type := 'payment_due';
    v_link := '/sales?invoice=' || v_rec.invoice_id;
    v_severity := 'warning';
    v_title := 'Customer payment pending';
    v_body := format(
      '%s · %s · %s due',
      v_rec.customer_name, v_rec.invoice_number, round(coalesce(v_rec.amount_due, v_rec.total), 2)
    );

    if not exists (
      select 1 from public.notifications
      where store_id = p_store_id and type = v_type and link = v_link and is_read = false
    ) then
      insert into public.notifications (store_id, type, title, body, severity, link)
      values (p_store_id, v_type, v_title, v_body, v_severity, v_link);
      v_inserted := v_inserted + 1;
    end if;
  end loop;

  -- Auto-resolve once the invoice is settled.
  update public.notifications n
  set is_read = true, updated_at = now()
  where n.store_id = p_store_id and n.type = 'payment_due' and n.is_read = false
    and not exists (
      select 1 from public.invoices i
      where i.store_id = p_store_id and i.status in ('pending', 'partial')
        and '/sales?invoice=' || i.id = n.link
    );

  return v_inserted;
end $$;

-- Realtime: ensure the publication exists, then add the table.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;
