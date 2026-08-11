"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Banknote,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  Pill,
  Plus,
  Sparkles,
  TrendingUp,
  Wallet,
  type LucideIcon,
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard, toneChipClass, type MetricTone } from "@/components/shared/metric-card";
import { PaymentMethodChip } from "@/components/shared/payment-method-chip";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn, formatCurrency } from "@/lib/utils";
import { emptyDashboard, type DashboardData } from "@/repositories/dashboard.repository";

const revenueConfig: ChartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  profit: { label: "Profit", color: "var(--chart-2)" },
};

const categoryConfig: ChartConfig = {
  value: { label: "Share", color: "var(--chart-1)" },
};

const CATEGORY_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

const KPI_META: { icon: LucideIcon; tone: MetricTone }[] = [
  { icon: Banknote, tone: "teal" },
  { icon: TrendingUp, tone: "sky" },
  { icon: CircleDollarSign, tone: "emerald" },
  { icon: Wallet, tone: "amber" },
];

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  tone?: MetricTone;
  action?: { label: string; href: string };
  children: React.ReactNode;
  className?: string;
}

function SectionCard({ icon: Icon, title, description, tone = "teal", action, children, className }: SectionCardProps) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={cn("flex size-8 items-center justify-center rounded-lg", toneChipClass(tone))}>
            <Icon className="size-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
            {description && <CardDescription className="text-xs">{description}</CardDescription>}
          </div>
        </div>
        {action && (
          <Link
            href={action.href}
            className="inline-flex items-center gap-0.5 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {action.label} <ChevronRight className="size-3.5" />
          </Link>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ListEmpty({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
      <span className="flex size-1.5 rounded-full bg-emerald-500" aria-hidden />
      {label}
    </p>
  );
}

interface DashboardViewProps {
  userName?: string | null;
  initialData?: DashboardData;
}

export function DashboardView({ userName, initialData }: DashboardViewProps) {
  // Greeting depends on the clock; suppressed hydration warning because
  // server and client render at different moments of the day.
  const [greeting] = useState(() => timeGreeting());
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard");
      const json = (await res.json()) as { data?: DashboardData };
      return json.data ?? emptyDashboard();
    },
    initialData: initialData ?? emptyDashboard(),
    refetchOnWindowFocus: true,
  });

  const { kpis, revenueSeries, categorySales, fastMovers, lowStock, expiring, recentSales, aiMetrics } = data;

  const aiEnabled = aiMetrics && Object.keys(aiMetrics).length > 0;
  // Initial loading state derived from whether metrics exist, so the effect
  // below never needs a synchronous setState (lint rule: no set-state-in-effect).
  const [aiLoading, setAiLoading] = useState(aiEnabled);

  useEffect(() => {
    if (!aiEnabled) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ai/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ metrics: aiMetrics }),
        });
        const json = (await res.json()) as { data?: { content: string } };
        if (!cancelled && json.data) setAiSummary(json.data.content);
      } catch {
        // keep the fallback card
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [aiEnabled, aiMetrics]);

  const firstName = userName?.split(" ")[0] ?? "there";
  // Gate the chart on the 14-day series: sales older than the 7d KPI window
  // (but inside the series window) must still show the chart.
  const hasSales = revenueSeries.some((p) => p.revenue > 0);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-card p-6 shadow-card ring-1 ring-border sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[radial-gradient(circle,oklch(0.5_0.1_195/0.14),transparent_65%)] dark:bg-[radial-gradient(circle,oklch(0.74_0.1_190/0.16),transparent_65%)]"
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl" suppressHydrationWarning>
              {greeting}, {firstName}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Here&apos;s how your store is performing today — sales, stock and expiry at a glance.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Badge variant="outline" className="h-8 gap-1.5 px-3">
              <span className="relative flex size-1.5 rounded-full bg-emerald-500" aria-hidden>
                <span className="absolute inset-0 animate-live-dot rounded-full bg-emerald-500" />
              </span>
              <span className="flex items-center gap-1 text-xs">
                <Activity className="size-3 text-emerald-500" /> All systems normal
              </span>
            </Badge>
            <Button asChild size="lg">
              <Link href="/pos">
                <Plus /> New sale
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/reports">View reports</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.length === 0 &&
          KPI_META.map((meta, i) => (
            <MetricCard key={i} title="—" value="—" icon={meta.icon} tone={meta.tone} loading />
          ))}
        {kpis.map((kpi, i) => (
          <MetricCard
            key={kpi.title}
            title={kpi.title}
            value={formatCurrency(kpi.count)}
            countTo={kpi.count}
            valueFormat={formatCurrency}
            delta={kpi.delta}
            hint={kpi.hint}
            icon={KPI_META[i % KPI_META.length].icon}
            tone={KPI_META[i % KPI_META.length].tone}
          />
        ))}
      </div>

      {/* Charts + AI */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          icon={TrendingUp}
          title="Revenue & profit"
          description="Last 14 days"
          action={{ label: "Full report", href: "/reports" }}
          className="lg:col-span-2"
        >
          {!hasSales ? (
            <div className="flex h-72 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No sales yet — complete a checkout in POS to see your revenue here.
              </p>
            </div>
          ) : (
            <ChartContainer config={revenueConfig} className="h-72 w-full">
              <AreaChart data={revenueSeries} margin={{ left: 4, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v) => `₹${(Number(v) / 1000).toFixed(0)}k`}
                />
                <ChartTooltip
                  cursor={{ stroke: "var(--border)" }}
                  content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  fill="url(#fillRevenue)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  fill="url(#fillProfit)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </SectionCard>

        <SectionCard
          icon={Pill}
          title="Sales by category"
          description="Current period share"
          action={{ label: "Inventory", href: "/inventory" }}
        >
          {categorySales.length === 0 ? (
            <div className="flex h-48 items-center justify-center">
              <p className="text-sm text-muted-foreground">No sales yet</p>
            </div>
          ) : (
            <>
              <ChartContainer config={categoryConfig} className="h-48 w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={categorySales}
                    dataKey="value"
                    nameKey="category"
                    innerRadius={50}
                    outerRadius={76}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {categorySales.map((entry, i) => (
                      <Cell key={entry.category} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="mt-3 space-y-1.5">
                {categorySales.map((c, i) => (
                  <div key={c.category} className="flex items-center gap-2 text-sm">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                    <span className="flex-1">{c.category}</span>
                    <span className="font-medium tabular-nums text-muted-foreground">{c.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>
      </div>

      {/* Alerts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          icon={AlertTriangle}
          title="Low stock"
          description="Below minimum threshold"
          tone="amber"
          action={{ label: "Inventory", href: "/inventory" }}
        >
          {lowStock.length === 0 ? (
            <ListEmpty label="All medicines are stocked above their minimum." />
          ) : (
            <ul className="divide-y divide-border/60">
              {lowStock.map((item) => (
                <li key={item.sku} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                      {item.stock} left
                    </p>
                    <p className="text-xs text-muted-foreground">min {item.min}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          icon={CalendarClock}
          title="Expiry watch"
          description="Next 90 days + expired"
          tone="rose"
          action={{ label: "Inventory", href: "/inventory" }}
        >
          {expiring.length === 0 ? (
            <ListEmpty label="No batches expiring in the next 90 days." />
          ) : (
            <ul className="divide-y divide-border/60">
              {expiring.map((item) => (
                <li key={item.batch} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Batch {item.batch} · {item.qty} units
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={item.status} />
                    <p className="text-xs tabular-nums text-muted-foreground">{item.expiry}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          icon={Sparkles}
          title="AI business summary"
          description="Generated from today's numbers"
        >
          {aiLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                {aiSummary ? (
                  <p className="whitespace-pre-line">{aiSummary}</p>
                ) : (
                  <p>
                    AI insights are unavailable right now. Add an{" "}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8em]">
                      OPENROUTER_API_KEY
                    </code>{" "}
                    to enable them.
                  </p>
                )}
              </div>
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Sparkles className="size-3" /> Read-only · never modifies data
              </Badge>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          icon={TrendingUp}
          title="Fast-moving medicines"
          description="By units sold this week"
          action={{ label: "Reports", href: "/reports" }}
        >
          {fastMovers.length === 0 ? (
            <ListEmpty label="No sales yet — movers will rank here." />
          ) : (
            <ul className="space-y-3">
              {fastMovers.map((m, i) => (
                <motion.li
                  key={m.sku}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05, duration: 0.25 }}
                  className="flex items-center gap-3"
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums",
                      i === 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.quantity} units · {formatCurrency(m.revenue)}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          icon={Activity}
          title="Recent sales"
          description="Latest invoices"
          action={{ label: "Sales", href: "/sales" }}
          className="lg:col-span-2"
        >
          {recentSales.length === 0 ? (
            <ListEmpty label="No sales yet — complete a checkout in POS." />
          ) : (
            <ul className="divide-y divide-border/60">
              {recentSales.map((sale) => (
                <li key={sale.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-tight">{sale.number}</p>
                    <p className="text-xs text-muted-foreground">
                      {sale.customer} · {sale.time}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <PaymentMethodChip method={sale.method} className="hidden sm:inline-flex" />
                    <span className="text-sm font-semibold tabular-nums">{formatCurrency(sale.total)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
