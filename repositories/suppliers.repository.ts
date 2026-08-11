type Client = Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>;

export { getCurrentStoreId } from "@/repositories/store.repository";

export interface SupplierRow {
  id: string;
  name: string;
  gstin: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  opening_balance: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  // Aggregates
  total_purchases: number;
  total_paid: number;
  outstanding: number;
}

interface SupplierBase {
  id: string;
  name: string;
  gstin: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  opening_balance: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

/** List suppliers with purchase/payment aggregates for the store. */
export async function listSuppliers(supabase: Client, storeId: string): Promise<SupplierRow[]> {
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, name, gstin, contact_person, phone, email, city, state, pincode, opening_balance, notes, is_active, created_at")
    .eq("store_id", storeId)
    .order("name");

  const rows = (suppliers ?? []) as unknown as SupplierBase[];

  // Fetch PO totals + payments per supplier (types define no relationships).
  const { data: orders } = await supabase
    .from("purchase_orders")
    .select("supplier_id, total")
    .eq("store_id", storeId);

  const { data: payments } = await supabase
    .from("payments")
    .select("supplier_id, amount")
    .eq("store_id", storeId)
    .not("supplier_id", "is", null);

  const poBySupplier = new Map<string, number>();
  for (const o of (orders ?? []) as unknown as { supplier_id: string | null; total: number }[]) {
    if (o.supplier_id) poBySupplier.set(o.supplier_id, (poBySupplier.get(o.supplier_id) ?? 0) + o.total);
  }
  const paidBySupplier = new Map<string, number>();
  for (const p of (payments ?? []) as unknown as { supplier_id: string | null; amount: number }[]) {
    if (p.supplier_id) paidBySupplier.set(p.supplier_id, (paidBySupplier.get(p.supplier_id) ?? 0) + p.amount);
  }

  return rows.map((s) => {
    const total = poBySupplier.get(s.id) ?? 0;
    const paid = paidBySupplier.get(s.id) ?? 0;
    return {
      ...s,
      total_purchases: total,
      total_paid: paid,
      outstanding: s.opening_balance + total - paid,
    };
  });
}

export interface SupplierTransaction {
  po_id: string;
  po_number: string;
  order_date: string;
  status: string;
  total: number;
  paid: number;
}

/** Purchase history + payments for a single supplier. */
export async function getSupplierTransactions(
  supabase: Client,
  storeId: string,
  supplierId: string
): Promise<SupplierTransaction[]> {
  const { data: orders } = await supabase
    .from("purchase_orders")
    .select("id, po_number, order_date, status, total, paid_amount")
    .eq("store_id", storeId)
    .eq("supplier_id", supplierId)
    .order("order_date", { ascending: false });

  const rows = (orders ?? []) as unknown as {
    id: string;
    po_number: string;
    order_date: string;
    status: string;
    total: number;
    paid_amount: number;
  }[];

  const poIds = rows.map((r) => r.id);
  const paidByPo = new Map<string, number>();
  if (poIds.length > 0) {
    const { data: payments } = await supabase
      .from("payments")
      .select("purchase_order_id, amount")
      .eq("store_id", storeId)
      .in("purchase_order_id", poIds);
    for (const p of (payments ?? []) as unknown as { purchase_order_id: string | null; amount: number }[]) {
      if (p.purchase_order_id) {
        paidByPo.set(p.purchase_order_id, (paidByPo.get(p.purchase_order_id) ?? 0) + p.amount);
      }
    }
  }

  return rows.map((r) => ({
    po_id: r.id,
    po_number: r.po_number,
    order_date: r.order_date,
    status: r.status,
    total: r.total,
    paid: paidByPo.get(r.id) ?? 0,
  }));
}
