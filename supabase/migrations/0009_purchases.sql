-- ============================================================================
-- MediFlow AI — 0009_purchases.sql
-- Purchase order lifecycle as atomic RPCs:
--   1. create_purchase_order — builds PO + items with GST math (mirrors the
--      tax-inclusive model used by create_sale) in one transaction.
--   2. receive_purchase_order — receives quantities, upserts medicine batches
--      (the existing batch trigger keeps the inventory cache in sync), and
--      flips the PO to 'partial' / 'received'.
-- ============================================================================

create sequence if not exists public.po_number_seq;

-- ----------------------------------------------------------------------------
-- 1. Create a purchase order.
-- ----------------------------------------------------------------------------
create or replace function public.create_purchase_order(
  p_store_id uuid,
  p_supplier_id uuid,
  p_created_by uuid,
  p_items jsonb,
  p_discount numeric default 0,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_po_id uuid;
  v_po_number text;
  v_item jsonb;
  v_medicine_id uuid;
  v_qty numeric;
  v_cost_price numeric;
  v_selling_price numeric;
  v_mrp numeric;
  v_gst_rate numeric;
  v_line_total numeric;
  v_line_gst numeric;
  v_subtotal numeric := 0;
  v_tax numeric := 0;
  v_total numeric := 0;
  v_items jsonb := '[]'::jsonb;
begin
  if p_supplier_id is null then
    raise exception 'Supplier is required';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Purchase order must have at least one item';
  end if;

  v_po_number := 'PO-' || to_char(now(), 'YYMMDD') || '-' || lpad(nextval('public.po_number_seq')::text, 4, '0');

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_medicine_id := (v_item->>'medicine_id')::uuid;
    v_qty := (v_item->>'quantity')::numeric;
    v_cost_price := (v_item->>'cost_price')::numeric;
    v_selling_price := coalesce((v_item->>'selling_price')::numeric, 0);
    v_mrp := coalesce((v_item->>'mrp')::numeric, v_cost_price);
    v_gst_rate := coalesce((v_item->>'gst_rate')::numeric, 12);

    if v_qty <= 0 then
      raise exception 'Invalid quantity for item %', v_medicine_id;
    end if;

    -- Tax-inclusive cost (consistent with the sales model): GST is backed out.
    v_line_total := v_qty * v_cost_price;
    v_line_gst := round((v_line_total * v_gst_rate / (100 + v_gst_rate)), 2);
    v_subtotal := v_subtotal + v_line_total - v_line_gst;
    v_tax := v_tax + v_line_gst;

    v_items := v_items || jsonb_build_object(
      'medicine_id', v_medicine_id,
      'quantity', v_qty,
      'cost_price', v_cost_price,
      'selling_price', v_selling_price,
      'mrp', v_mrp,
      'gst_rate', v_gst_rate,
      'gst_amount', v_line_gst,
      'line_total', v_line_total
    );
  end loop;

  v_total := v_subtotal + v_tax - p_discount;

  insert into public.purchase_orders (
    store_id, supplier_id, po_number, status, order_date,
    subtotal, discount, tax_amount, total, paid_amount, notes, created_by
  ) values (
    p_store_id, p_supplier_id, v_po_number, 'ordered', current_date,
    v_subtotal, p_discount, v_tax, v_total, 0, p_notes, p_created_by
  )
  returning id into v_po_id;

  for v_item in select * from jsonb_array_elements(v_items)
  loop
    insert into public.purchase_items (
      store_id, purchase_order_id, medicine_id, quantity,
      cost_price, selling_price, mrp, gst_rate, gst_amount, line_total
    ) values (
      p_store_id, v_po_id,
      (v_item->>'medicine_id')::uuid,
      (v_item->>'quantity')::numeric,
      (v_item->>'cost_price')::numeric,
      (v_item->>'selling_price')::numeric,
      (v_item->>'mrp')::numeric,
      (v_item->>'gst_rate')::numeric,
      (v_item->>'gst_amount')::numeric,
      (v_item->>'line_total')::numeric
    );
  end loop;

  return jsonb_build_object(
    'po_id', v_po_id,
    'po_number', v_po_number,
    'total', v_total,
    'items', jsonb_array_length(v_items)
  );
end $$;

-- ----------------------------------------------------------------------------
-- 2. Receive a purchase order (partial or full).
-- ----------------------------------------------------------------------------
create or replace function public.receive_purchase_order(
  p_store_id uuid,
  p_po_id uuid,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_po_item_id uuid;
  v_medicine_id uuid;
  v_received numeric;
  v_batch_number text;
  v_expiry_date date;
  v_cost_price numeric;
  v_selling_price numeric;
  v_mrp numeric;
  v_gst_rate numeric;
  v_total_items integer := 0;
  v_fully_received integer := 0;
  v_status text;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Nothing to receive';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_po_item_id := (v_item->>'purchase_item_id')::uuid;
    v_medicine_id := (v_item->>'medicine_id')::uuid;
    v_received := (v_item->>'received_quantity')::numeric;
    v_batch_number := v_item->>'batch_number';
    v_expiry_date := (v_item->>'expiry_date')::date;
    v_cost_price := (v_item->>'cost_price')::numeric;
    v_selling_price := coalesce((v_item->>'selling_price')::numeric, 0);
    v_mrp := coalesce((v_item->>'mrp')::numeric, v_cost_price);
    v_gst_rate := coalesce((v_item->>'gst_rate')::numeric, 12);

    if v_received <= 0 then
      continue;
    end if;
    if v_batch_number is null or v_batch_number = '' then
      raise exception 'Batch number is required to receive stock';
    end if;
    if v_expiry_date is null then
      raise exception 'Expiry date is required to receive stock';
    end if;

    -- Ensure the PO item belongs to this store and PO before touching it.
    update public.purchase_items
    set received_quantity = received_quantity + v_received
    where id = v_po_item_id
      and purchase_order_id = p_po_id
      and store_id = p_store_id;

    if not found then
      raise exception 'Purchase item % not found on this order', v_po_item_id;
    end if;

    -- Upsert the batch; the medicine_batches trigger syncs the inventory cache.
    insert into public.medicine_batches (
      store_id, medicine_id, batch_number, expiry_date,
      purchase_price, selling_price, mrp, quantity, received_date
    ) values (
      p_store_id, v_medicine_id, v_batch_number, v_expiry_date,
      v_cost_price, v_selling_price, v_mrp, v_received, current_date
    )
    on conflict (store_id, medicine_id, batch_number) do update
      set quantity = public.medicine_batches.quantity + excluded.quantity,
          purchase_price = excluded.purchase_price,
          selling_price = excluded.selling_price,
          mrp = excluded.mrp,
          expiry_date = excluded.expiry_date,
          updated_at = now();
  end loop;

  -- Status: received only when every line is fully received.
  select count(*), count(*) filter (where received_quantity >= quantity)
    into v_total_items, v_fully_received
  from public.purchase_items
  where purchase_order_id = p_po_id and store_id = p_store_id;

  v_status := case when v_fully_received >= v_total_items then 'received' else 'partial' end;

  update public.purchase_orders
  set status = v_status::public.po_status,
      received_date = current_date,
      updated_at = now()
  where id = p_po_id and store_id = p_store_id;

  return jsonb_build_object(
    'po_id', p_po_id,
    'status', v_status,
    'batches_updated', jsonb_array_length(p_items)
  );
end $$;
