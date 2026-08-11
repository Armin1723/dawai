type Client = Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>;

import { startOfLocalDay, localDayKey, dayLabel, relativeTime } from "@/lib/utils";

export { getCurrentStoreId } from "@/repositories/store.repository";

// ---------------------------------------------------------------------------
// Types (mirror the shapes the dashboard view renders)
// ---------------------------------------------------------------------------

export interface DashboardKpi {
  title: string;
  /** Numeric value used by the KPI count-up. */
  count: number;
  /** Percent change vs previous period; omitted when the base is zero. */
  delta?: number;
  hint: string;
}

export interface DashboardRevenuePoint {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
}

export interface DashboardCategorySlice {
  category: string;
  value: number;
}

export interface DashboardMover {
  name: string;
  sku: string;
  quantity: number;
  revenue: number;
}

export interface DashboardLowStockItem {
  name: string;
  sku: string;
  stock: number;
  min: number;
}

export interface DashboardExpiryItem {
  name: string;
  batch: string;
  qty: number;
  expiry: string;
  status: "near expiry" | "expired";
}

export interface DashboardRecentSale {
  id: string;
  number: string;
  customer: string;
  total: number;
  method: string;
  time: string;
}

export interface DashboardData {
  kpis: DashboardKpi[];
  revenueSeries: DashboardRevenuePoint[];
  categorySales: DashboardCategorySlice[];
  fastMovers: DashboardMover[];
  lowStock: DashboardLowStockItem[];
  expiring: DashboardExpiryItem[];
  recentSales: DashboardRecentSale[];
  aiMetrics: Record<string, unknown>;
}

export function emptyDashboard(): DashboardData {
  return {
    kpis: [],
    revenueSeries: [],
    categorySales: [],
    fastMovers: [],
    lowStock: [],
    expiring: [],
    recentSales: [],
    aiMetrics: {},
  };
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

interface SaleBaseRow {
  id: string;
  invoice_id: string | null;
  customer_id: string | null;
  status: string;
  payment_status: string;
  payment_method: string;
  total: number;
  profit: number;
  sold_at: string;
}

/** Compute every dashboard panel for the store from live data. */
export async function getDashboardData(supabase: Client, storeId: string): Promise<DashboardData> {
  // -- 14-day sales window (covers today's KPI, 7d KPIs, series, movers, share)
  const { data: sales } = await supabase
    .from("sales")
    .select("id, invoice_id, customer_id, status, payment_status, payment_method, total, profit, sold_at")
    .eq("store_id", storeId)
    .gte("sold_at", startOfLocalDay(-13).toISOString())
    .order("sold_at", { ascending: false });

  const rows = (sales ?? []) as unknown as SaleBaseRow[];
  const completed = rows.filter((r) => r.status === "completed");

  // -- Revenue series: 14 buckets, zero-filled
  const seriesStart = startOfLocalDay(-13);
  const byDay = new Map<string, { revenue: number; profit: number; orders: number }>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(seriesStart);
    d.setDate(seriesStart.getDate() + i);
    byDay.set(localDayKey(d.toISOString()), { revenue: 0, profit: 0, orders: 0 });
  }
  for (const s of completed) {
    const key = localDayKey(s.sold_at);
    const b = byDay.get(key);
    if (b) {
      b.revenue += s.total;
      b.profit += s.profit;
      b.orders += 1;
    }
  }
  const revenueSeries: DashboardRevenuePoint[] = [...byDay.entries()].map(([key, v]) => ({
    date: dayLabel(key),
    ...v,
  }));

  // -- KPIs
  const todayKey = localDayKey(new Date().toISOString());
  const yesterdayKey = localDayKey(startOfLocalDay(-1).toISOString());

  const sumDay = (key: string) =>
    completed.reduce((sum, s) => (localDayKey(s.sold_at) === key ? sum + s.total : sum), 0);
  const countDay = (key: string) =>
    completed.reduce((sum, s) => (localDayKey(s.sold_at) === key ? sum + 1 : sum), 0);

  const todaySales = sumDay(todayKey);
  const todayOrders = countDay(todayKey);
  const yesterdaySales = sumDay(yesterdayKey);
  const todayDelta =
    yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 : undefined;

  const last7 = completed.filter((s) => localDayKey(s.sold_at) >= localDayKey(startOfLocalDay(-6).toISOString()));
  const prev7 = completed.filter((s) => {
    const k = localDayKey(s.sold_at);
    return k >= localDayKey(startOfLocalDay(-13).toISOString()) && k < localDayKey(startOfLocalDay(-6).toISOString());
  });
  const weekRevenue = last7.reduce((sum, s) => sum + s.total, 0);
  const weekProfit = last7.reduce((sum, s) => sum + s.profit, 0);
  const prevWeekRevenue = prev7.reduce((sum, s) => sum + s.total, 0);
  const weekDelta =
    prevWeekRevenue > 0 ? ((weekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100 : undefined;

  // Pending payments: outstanding balance across open invoices in the window.
  const openSales = completed.filter((s) =>
    ["pending", "partial", "overdue"].includes(s.payment_status)
  );
  const openIds = openSales.map((s) => s.id);
  const paidBySale = new Map<string, number>();
  if (openIds.length > 0) {
    const { data: payments } = await supabase
      .from("payments")
      .select("sale_id, amount")
      .in("sale_id", openIds);
    // Only positive rows count towards "paid" — refunds (negative rows) must
    // never inflate an open invoice's pending amount.
    for (const p of (payments ?? []) as unknown as { sale_id: string; amount: number }[]) {
      if (p.amount <= 0) continue;
      paidBySale.set(p.sale_id, (paidBySale.get(p.sale_id) ?? 0) + p.amount);
    }
  }
  const pendingPayments = openSales.reduce(
    (sum, s) => sum + Math.max(0, s.total - (paidBySale.get(s.id) ?? 0)),
    0
  );

  const kpis: DashboardKpi[] = [
    {
      title: "Today's Sales",
      count: todaySales,
      delta: todayDelta,
      hint: todayOrders === 1 ? "1 invoice today" : `${todayOrders} invoices today · vs yesterday`,
    },
    {
      title: "Revenue (7d)",
      count: weekRevenue,
      delta: weekDelta,
      hint: "vs previous 7 days",
    },
    {
      title: "Profit (7d)",
      count: weekProfit,
      hint: weekRevenue > 0 ? `${((weekProfit / weekRevenue) * 100).toFixed(1)}% margin` : "Gross margin",
    },
    {
      title: "Pending Payments",
      count: pendingPayments,
      hint: openSales.length === 1 ? "1 invoice open" : `${openSales.length} invoices open`,
    },
  ];

  // -- Category share + fast movers from sale items
  const completedIds = completed.map((s) => s.id);
  let categorySales: DashboardCategorySlice[] = [];
  let fastMovers: DashboardMover[] = [];

  if (completedIds.length > 0) {
    const { data: items } = await supabase
      .from("sale_items")
      .select("medicine_id, quantity, line_total")
      .in("sale_id", completedIds);

    const itemRows = (items ?? []) as unknown as {
      medicine_id: string;
      quantity: number;
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

    // Category revenue
    const catIds = [...new Set(medRows.map((m) => m.category_id).filter(Boolean))] as string[];
    const catNames = new Map<string, string>();
    if (catIds.length > 0) {
      const { data: cats } = await supabase.from("categories").select("id, name").in("id", catIds);
      for (const c of (cats ?? []) as unknown as { id: string; name: string }[]) {
        catNames.set(c.id, c.name);
      }
    }
    const byCategory = new Map<string, number>();
    for (const i of itemRows) {
      const med = medById.get(i.medicine_id);
      const name = med?.category_id ? catNames.get(med.category_id) : null;
      byCategory.set(name ?? "Uncategorised", (byCategory.get(name ?? "Uncategorised") ?? 0) + i.line_total);
    }
    const totalRevenue = [...byCategory.values()].reduce((a, b) => a + b, 0);
    if (totalRevenue > 0) {
      const sorted = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
      const top = sorted.slice(0, 5);
      const rest = sorted.slice(5);
      const slices = top.map(([category, revenue]) => ({
        category,
        value: Math.round((revenue / totalRevenue) * 100),
      }));
      const restRevenue = rest.reduce((sum, [, r]) => sum + r, 0);
      if (restRevenue > 0) slices.push({ category: "Others", value: Math.round((restRevenue / totalRevenue) * 100) });
      categorySales = slices;
    }

    // Fast movers: top 4 by units sold
    const units = new Map<string, { quantity: number; revenue: number }>();
    for (const i of itemRows) {
      const acc = units.get(i.medicine_id) ?? { quantity: 0, revenue: 0 };
      acc.quantity += i.quantity;
      acc.revenue += i.line_total;
      units.set(i.medicine_id, acc);
    }
    fastMovers = [...units.entries()]
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 4)
      .map(([id, acc]) => {
        const med = medById.get(id);
        return {
          name: med?.name ?? "Medicine",
          sku: med?.sku ?? id.slice(0, 8).toUpperCase(),
          quantity: acc.quantity,
          revenue: acc.revenue,
        };
      });
  }

  // -- Low stock (active only)
  const { data: inv } = await supabase
    .from("v_inventory_status")
    .select("medicine_id, name, sku, current_stock, min_stock, stock_status")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .in("stock_status", ["low", "out of stock"])
    .order("current_stock", { ascending: true })
    .limit(5);
  const lowStock = ((inv ?? []) as unknown as {
    name: string;
    sku: string;
    current_stock: number;
    min_stock: number;
  }[]).map((r) => ({ name: r.name, sku: r.sku, stock: r.current_stock, min: r.min_stock }));

  // -- Expiry watch: batches expiring within 90 days or already expired
  const ninetyDays = new Date(Date.now() + 90 * 86_400_000).toISOString();
  const { data: meds } = await supabase
    .from("medicines")
    .select("id, name")
    .eq("store_id", storeId)
    .eq("is_active", true);
  const medIds = ((meds ?? []) as unknown as { id: string }[]).map((m) => m.id);
  let expiring: DashboardExpiryItem[] = [];
  if (medIds.length > 0) {
    const { data: batches } = await supabase
      .from("medicine_batches")
      .select("medicine_id, batch_number, expiry_date, quantity")
      .in("medicine_id", medIds)
      .gt("quantity", 0)
      .lt("expiry_date", ninetyDays)
      .order("expiry_date", { ascending: true })
      .limit(5);
    const nameById = new Map(((meds ?? []) as unknown as { id: string; name: string }[]).map((m) => [m.id, m.name]));
    const nowMs = Date.now();
    expiring = ((batches ?? []) as unknown as {
      medicine_id: string;
      batch_number: string;
      expiry_date: string;
      quantity: number;
    }[]).map((b) => ({
      name: nameById.get(b.medicine_id) ?? "Medicine",
      batch: b.batch_number,
      qty: b.quantity,
      expiry: new Date(b.expiry_date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      status: new Date(b.expiry_date).getTime() < nowMs ? ("expired" as const) : ("near expiry" as const),
    }));
  }

  // -- Recent sales (top 5) with invoice numbers + customer names
  const recentRows = completed.slice(0, 5);
  const recentInvoiceIds = [...new Set(recentRows.map((r) => r.invoice_id).filter(Boolean))] as string[];
  const recentCustomerIds = [...new Set(recentRows.map((r) => r.customer_id).filter(Boolean))] as string[];
  const [invoiceMap, customerMap] = await Promise.all([
    recentInvoiceIds.length > 0
      ? supabase
          .from("invoices")
          .select("id, invoice_number")
          .in("id", recentInvoiceIds)
          .then(({ data }) => {
            const m = new Map<string, string>();
            for (const inv of (data ?? []) as unknown as { id: string; invoice_number: string }[]) m.set(inv.id, inv.invoice_number);
            return m;
          })
      : Promise.resolve(new Map<string, string>()),
    recentCustomerIds.length > 0
      ? supabase
          .from("customers")
          .select("id, name")
          .in("id", recentCustomerIds)
          .then(({ data }) => {
            const m = new Map<string, string>();
            for (const c of (data ?? []) as unknown as { id: string; name: string }[]) m.set(c.id, c.name);
            return m;
          })
      : Promise.resolve(new Map<string, string>()),
  ]);
  const recentSales: DashboardRecentSale[] = recentRows.map((r) => ({
    id: r.id,
    number: r.invoice_id ? invoiceMap.get(r.invoice_id) ?? r.id.slice(0, 8) : r.id.slice(0, 8),
    customer: r.customer_id ? customerMap.get(r.customer_id) ?? "Walk-in" : "Walk-in",
    total: r.total,
    method: r.payment_method,
    time: relativeTime(r.sold_at),
  }));

  // -- AI summary input
  const aiMetrics = {
    todaySales,
    weekRevenue,
    weekProfit,
    pendingPayments,
    lowStockCount: lowStock.length,
    nearExpiryCount: expiring.filter((e) => e.status === "near expiry").length,
    expiredCount: expiring.filter((e) => e.status === "expired").length,
    bestSeller: fastMovers[0]?.name,
    salesGrowthPct: weekDelta,
  };

  return {
    kpis,
    revenueSeries,
    categorySales,
    fastMovers,
    lowStock,
    expiring,
    recentSales,
    aiMetrics,
  };
}
