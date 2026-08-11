type Client = Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>;
import type { PaymentStatus, SaleStatus } from "@/types";

export { getCurrentStoreId } from "@/repositories/store.repository";

export interface SalesListFilters {
  payment_status?: string;
  status?: string;
}

export interface SaleRow {
  id: string;
  sale_number: string;
  invoice_number: string | null;
  customer_id: string | null;
  customer_name: string | null;
  status: string;
  payment_method: string;
  payment_status: string;
  total: number;
  sold_at: string;
  item_count: number | null;
}

interface SaleBase {
  id: string;
  sale_number: string;
  invoice_id: string | null;
  customer_id: string | null;
  status: string;
  payment_method: string;
  payment_status: string;
  total: number;
  sold_at: string;
}

/** List sales for the store with invoice numbers, customer names and item counts. */
export async function listSales(
  supabase: Client,
  storeId: string,
  filters: SalesListFilters = {}
): Promise<SaleRow[]> {
  let query = supabase
    .from("sales")
    .select("id, sale_number, invoice_id, customer_id, status, payment_method, payment_status, total, sold_at")
    .eq("store_id", storeId);

  if (filters.payment_status && filters.payment_status !== "all") {
    query = query.eq("payment_status", filters.payment_status as PaymentStatus);
  }
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status as SaleStatus);
  }

  const { data } = await query.order("sold_at", { ascending: false }).limit(100);
  const rows = (data ?? []) as unknown as SaleBase[];

  const invoiceIds = [...new Set(rows.map((r) => r.invoice_id).filter(Boolean))] as string[];
  const customerIds = [...new Set(rows.map((r) => r.customer_id).filter(Boolean))] as string[];
  const saleIds = rows.map((r) => r.id);

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

  const customerNames = new Map<string, string>();
  if (customerIds.length > 0) {
    const { data: customers } = await supabase
      .from("customers")
      .select("id, name")
      .in("id", customerIds);
    for (const c of (customers ?? []) as unknown as { id: string; name: string }[]) {
      customerNames.set(c.id, c.name);
    }
  }

  const itemCounts = new Map<string, number>();
  if (saleIds.length > 0) {
    const { data: items } = await supabase
      .from("sale_items")
      .select("sale_id")
      .in("sale_id", saleIds);
    for (const i of (items ?? []) as unknown as { sale_id: string }[]) {
      itemCounts.set(i.sale_id, (itemCounts.get(i.sale_id) ?? 0) + 1);
    }
  }

  return rows.map((r) => ({
    ...r,
    invoice_number: r.invoice_id ? invoiceNumbers.get(r.invoice_id) ?? null : null,
    customer_name: r.customer_id ? customerNames.get(r.customer_id) ?? null : null,
    item_count: itemCounts.get(r.id) ?? null,
  }));
}

export interface SaleItemRow {
  id: string;
  medicine_id: string;
  medicine_name: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  gst_rate: number;
  gst_amount: number;
  line_total: number;
}

export interface SalePaymentRow {
  id: string;
  amount: number;
  method: string;
  status: string;
  paid_at: string;
  reference: string | null;
}

export interface SaleReturnRow {
  id: string;
  sale_item_id: string | null;
  medicine_name: string | null;
  quantity: number;
  refund_amount: number;
  reason: string | null;
  return_type: string;
  created_at: string;
}

export interface SaleDetail {
  id: string;
  sale_number: string;
  invoice_number: string | null;
  customer_id: string | null;
  customer_name: string | null;
  status: string;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  discount: number;
  tax_amount: number;
  total: number;
  cost_of_goods: number;
  profit: number;
  notes: string | null;
  sold_at: string;
  items: SaleItemRow[];
  payments: SalePaymentRow[];
  returns: SaleReturnRow[];
}

export interface SaleReturnInput {
  items: { sale_item_id: string; quantity: number; reason?: string | null }[];
  refund_method: string;
  refund_note?: string | null;
}

export interface SaleReturnResult {
  sale_id: string;
  returned_items: number;
  refund_amount: number;
  stock_restored: number;
  full_return: boolean;
  status: string;
  payment_status: string;
  return_ids: string[];
}

/** Create a (partial or full) return for a completed sale via the atomic RPC. */
export async function createSaleReturn(
  supabase: Client,
  storeId: string,
  saleId: string,
  processedBy: string | null,
  input: SaleReturnInput
): Promise<SaleReturnResult> {
  const { data, error } = await supabase.rpc(
    "create_sale_return",
    {
      p_store_id: storeId,
      p_sale_id: saleId,
      p_processed_by: processedBy,
      p_items: input.items.map((i) => ({
        sale_item_id: i.sale_item_id,
        quantity: i.quantity,
        reason: i.reason ?? null,
      })),
      p_refund_method: input.refund_method,
      p_refund_note: input.refund_note ?? null,
    } as never
  );
  if (error) throw new Error(error.message);
  return data as unknown as SaleReturnResult;
}

interface SaleDetailBase {
  id: string;
  sale_number: string;
  invoice_id: string | null;
  customer_id: string | null;
  status: string;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  discount: number;
  tax_amount: number;
  total: number;
  cost_of_goods: number;
  profit: number;
  notes: string | null;
  sold_at: string;
}

/** Full sale detail: header, line items with medicine names, payments. */
export async function getSaleDetail(
  supabase: Client,
  storeId: string,
  saleId: string
): Promise<SaleDetail | null> {
  const { data: sale } = await supabase
    .from("sales")
    .select(
      "id, sale_number, invoice_id, customer_id, status, payment_method, payment_status, subtotal, discount, tax_amount, total, cost_of_goods, profit, notes, sold_at"
    )
    .eq("id", saleId)
    .eq("store_id", storeId)
    .maybeSingle();

  const row = (sale as unknown as SaleDetailBase | null) ?? null;
  if (!row) return null;

  let invoice_number: string | null = null;
  if (row.invoice_id) {
    const { data: inv } = await supabase
      .from("invoices")
      .select("invoice_number")
      .eq("id", row.invoice_id)
      .maybeSingle();
    invoice_number = (inv as unknown as { invoice_number: string } | null)?.invoice_number ?? null;
  }

  let customer_name: string | null = null;
  if (row.customer_id) {
    const { data: c } = await supabase
      .from("customers")
      .select("name")
      .eq("id", row.customer_id)
      .maybeSingle();
    customer_name = (c as unknown as { name: string } | null)?.name ?? null;
  }

  const { data: items } = await supabase
    .from("sale_items")
    .select("id, medicine_id, quantity, unit_price, discount, gst_rate, gst_amount, line_total")
    .eq("sale_id", saleId)
    .order("created_at");

  const itemRows = (items ?? []) as unknown as Omit<SaleItemRow, "medicine_name">[];

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
    .eq("sale_id", saleId)
    .order("paid_at", { ascending: false });

  const { data: returns } = await supabase
    .from("returns")
    .select("id, sale_item_id, medicine_id, quantity, refund_amount, reason, return_type, created_at")
    .eq("sale_id", saleId)
    .order("created_at", { ascending: true });

  const returnRows = (returns ?? []) as unknown as {
    id: string;
    sale_item_id: string | null;
    medicine_id: string | null;
    quantity: number;
    refund_amount: number;
    reason: string | null;
    return_type: string;
    created_at: string;
  }[];

  const returnMedIds = [...new Set(returnRows.map((r) => r.medicine_id).filter(Boolean))] as string[];
  const returnMedNames = new Map<string, string>();
  if (returnMedIds.length > 0) {
    const { data: meds } = await supabase.from("medicines").select("id, name").in("id", returnMedIds);
    for (const m of (meds ?? []) as unknown as { id: string; name: string }[]) {
      returnMedNames.set(m.id, m.name);
    }
  }

  return {
    ...row,
    invoice_number,
    customer_name,
    items: itemRows.map((i) => ({ ...i, medicine_name: medNames.get(i.medicine_id) ?? null })),
    payments: (payments ?? []) as unknown as SalePaymentRow[],
    returns: returnRows.map((r) => ({
      ...r,
      medicine_name: r.medicine_id ? returnMedNames.get(r.medicine_id) ?? null : null,
    })),
  };
}
