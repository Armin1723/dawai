type Client = Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>;

export { getCurrentStoreId } from "@/repositories/store.repository";

export interface PosProduct {
  medicine_id: string;
  name: string;
  generic_name: string | null;
  sku: string;
  barcode: string | null;
  category_id: string | null;
  category_name: string | null;
  selling_price: number;
  mrp: number;
  gst_rate: number;
  current_stock: number;
  stock_status: "in stock" | "low" | "out of stock";
}

export interface PosCategory {
  id: string;
  name: string;
  product_count: number;
}

/** Store-scoped categories with at least one active medicine, for POS filter chips. */
export async function listCategories(
  supabase: Client,
  storeId: string
): Promise<PosCategory[]> {
  const { data, error } = await supabase
    .from("v_inventory_status")
    .select("category_id, category_name")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .not("category_id", "is", null)
    .order("category_name");
  if (error) {
    // Never swallow query errors: a missing view column historically blanked
    // the whole POS grid silently. Fail loudly instead.
    throw new Error(`Failed to list categories: ${error.message}`);
  }

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as unknown as {
    category_id: string | null;
    category_name: string | null;
  }[]) {
    if (!row.category_id) continue;
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }

  const byName = new Map<string, { id: string; name: string }>();
  for (const row of (data ?? []) as unknown as {
    category_id: string | null;
    category_name: string | null;
  }[]) {
    if (!row.category_id || !row.category_name) continue;
    byName.set(row.category_name, { id: row.category_id, name: row.category_name });
  }

  return [...byName.values()].map((c) => ({
    id: c.id,
    name: c.name,
    product_count: counts.get(c.id) ?? 0,
  }));
}

/** Instant product search for the POS grid: name / generic / SKU (contains) or barcode (exact). */
export async function searchProducts(
  supabase: Client,
  storeId: string,
  query: string,
  categoryId?: string | null,
  limit = 60
): Promise<PosProduct[]> {
  const q = query.trim();

  let builder = supabase
    .from("v_inventory_status")
    .select(
      "medicine_id, name, generic_name, sku, barcode, category_id, category_name, selling_price, mrp, gst_rate, current_stock, stock_status"
    )
    .eq("store_id", storeId)
    .eq("is_active", true);

  if (categoryId) {
    builder = builder.eq("category_id", categoryId);
  }

  if (!q) {
    // Default browse: active medicines with stock, alphabetically.
    const { data, error } = await builder.order("name").limit(limit);
    if (error) {
      // Never swallow query errors: a missing view column historically blanked
      // the whole POS grid silently. Fail loudly instead.
      throw new Error(`Failed to search products: ${error.message}`);
    }
    return (data ?? []) as unknown as PosProduct[];
  }

  const like = `%${q}%`;
  const { data, error } = await builder
    .or(`name.ilike.${like},generic_name.ilike.${like},sku.ilike.${like},barcode.eq.${q}`)
    .order("name")
    .limit(limit);
  if (error) {
    throw new Error(`Failed to search products: ${error.message}`);
  }

  return (data ?? []) as unknown as PosProduct[];
}

export interface RecentSaleItem {
  medicine_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
}

export interface RecentSale {
  id: string;
  sale_number: string;
  invoice_number: string | null;
  total: number;
  payment_method: string;
  payment_status: string;
  sold_at: string;
  item_count: number | null;
  items: RecentSaleItem[];
}

export async function recentSales(supabase: Client, storeId: string): Promise<RecentSale[]> {
  const { data: sales } = await supabase
    .from("sales")
    .select(
      "id, sale_number, invoice_id, total, payment_method, payment_status, sold_at"
    )
    .eq("store_id", storeId)
    .order("sold_at", { ascending: false })
    .limit(10);

  const rows = (sales ?? []) as unknown as {
    id: string;
    sale_number: string;
    invoice_id: string | null;
    total: number;
    payment_method: string;
    payment_status: string;
    sold_at: string;
  }[];

  // Resolve invoice numbers for the returned sales (types define no relationships).
  const invoiceIds = rows.map((r) => r.invoice_id).filter(Boolean) as string[];
  const invoiceNumbers = new Map<string, string>();
  if (invoiceIds.length > 0) {
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, invoice_number")
      .in("id", invoiceIds);
    for (const inv of (invoices ?? []) as unknown as { id: string; invoice_number: string }[]) {
      invoiceNumbers.set(inv.id, inv.invoice_number);
    }
  }

  // Fetch item lines (medicine_id, qty, price, gst) for repeat-sale, then the
  // medicine names for display.
  const saleIds = rows.map((r) => r.id);
  const { data: itemRows } = saleIds.length
    ? await supabase
        .from("sale_items")
        .select("sale_id, medicine_id, quantity, unit_price, gst_rate")
        .in("sale_id", saleIds)
        .order("medicine_id")
    : { data: null };

  const itemsBySale = new Map<string, Omit<RecentSaleItem, "name">[]>();
  const medicineIds = new Set<string>();
  for (const it of (itemRows ?? []) as unknown as {
    sale_id: string;
    medicine_id: string;
    quantity: number;
    unit_price: number;
    gst_rate: number;
  }[]) {
    const list = itemsBySale.get(it.sale_id) ?? [];
    list.push({
      medicine_id: it.medicine_id,
      quantity: it.quantity,
      unit_price: it.unit_price,
      gst_rate: it.gst_rate,
    });
    itemsBySale.set(it.sale_id, list);
    medicineIds.add(it.medicine_id);
  }

  const names = new Map<string, string>();
  if (medicineIds.size > 0) {
    const { data: meds } = await supabase
      .from("medicines")
      .select("id, name")
      .in("id", [...medicineIds]);
    for (const m of (meds ?? []) as unknown as { id: string; name: string }[]) {
      names.set(m.id, m.name);
    }
  }

  return rows.map((row) => {
    const rawItems = itemsBySale.get(row.id) ?? [];
    return {
      id: row.id,
      sale_number: row.sale_number,
      invoice_number: row.invoice_id ? invoiceNumbers.get(row.invoice_id) ?? null : null,
      total: row.total,
      payment_method: row.payment_method,
      payment_status: row.payment_status,
      sold_at: row.sold_at,
      item_count: rawItems.length,
      items: rawItems.map((i) => ({ ...i, name: names.get(i.medicine_id) ?? "Item" })),
    };
  });
}
