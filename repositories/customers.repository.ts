type Client = Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>;

export { getCurrentStoreId } from "@/repositories/store.repository";

export interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  date_of_birth: string | null;
  blood_group: string | null;
  credit_limit: number;
  outstanding_balance: number;
  loyalty_points: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  // Aggregates
  total_spent: number;
  sale_count: number;
  last_purchase_at: string | null;
}

type CustomerBase = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  date_of_birth: string | null;
  blood_group: string | null;
  credit_limit: number;
  outstanding_balance: number;
  loyalty_points: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

/** List customers with purchase aggregates for the store. */
export async function listCustomers(supabase: Client, storeId: string): Promise<CustomerRow[]> {
  const { data: customers } = await supabase
    .from("customers")
    .select(
      "id, name, phone, email, address, city, state, pincode, date_of_birth, blood_group, credit_limit, outstanding_balance, loyalty_points, notes, is_active, created_at"
    )
    .eq("store_id", storeId)
    .order("name");

  const rows = (customers ?? []) as unknown as CustomerBase[];

  // Sales aggregates per customer (completed sales only).
  const { data: sales } = await supabase
    .from("sales")
    .select("customer_id, total, sold_at")
    .eq("store_id", storeId)
    .eq("status", "completed")
    .not("customer_id", "is", null);

  const spentByCustomer = new Map<string, { total: number; count: number; last: string | null }>();
  for (const s of (sales ?? []) as unknown as { customer_id: string | null; total: number; sold_at: string }[]) {
    if (!s.customer_id) continue;
    const acc = spentByCustomer.get(s.customer_id) ?? { total: 0, count: 0, last: null };
    acc.total += s.total;
    acc.count += 1;
    if (!acc.last || s.sold_at > acc.last) acc.last = s.sold_at;
    spentByCustomer.set(s.customer_id, acc);
  }

  return rows.map((c) => {
    const agg = spentByCustomer.get(c.id);
    return {
      ...c,
      total_spent: agg?.total ?? 0,
      sale_count: agg?.count ?? 0,
      last_purchase_at: agg?.last ?? null,
    };
  });
}

export interface CustomerSaleHistory {
  sale_id: string;
  sale_number: string;
  invoice_number: string | null;
  sold_at: string;
  total: number;
  payment_status: string;
  paid: number;
}

export interface CustomerPaymentRow {
  id: string;
  amount: number;
  method: string;
  status: string;
  paid_at: string;
  reference: string | null;
}

export interface CustomerDetail extends CustomerBase {
  sales: CustomerSaleHistory[];
  payments: CustomerPaymentRow[];
}

/** Full customer detail: profile + purchase history with payments. */
export async function getCustomerDetail(
  supabase: Client,
  storeId: string,
  customerId: string
): Promise<CustomerDetail | null> {
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .eq("store_id", storeId)
    .maybeSingle();

  const row = (customer as unknown as CustomerBase | null) ?? null;
  if (!row) return null;

  const { data: sales } = await supabase
    .from("sales")
    .select("id, sale_number, invoice_id, total, payment_status, sold_at")
    .eq("store_id", storeId)
    .eq("customer_id", customerId)
    .eq("status", "completed")
    .order("sold_at", { ascending: false });

  const saleRows = (sales ?? []) as unknown as {
    id: string;
    sale_number: string;
    invoice_id: string | null;
    total: number;
    payment_status: string;
    sold_at: string;
  }[];

  // Invoice numbers + paid amounts per sale.
  const invoiceIds = [...new Set(saleRows.map((s) => s.invoice_id).filter(Boolean))] as string[];
  const invoiceNumbers = new Map<string, string>();
  if (invoiceIds.length > 0) {
    const { data: invoices } = await supabase.from("invoices").select("id, invoice_number").in("id", invoiceIds);
    for (const inv of (invoices ?? []) as unknown as { id: string; invoice_number: string }[]) {
      invoiceNumbers.set(inv.id, inv.invoice_number);
    }
  }

  const saleIds = saleRows.map((s) => s.id);
  const paidBySale = new Map<string, number>();
  if (saleIds.length > 0) {
    const { data: payments } = await supabase
      .from("payments")
      .select("sale_id, amount")
      .eq("store_id", storeId)
      .in("sale_id", saleIds);
    for (const p of (payments ?? []) as unknown as { sale_id: string | null; amount: number }[]) {
      if (p.sale_id) paidBySale.set(p.sale_id, (paidBySale.get(p.sale_id) ?? 0) + p.amount);
    }
  }

  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, method, status, paid_at, reference")
    .eq("store_id", storeId)
    .eq("customer_id", customerId)
    .order("paid_at", { ascending: false })
    .limit(50);

  return {
    ...row,
    sales: saleRows.map((s) => ({
      sale_id: s.id,
      sale_number: s.sale_number,
      invoice_number: s.invoice_id ? invoiceNumbers.get(s.invoice_id) ?? null : null,
      sold_at: s.sold_at,
      total: s.total,
      payment_status: s.payment_status,
      paid: paidBySale.get(s.id) ?? 0,
    })),
    payments: (payments ?? []) as unknown as CustomerPaymentRow[],
  };
}

export interface CustomerOption {
  id: string;
  name: string;
  phone: string | null;
  outstanding_balance: number;
  credit_limit: number;
  is_active: boolean;
}

/** Lightweight customer list for POS pickers and quick-links. */
export async function listCustomerOptions(supabase: Client, storeId: string): Promise<CustomerOption[]> {
  const { data } = await supabase
    .from("customers")
    .select("id, name, phone, outstanding_balance, credit_limit, is_active")
    .eq("store_id", storeId)
    .order("name");
  return (data ?? []) as unknown as CustomerOption[];
}

export interface RecordedCustomerPayment {
  customer_id: string;
  applied: number;
  outstanding_balance: number;
  invoices_settled: unknown[];
}

/** Record a customer payment via the RPC (settles oldest invoices first). */
export async function recordCustomerPayment(
  supabase: Client,
  storeId: string,
  customerId: string,
  input: { amount: number; method: string; reference?: string | null; notes?: string | null }
): Promise<RecordedCustomerPayment> {
  // Generated types mark nullable function params as `string`; the DB accepts
  // null for reference/notes, so cast the args object loosely.
  const { data, error } = await supabase.rpc(
    "record_customer_payment",
    {
      p_store_id: storeId,
      p_customer_id: customerId,
      p_amount: input.amount,
      p_method: input.method,
      p_reference: input.reference ?? null,
      p_notes: input.notes ?? null,
    } as never
  );

  if (error) throw new Error(error.message);
  return data as unknown as RecordedCustomerPayment;
}
