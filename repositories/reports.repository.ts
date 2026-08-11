type Client = Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>;

import { startOfLocalDay, localDayKey, dayLabel } from "@/lib/utils";

export { getCurrentStoreId } from "@/repositories/store.repository";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReportPeriod = "7d" | "30d" | "90d" | "this_month" | "all";

export interface ReportSummary {
  revenue: number;
  profit: number;
  margin: number; // percent
  orders: number;
  avg_order_value: number;
  gst_collected: number;
  purchases: number;
  expenses: number;
  net_profit: number;
  customers_served: number;
}

export interface ReportDailyPoint {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
}

export interface ReportPaymentSlice {
  method: string;
  amount: number;
  count: number;
}

export interface ReportCategorySlice {
  category: string;
  revenue: number;
  share: number; // percent
}

export interface ReportTopProduct {
  name: string;
  sku: string;
  quantity: number;
  revenue: number;
  profit: number;
}

export interface ReportPurchaseRow {
  po_number: string;
  supplier: string | null;
  order_date: string;
  total: number;
  status: string;
}

export interface ReportExpenseRow {
  category: string;
  amount: number;
  count: number;
}

export interface ReportInventorySnapshot {
  stock_value: number;
  low_stock: number;
  out_of_stock: number;
  expiring_90d: number;
  expired: number;
  active_medicines: number;
}

export interface ReportTopCustomer {
  id: string;
  name: string;
  spent: number;
  orders: number;
  outstanding_balance: number;
}

export interface ReportData {
  period: ReportPeriod;
  range: { from: string | null; to: string | null };
  summary: ReportSummary;
  daily: ReportDailyPoint[];
  payment_split: ReportPaymentSlice[];
  category_share: ReportCategorySlice[];
  top_products: ReportTopProduct[];
  top_customers: ReportTopCustomer[];
  purchases: ReportPurchaseRow[];
  expenses: ReportExpenseRow[];
  inventory: ReportInventorySnapshot;
}

export function emptyReportData(period: ReportPeriod): ReportData {
  return {
    period,
    range: { from: null, to: null },
    summary: {
      revenue: 0, profit: 0, margin: 0, orders: 0, avg_order_value: 0,
      gst_collected: 0, purchases: 0, expenses: 0, net_profit: 0, customers_served: 0,
    },
    daily: [],
    payment_split: [],
    category_share: [],
    top_products: [],
    top_customers: [],
    purchases: [],
    expenses: [],
    inventory: {
      stock_value: 0, low_stock: 0, out_of_stock: 0, expiring_90d: 0, expired: 0, active_medicines: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Period helpers
// ---------------------------------------------------------------------------

const PERIOD_DAYS: Record<Exclude<ReportPeriod, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  this_month: 0,
};

function periodWindow(period: ReportPeriod): { fromIso: string | null; fromKey: string | null; days: number } {
  if (period === "all") return { fromIso: null, fromKey: null, days: 0 };

  if (period === "this_month") {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    first.setHours(0, 0, 0, 0);
    return { fromIso: first.toISOString(), fromKey: localDayKey(first.toISOString()), days: 0 };
  }

  const days = PERIOD_DAYS[period];
  return {
    fromIso: startOfLocalDay(-(days - 1)).toISOString(),
    fromKey: localDayKey(startOfLocalDay(-(days - 1)).toISOString()),
    days,
  };
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

interface SaleRow {
  id: string;
  customer_id: string | null;
  payment_method: string;
  total: number;
  profit: number;
  tax_amount: number;
  sold_at: string;
}

/** Compute period-scoped business reports for the store. */
export async function getReportData(
  supabase: Client,
  storeId: string,
  period: ReportPeriod = "30d"
): Promise<ReportData> {
  const { fromIso, fromKey } = periodWindow(period);

  let salesQuery = supabase
    .from("sales")
    .select("id, customer_id, payment_method, total, profit, tax_amount, sold_at")
    .eq("store_id", storeId)
    .eq("status", "completed");
  if (fromIso) salesQuery = salesQuery.gte("sold_at", fromIso);
  const { data: salesData } = await salesQuery.order("sold_at");

  const sales = (salesData ?? []) as unknown as SaleRow[];

  // Bucket window: fixed periods start at fromKey; "all" starts at the
  // earliest sale (capped at 90 days so the chart stays readable).
  let bucketStartKey = fromKey ?? "0000-00-00";
  if (period === "all" && sales.length > 0) {
    const earliest = sales.reduce((min, s) => (localDayKey(s.sold_at) < min ? localDayKey(s.sold_at) : min), localDayKey(sales[0]!.sold_at));
    const cap = localDayKey(startOfLocalDay(-89).toISOString());
    bucketStartKey = earliest > cap ? earliest : cap;
  }
  const fromKeyBound = fromKey ?? "0000-00-00";

  const summary: ReportSummary = {
    revenue: 0, profit: 0, margin: 0, orders: 0, avg_order_value: 0,
    gst_collected: 0, purchases: 0, expenses: 0, net_profit: 0, customers_served: 0,
  };

  // -- daily buckets (from the bucket window start through today)
  const buckets = new Map<string, { revenue: number; profit: number; orders: number }>();
  const bucketCursor = new Date(`${bucketStartKey}T00:00:00`);
  const todayKey = localDayKey(new Date().toISOString());
  while (localDayKey(bucketCursor.toISOString()) <= todayKey) {
    buckets.set(localDayKey(bucketCursor.toISOString()), { revenue: 0, profit: 0, orders: 0 });
    bucketCursor.setDate(bucketCursor.getDate() + 1);
  }

  const servedCustomers = new Set<string>();

  for (const s of sales) {
    const key = localDayKey(s.sold_at);
    if (key < fromKeyBound) continue; // safety (timestamptz vs local-day boundary)
    summary.revenue += s.total;
    summary.profit += s.profit;
    summary.gst_collected += s.tax_amount;
    summary.orders += 1;
    if (s.customer_id) servedCustomers.add(s.customer_id);

    const b = buckets.get(key);
    if (b) {
      b.revenue += s.total;
      b.profit += s.profit;
      b.orders += 1;
    }
  }
  summary.avg_order_value = summary.orders > 0 ? summary.revenue / summary.orders : 0;
  summary.margin = summary.revenue > 0 ? (summary.profit / summary.revenue) * 100 : 0;
  summary.customers_served = servedCustomers.size;

  const daily: ReportDailyPoint[] = [...buckets.entries()].map(([key, v]) => ({
    date: dayLabel(key),
    ...v,
  }));

  // -- payment split
  const byMethod = new Map<string, { amount: number; count: number }>();
  for (const s of sales) {
    const acc = byMethod.get(s.payment_method) ?? { amount: 0, count: 0 };
    acc.amount += s.total;
    acc.count += 1;
    byMethod.set(s.payment_method, acc);
  }
  const payment_split: ReportPaymentSlice[] = [...byMethod.entries()]
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([method, v]) => ({ method, ...v }));

  // -- category share + top products from sale items
  const saleIds = sales.map((s) => s.id);
  let category_share: ReportCategorySlice[] = [];
  let top_products: ReportTopProduct[] = [];

  if (saleIds.length > 0) {
    const { data: items } = await supabase
      .from("sale_items")
      .select("medicine_id, quantity, cost_price, gst_amount, line_total")
      .in("sale_id", saleIds);

    const itemRows = (items ?? []) as unknown as {
      medicine_id: string;
      quantity: number;
      cost_price: number;
      gst_amount: number;
      line_total: number;
    }[];

    const medIds = [...new Set(itemRows.map((i) => i.medicine_id))];
    const { data: medicines } = await supabase
      .from("medicines")
      .select("id, name, sku, category_id")
      .in("id", medIds);
    const medRows = (medicines ?? []) as unknown as {
      id: string;
      name: string;
      sku: string;
      category_id: string | null;
    }[];
    const medById = new Map(medRows.map((m) => [m.id, m]));

    // categories
    const catIds = [...new Set(medRows.map((m) => m.category_id).filter(Boolean))] as string[];
    const catNames = new Map<string, string>();
    if (catIds.length > 0) {
      const { data: cats } = await supabase.from("categories").select("id, name").in("id", catIds);
      for (const c of (cats ?? []) as unknown as { id: string; name: string }[]) catNames.set(c.id, c.name);
    }
    const byCategory = new Map<string, number>();
    for (const i of itemRows) {
      const med = medById.get(i.medicine_id);
      const name = med?.category_id ? catNames.get(med.category_id) : null;
      byCategory.set(name ?? "Uncategorised", (byCategory.get(name ?? "Uncategorised") ?? 0) + i.line_total);
    }
    const totalRevenue = [...byCategory.values()].reduce((a, b) => a + b, 0);
    if (totalRevenue > 0) {
      category_share = [...byCategory.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([category, revenue]) => ({
          category,
          revenue,
          share: Math.round((revenue / totalRevenue) * 1000) / 10,
        }));
    }

    // top products by revenue (top 10); profit matches the sale-level
    // definition (total − GST − cost): line_total already nets the discount
    // and includes GST, so subtract the stored gst_amount.
    const byProduct = new Map<string, { quantity: number; revenue: number; profit: number }>();
    for (const i of itemRows) {
      const acc = byProduct.get(i.medicine_id) ?? { quantity: 0, revenue: 0, profit: 0 };
      acc.quantity += i.quantity;
      acc.revenue += i.line_total;
      acc.profit += i.line_total - i.gst_amount - i.quantity * i.cost_price;
      byProduct.set(i.medicine_id, acc);
    }
    top_products = [...byProduct.entries()]
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .map(([id, acc]) => {
        const med = medById.get(id);
        return {
          name: med?.name ?? "Medicine",
          sku: med?.sku ?? id.slice(0, 8).toUpperCase(),
          ...acc,
        };
      });
  }

  // -- top customers by spend in the period
  let top_customers: ReportTopCustomer[] = [];
  const spentByCustomer = new Map<string, { spent: number; orders: number }>();
  for (const s of sales) {
    if (!s.customer_id) continue;
    const acc = spentByCustomer.get(s.customer_id) ?? { spent: 0, orders: 0 };
    acc.spent += s.total;
    acc.orders += 1;
    spentByCustomer.set(s.customer_id, acc);
  }
  if (spentByCustomer.size > 0) {
    const custIds = [...spentByCustomer.keys()];
    const { data: customers } = await supabase
      .from("customers")
      .select("id, name, outstanding_balance")
      .in("id", custIds);
    const custById = new Map(
      ((customers ?? []) as unknown as { id: string; name: string; outstanding_balance: number }[]).map((c) => [
        c.id,
        c,
      ])
    );
    top_customers = [...spentByCustomer.entries()]
      .sort((a, b) => b[1].spent - a[1].spent)
      .slice(0, 5)
      .map(([id, acc]) => {
        const c = custById.get(id);
        return {
          id,
          name: c?.name ?? "Customer",
          spent: acc.spent,
          orders: acc.orders,
          outstanding_balance: c?.outstanding_balance ?? 0,
        };
      });
  }

  // -- purchases in period
  let purchasesQuery = supabase
    .from("purchase_orders")
    .select("po_number, supplier_id, order_date, total, status")
    .eq("store_id", storeId);
  if (fromIso) purchasesQuery = purchasesQuery.gte("order_date", fromIso.slice(0, 10));
  const { data: purchaseData } = await purchasesQuery.order("order_date", { ascending: false }).limit(10);

  const poRows = (purchaseData ?? []) as unknown as {
    po_number: string;
    supplier_id: string | null;
    order_date: string;
    total: number;
    status: string;
  }[];

  const supplierIds = [...new Set(poRows.map((p) => p.supplier_id).filter(Boolean))] as string[];
  const supplierNames = new Map<string, string>();
  if (supplierIds.length > 0) {
    const { data: suppliers } = await supabase.from("suppliers").select("id, name").in("id", supplierIds);
    for (const s of (suppliers ?? []) as unknown as { id: string; name: string }[]) supplierNames.set(s.id, s.name);
  }

  // purchase totals for summary
  const { data: purchaseTotals } = await supabase
    .from("purchase_orders")
    .select("total, order_date")
    .eq("store_id", storeId)
    .gte("order_date", fromIso ? fromIso.slice(0, 10) : "0000-01-01");
  summary.purchases = ((purchaseTotals ?? []) as unknown as { total: number }[]).reduce(
    (sum, p) => sum + p.total,
    0
  );

  const purchases: ReportPurchaseRow[] = poRows.map((p) => ({
    po_number: p.po_number,
    supplier: p.supplier_id ? supplierNames.get(p.supplier_id) ?? null : null,
    order_date: p.order_date,
    total: p.total,
    status: p.status,
  }));

  // -- expenses in period
  let expensesQuery = supabase
    .from("expenses")
    .select("category, amount")
    .eq("store_id", storeId);
  if (fromIso) expensesQuery = expensesQuery.gte("expense_date", fromIso.slice(0, 10));
  const { data: expenseData } = await expensesQuery;

  const byExpenseCat = new Map<string, { amount: number; count: number }>();
  for (const e of (expenseData ?? []) as unknown as { category: string; amount: number }[]) {
    const acc = byExpenseCat.get(e.category) ?? { amount: 0, count: 0 };
    acc.amount += e.amount;
    acc.count += 1;
    byExpenseCat.set(e.category, acc);
  }
  summary.expenses = [...byExpenseCat.values()].reduce((sum, e) => sum + e.amount, 0);
  summary.net_profit = summary.profit - summary.expenses;

  const expenses: ReportExpenseRow[] = [...byExpenseCat.entries()]
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([category, v]) => ({ category, ...v }));

  // -- inventory snapshot
  const { data: inv } = await supabase
    .from("v_inventory_status")
    .select("current_stock, stock_value, stock_status, expiry_status")
    .eq("store_id", storeId)
    .eq("is_active", true);

  const invRows = (inv ?? []) as unknown as {
    current_stock: number;
    stock_value: number;
    stock_status: string;
    expiry_status: string;
  }[];

  const inventory: ReportInventorySnapshot = {
    stock_value: invRows.reduce((sum, r) => sum + r.stock_value, 0),
    low_stock: invRows.filter((r) => r.stock_status === "low").length,
    out_of_stock: invRows.filter((r) => r.stock_status === "out of stock").length,
    expiring_90d: invRows.filter((r) => r.expiry_status === "near expiry").length,
    expired: invRows.filter((r) => r.expiry_status === "expired").length,
    active_medicines: invRows.length,
  };

  return {
    period,
    range: { from: fromIso, to: new Date().toISOString() },
    summary,
    daily,
    payment_split,
    category_share,
    top_products,
    top_customers,
    purchases,
    expenses,
    inventory,
  };
}
