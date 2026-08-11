"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowDownToLine,
  BarChart3,
  CircleDollarSign,
  Package,
  Pill,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { PaymentMethodChip } from "@/components/shared/payment-method-chip";
import { cn, downloadCsv, formatCurrency } from "@/lib/utils";
import {
  emptyReportData,
  type ReportData,
  type ReportPeriod,
} from "@/repositories/reports.repository";

const PERIODS: { id: ReportPeriod; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "this_month", label: "This month" },
  { id: "all", label: "All time" },
];

const trendConfig: ChartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  profit: { label: "Profit", color: "var(--chart-2)" },
};

const CATEGORY_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

const categoryConfig: ChartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
};


function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Receipt;
  tone: "teal" | "emerald" | "sky" | "amber";
}) {
  const tones = {
    teal: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };
  return (
    <Card className="transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lifted">
      <CardContent className="flex h-full flex-col gap-2.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
            <Icon className="size-3.5" />
          </div>
        </div>
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

interface ReportsViewProps {
  initialData?: ReportData;
}

export function ReportsView({ initialData }: ReportsViewProps) {
  const [period, setPeriod] = useState<ReportPeriod>(initialData?.period ?? "30d");

  const { data, isFetching } = useQuery<ReportData>({
    queryKey: ["reports", period],
    queryFn: async () => {
      const res = await fetch(`/api/reports?period=${period}`);
      if (!res.ok) throw new Error("Failed to load reports");
      const json = (await res.json()) as { data?: ReportData };
      return json.data ?? emptyReportData(period);
    },
    // Server-provided data for the initial period; placeholder for tab switches
    // so the view shows loading states instead of a flash of empty data.
    ...(initialData && initialData.period === period
      ? { initialData }
      : { placeholderData: () => emptyReportData(period) }),
  });

  const report = data ?? emptyReportData(period);
  const s = report.summary;
  const hasSales = s.orders > 0;

  const periodLabel = PERIODS.find((p) => p.id === period)?.label ?? "30 days";

  function exportSales() {
    downloadCsv(
      `mediflow-sales-${period}.csv`,
      ["Date", "Revenue", "Profit", "Orders"],
      report.daily.map((d) => [d.date, d.revenue, d.profit, d.orders])
    );
  }

  function exportProducts() {
    downloadCsv(
      `mediflow-top-products-${period}.csv`,
      ["Product", "SKU", "Units sold", "Revenue", "Profit"],
      report.top_products.map((p) => [p.name, p.sku, p.quantity, p.revenue, p.profit])
    );
  }

  function exportExpenses() {
    downloadCsv(
      `mediflow-expenses-${period}.csv`,
      ["Category", "Entries", "Amount"],
      report.expenses.map((e) => [e.category, e.count, e.amount])
    );
  }

  function exportCustomers() {
    downloadCsv(
      `mediflow-top-customers-${period}.csv`,
      ["Customer", "Orders", "Spent", "Outstanding"],
      report.top_customers.map((c) => [c.name, c.orders, c.spent, c.outstanding_balance])
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description={`Business analytics · ${periodLabel} · updated live`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportSales} disabled={isFetching}>
              <ArrowDownToLine className="size-4" /> Sales CSV
            </Button>
            <Button variant="outline" onClick={exportProducts} disabled={isFetching}>
              <ArrowDownToLine className="size-4" /> Products CSV
            </Button>
            <Button variant="outline" onClick={exportExpenses} disabled={isFetching}>
              <ArrowDownToLine className="size-4" /> Expenses CSV
            </Button>
          </div>
        }
      />

      {/* Period tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl bg-card p-1 shadow-card ring-1 ring-border">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              period === p.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Summary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Revenue" value={formatCurrency(s.revenue)} sub={hasSales ? `${s.orders} invoices` : "No sales in period"} icon={Receipt} tone="teal" />
        <SummaryCard label="Profit" value={formatCurrency(s.profit)} sub={`${s.margin.toFixed(1)}% margin`} icon={TrendingUp} tone="emerald" />
        <SummaryCard label="Avg order value" value={formatCurrency(s.avg_order_value)} sub={`${s.customers_served} customers served`} icon={ShoppingBag} tone="sky" />
        <SummaryCard label="Net profit" value={formatCurrency(s.net_profit)} sub={`Purchases ${formatCurrency(s.purchases)} · Expenses ${formatCurrency(s.expenses)}`} icon={CircleDollarSign} tone="amber" />
      </div>

      {/* Trend + category */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-tight">Revenue & profit trend</CardTitle>
            <CardDescription className="text-xs">Daily totals · {periodLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            {!hasSales ? (
              <div className="flex h-64 items-center justify-center rounded-xl ring-1 ring-dashed ring-border">
                <p className="text-sm text-muted-foreground">No sales in this period.</p>
              </div>
            ) : (
              <ChartContainer config={trendConfig} className="h-64 w-full">
                <AreaChart data={report.daily} margin={{ left: 4, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="fillRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="fillProf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                  <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v) => `₹${(Number(v) / 1000).toFixed(0)}k`} />
                  <ChartTooltip
                    cursor={{ stroke: "var(--border)" }}
                    content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2} fill="url(#fillRev)" dot={false} activeDot={{ r: 4 }} />
                  <Area type="monotone" dataKey="profit" stroke="var(--chart-2)" strokeWidth={2} fill="url(#fillProf)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-tight">Sales by category</CardTitle>
            <CardDescription className="text-xs">Revenue share · {periodLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            {report.category_share.length === 0 ? (
              <div className="flex h-48 items-center justify-center rounded-xl ring-1 ring-dashed ring-border">
                <p className="text-sm text-muted-foreground">No data yet</p>
              </div>
            ) : (
              <>
                <ChartContainer config={categoryConfig} className="h-44 w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={report.category_share}
                      dataKey="revenue"
                      nameKey="category"
                      innerRadius={44}
                      outerRadius={68}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {report.category_share.map((entry, i) => (
                        <Cell key={entry.category} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="mt-3 space-y-1.5">
                  {report.category_share.slice(0, 6).map((c, i) => (
                    <div key={c.category} className="flex items-center gap-2 text-sm">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                      <span className="flex-1 truncate">{c.category}</span>
                      <span className="tabular-nums text-muted-foreground">{c.share.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment split + inventory */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-tight">Payment methods</CardTitle>
            <CardDescription className="text-xs">By amount · {periodLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            {report.payment_split.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No sales in this period.</p>
            ) : (
              <ul className="space-y-3">
                {report.payment_split.map((p) => {
                  const share = s.revenue > 0 ? (p.amount / s.revenue) * 100 : 0;
                  return (
                    <li key={p.method}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <PaymentMethodChip method={p.method} />
                        <span className="font-medium tabular-nums">{formatCurrency(p.amount)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.min(share, 100)}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-tight">Expenses by category</CardTitle>
            <CardDescription className="text-xs">{formatCurrency(s.expenses)} total · {periodLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            {report.expenses.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No expenses recorded in this period.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {report.expenses.map((e) => (
                  <li key={e.category} className="flex items-center justify-between gap-2 py-2.5">
                    <span className="flex items-center gap-2 text-sm">
                      <Wallet className="size-3.5 text-muted-foreground" />
                      {e.category}
                      <span className="text-xs text-muted-foreground">({e.count})</span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{formatCurrency(e.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-tight">Inventory health</CardTitle>
            <CardDescription className="text-xs">Live snapshot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3 ring-1 ring-border">
              <span className="flex items-center gap-2 text-sm"><Pill className="size-3.5 text-primary" /> Stock value</span>
              <span className="font-bold tabular-nums">{formatCurrency(report.inventory.stock_value)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl p-3 ring-1 ring-border">
                <p className="text-2xl font-bold tabular-nums">{report.inventory.active_medicines}</p>
                <p className="text-xs text-muted-foreground">Active medicines</p>
              </div>
              <div className="rounded-xl p-3 ring-1 ring-border">
                <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{report.inventory.low_stock}</p>
                <p className="text-xs text-muted-foreground">Low stock</p>
              </div>
              <div className="rounded-xl p-3 ring-1 ring-border">
                <p className="text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">{report.inventory.out_of_stock}</p>
                <p className="text-xs text-muted-foreground">Out of stock</p>
              </div>
              <div className="rounded-xl p-3 ring-1 ring-border">
                <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{report.inventory.expiring_90d}</p>
                <p className="text-xs text-muted-foreground">Expiring ≤ 90d</p>
              </div>
            </div>
            {report.inventory.expired > 0 && (
              <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                {report.inventory.expired} expired batch{report.inventory.expired === 1 ? "" : "es"} — check the expiry watch.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top products */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-sm font-semibold tracking-tight">Top products</CardTitle>
            <CardDescription className="text-xs">By revenue · {periodLabel}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={exportProducts}>
            <ArrowDownToLine className="size-3.5" /> CSV
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { accessorKey: "name", header: "Product", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
              { accessorKey: "sku", header: "SKU", cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.sku}</span> },
              { accessorKey: "quantity", header: "Units", cell: ({ row }) => <span className="tabular-nums">{row.original.quantity}</span> },
              { accessorKey: "revenue", header: "Revenue", cell: ({ row }) => <span className="font-semibold tabular-nums">{formatCurrency(row.original.revenue)}</span> },
              { accessorKey: "profit", header: "Profit", cell: ({ row }) => <span className="tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(row.original.profit)}</span> },
            ]}
            data={report.top_products}
            loading={isFetching}
            pagination={false}
            empty={{ icon: BarChart3, title: "No product sales", description: "Complete checkouts in POS to see rankings." }}
          />
        </CardContent>
      </Card>

      {/* Top customers */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Users className="size-4 text-primary" /> Top customers
            </CardTitle>
            <CardDescription className="text-xs">By spend · {periodLabel} · outstanding shown live</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={exportCustomers}>
            <ArrowDownToLine className="size-3.5" /> CSV
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { accessorKey: "name", header: "Customer", cell: ({ row }) => (
                <Link href={`/customers?customer=${row.original.id}`} className="font-medium underline-offset-4 transition-colors hover:text-primary hover:underline">
                  {row.original.name}
                </Link>
              ) },
              { accessorKey: "orders", header: "Orders", cell: ({ row }) => <span className="tabular-nums">{row.original.orders}</span> },
              { accessorKey: "spent", header: "Spent", cell: ({ row }) => <span className="font-semibold tabular-nums">{formatCurrency(row.original.spent)}</span> },
              { accessorKey: "outstanding_balance", header: "Outstanding", cell: ({ row }) => (
                <span className={row.original.outstanding_balance > 0 ? "font-semibold tabular-nums text-amber-600 dark:text-amber-400" : "tabular-nums"}>
                  {formatCurrency(row.original.outstanding_balance)}
                </span>
              ) },
            ]}
            data={report.top_customers}
            loading={isFetching}
            pagination={false}
            empty={{ icon: Users, title: "No customer sales", description: "Attach a customer at POS checkout to rank them here." }}
          />
        </CardContent>
      </Card>

      {/* Purchases */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Truck className="size-4 text-primary" /> Recent purchases
          </CardTitle>
          <CardDescription className="text-xs">{formatCurrency(s.purchases)} ordered · {periodLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { accessorKey: "po_number", header: "PO", cell: ({ row }) => <span className="font-medium">{row.original.po_number}</span> },
              { accessorKey: "supplier", header: "Supplier", cell: ({ row }) => <span className="text-sm">{row.original.supplier ?? "—"}</span> },
              { accessorKey: "order_date", header: "Ordered", cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.order_date}</span> },
              { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
              { accessorKey: "total", header: "Total", cell: ({ row }) => <span className="font-semibold tabular-nums">{formatCurrency(row.original.total)}</span> },
            ]}
            data={report.purchases}
            loading={isFetching}
            pagination={false}
            empty={{ icon: Package, title: "No purchases", description: "Create purchase orders to track buying." }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
