-- ============================================================================
-- MediFlow AI — 0015_fix_view_generic_name.sql
-- 0013 recreated v_inventory_status from the ORIGINAL 0001 definition and
-- accidentally dropped m.generic_name (0006 had added it). searchProducts
-- selects generic_name → PostgREST returned 400 → the route silently resolved
-- to [] → the POS grid was empty while category chips (which only select
-- category_id/name) still worked. Restore generic_name alongside the 0013
-- category columns. (The drop-first pattern is required because CREATE OR
-- REPLACE VIEW cannot insert columns mid-list.)
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
