-- ============================================================================
-- MediFlow AI — 0006_view_generic_name.sql
-- v_inventory_status did not expose generic_name, so POS search (which ORs
-- name / generic_name / sku / barcode) silently returned nothing. Recreate
-- the view including m.generic_name.
-- ============================================================================

drop view if exists public.v_inventory_status;

create view public.v_inventory_status as
select
  m.id as medicine_id,
  m.store_id,
  m.name,
  m.generic_name,
  m.sku,
  m.barcode,
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
left join public.inventory i on i.medicine_id = m.id
left join public.medicine_batches b on b.medicine_id = m.id
group by m.id, i.quantity;
