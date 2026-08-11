type Client = Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>;

export { getCurrentStoreId } from "@/repositories/store.repository";

export interface PurchaseOrderRow {
  id: string;
  po_number: string;
  supplier_id: string | null;
  supplier_name: string | null;
  status: string;
  order_date: string;
  received_date: string | null;
  subtotal: number;
  discount: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  due: number;
  item_count: number | null;
}

interface PoBase {
  id: string;
  po_number: string;
  supplier_id: string | null;
  status: string;
  order_date: string;
  received_date: string | null;
  subtotal: number;
  discount: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
}

/** List purchase orders for the store with supplier names + item counts. */
export async function listPurchaseOrders(
  supabase: Client,
  storeId: string
): Promise<PurchaseOrderRow[]> {
  const { data: orders } = await supabase
    .from("purchase_orders")
    .select("id, po_number, supplier_id, status, order_date, received_date, subtotal, discount, tax_amount, total, paid_amount")
    .eq("store_id", storeId)
    .order("order_date", { ascending: false });

  const rows = (orders ?? []) as unknown as PoBase[];

  const supplierIds = [...new Set(rows.map((r) => r.supplier_id).filter(Boolean))] as string[];
  const names = new Map<string, string>();
  if (supplierIds.length > 0) {
    const { data: suppliers } = await supabase.from("suppliers").select("id, name").in("id", supplierIds);
    for (const s of (suppliers ?? []) as unknown as { id: string; name: string }[]) {
      names.set(s.id, s.name);
    }
  }

  const poIds = rows.map((r) => r.id);
  const counts = new Map<string, number>();
  if (poIds.length > 0) {
    const { data: items } = await supabase
      .from("purchase_items")
      .select("purchase_order_id")
      .in("purchase_order_id", poIds);
    for (const i of (items ?? []) as unknown as { purchase_order_id: string }[]) {
      counts.set(i.purchase_order_id, (counts.get(i.purchase_order_id) ?? 0) + 1);
    }
  }

  return rows.map((r) => ({
    ...r,
    supplier_name: r.supplier_id ? names.get(r.supplier_id) ?? null : null,
    due: r.total - r.paid_amount,
    item_count: counts.get(r.id) ?? null,
  }));
}

export interface PurchaseItemRow {
  id: string;
  medicine_id: string;
  medicine_name: string | null;
  quantity: number;
  received_quantity: number;
  cost_price: number;
  selling_price: number;
  mrp: number;
  gst_rate: number;
  gst_amount: number;
  line_total: number;
}

export interface PurchaseOrderDetail {
  id: string;
  po_number: string;
  supplier_id: string | null;
  supplier_name: string | null;
  status: string;
  order_date: string;
  expected_date: string | null;
  received_date: string | null;
  subtotal: number;
  discount: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  due: number;
  notes: string | null;
  items: PurchaseItemRow[];
  payments: { id: string; amount: number; method: string; status: string; paid_at: string; reference: string | null }[];
}

interface PoDetailBase {
  id: string;
  po_number: string;
  supplier_id: string | null;
  status: string;
  order_date: string;
  expected_date: string | null;
  received_date: string | null;
  subtotal: number;
  discount: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  notes: string | null;
}

/** Full PO detail: header, items, payments. */
export async function getPurchaseOrder(
  supabase: Client,
  storeId: string,
  poId: string
): Promise<PurchaseOrderDetail | null> {
  const { data: po } = await supabase
    .from("purchase_orders")
    .select("id, po_number, supplier_id, status, order_date, expected_date, received_date, subtotal, discount, tax_amount, total, paid_amount, notes")
    .eq("id", poId)
    .eq("store_id", storeId)
    .maybeSingle();

  const row = (po as unknown as PoDetailBase | null) ?? null;
  if (!row) return null;

  let supplier_name: string | null = null;
  if (row.supplier_id) {
    const { data: s } = await supabase.from("suppliers").select("name").eq("id", row.supplier_id).maybeSingle();
    supplier_name = (s as unknown as { name: string } | null)?.name ?? null;
  }

  const { data: items } = await supabase
    .from("purchase_items")
    .select("id, medicine_id, quantity, received_quantity, cost_price, selling_price, mrp, gst_rate, gst_amount, line_total")
    .eq("purchase_order_id", poId)
    .order("created_at");

  const itemRows = (items ?? []) as unknown as {
    id: string;
    medicine_id: string;
    quantity: number;
    received_quantity: number;
    cost_price: number;
    selling_price: number;
    mrp: number;
    gst_rate: number;
    gst_amount: number;
    line_total: number;
  }[];

  // Medicine names
  const medIds = [...new Set(itemRows.map((i) => i.medicine_id))];
  const medNames = new Map<string, string>();
  if (medIds.length > 0) {
    const { data: meds } = await supabase.from("medicines").select("id, name").in("id", medIds);
    for (const m of (meds ?? []) as unknown as { id: string; name: string }[]) {
      medNames.set(m.id, m.name);
    }
  }

  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, method, status, paid_at, reference")
    .eq("purchase_order_id", poId)
    .order("paid_at", { ascending: false });

  return {
    ...row,
    supplier_name,
    due: row.total - row.paid_amount,
    items: itemRows.map((i) => ({
      ...i,
      medicine_name: medNames.get(i.medicine_id) ?? null,
    })),
    payments: (payments ?? []) as unknown as PurchaseOrderDetail["payments"],
  };
}

export interface SupplierPaymentResult {
  po_id: string;
  paid_amount: number;
  due: number;
}

/** Record a payment against a PO (atomic RPC, updates paid_amount). */
export async function recordSupplierPayment(
  supabase: Client,
  storeId: string,
  poId: string,
  input: {
    amount: number;
    method: string;
    reference?: string | null;
    notes?: string | null;
  }
): Promise<SupplierPaymentResult> {
  // Generated types mark nullable function params as `string`; the DB accepts
  // null for reference/notes, so cast the args object loosely.
  const { data, error } = await supabase.rpc(
    "record_supplier_payment",
    {
      p_store_id: storeId,
      p_po_id: poId,
      p_amount: input.amount,
      p_method: input.method,
      p_reference: input.reference ?? null,
      p_notes: input.notes ?? null,
    } as never
  );
  if (error) throw new Error(error.message);
  return data as unknown as SupplierPaymentResult;
}

/** Medicines to pick in the "new purchase order" form. */
export interface PoMedicineOption {
  id: string;
  name: string;
  sku: string;
  selling_price: number;
  mrp: number;
  purchase_price: number;
  gst_rate: number;
  current_stock: number;
}

interface PoMedicineRaw {
  medicine_id: string;
  name: string;
  sku: string;
  selling_price: number;
  mrp: number;
  purchase_price: number;
  gst_rate: number;
  current_stock: number;
}

export async function listPoMedicines(supabase: Client, storeId: string): Promise<PoMedicineOption[]> {
  const { data } = await supabase
    .from("v_inventory_status")
    .select("medicine_id, name, sku, selling_price, mrp, purchase_price, gst_rate, current_stock")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("name");

  return ((data ?? []) as unknown as PoMedicineRaw[]).map((m) => ({
    id: m.medicine_id,
    name: m.name,
    sku: m.sku,
    selling_price: m.selling_price,
    mrp: m.mrp,
    purchase_price: m.purchase_price,
    gst_rate: m.gst_rate,
    current_stock: m.current_stock,
  }));
}
