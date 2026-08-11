"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCheck,
  CircleAlert,
  Clock3,
  Info,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { relativeTime } from "@/lib/utils";
import type { NotificationRow } from "@/repositories/notifications.repository";

interface NotificationsViewProps {
  initialRows: NotificationRow[];
  initialUnread: number;
}

const TYPE_META: Record<
  string,
  { label: string; icon: typeof Bell; tint: string; chip: string }
> = {
  low_stock: {
    label: "Low stock",
    icon: CircleAlert,
    tint: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  near_expiry: {
    label: "Near expiry",
    icon: Clock3,
    tint: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  expired: {
    label: "Expired",
    icon: AlertTriangle,
    tint: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  },
  supplier_due: {
    label: "Supplier dues",
    icon: Info,
    tint: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
  payment_due: {
    label: "Pending payments",
    icon: Info,
    tint: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    chip: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  },
};
const fallbackMeta = { label: "Alert", icon: Bell, tint: "bg-muted text-muted-foreground", chip: "bg-muted text-muted-foreground" };

export function NotificationsView({ initialRows, initialUnread }: NotificationsViewProps) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread" | string>("all");

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to load notifications");
      const json = (await res.json()) as { data?: { rows: NotificationRow[]; unread: number } };
      return json.data ?? { rows: [], unread: 0 };
    },
    initialData: { rows: initialRows, unread: initialUnread },
    refetchOnWindowFocus: true,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });

  const markReadMutation = useMutation({
    mutationFn: async (ids?: string[]) => {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids && ids.length > 0 ? { ids } : {}),
      });
      if (!res.ok) throw new Error("Could not update notifications");
    },
    onSuccess: () => {
      refresh();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Update failed"),
  });

  const [generating, setGenerating] = useState(false);
  async function regenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/notifications", { method: "POST" });
      const json = (await res.json().catch(() => null)) as {
        data?: { rows: NotificationRow[]; unread: number };
        inserted?: number;
        error?: { message: string };
      } | null;
      if (!res.ok || !json?.data) throw new Error(json?.error?.message ?? "Could not refresh notifications");
      toast.success(
        (json.inserted ?? 0) > 0
          ? `${json.inserted} new alert${json.inserted === 1 ? "" : "s"} found`
          : "All caught up"
      );
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setGenerating(false);
    }
  }

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const unread = data?.unread ?? 0;

  const stats = useMemo(() => {
    const byType = new Map<string, number>();
    for (const r of rows) byType.set(r.type, (byType.get(r.type) ?? 0) + 1);
    const danger = rows.filter((r) => r.severity === "danger").length;
    const warning = rows.filter((r) => r.severity === "warning").length;
    return { byType, danger, warning };
  }, [rows]);

  const typeChips = useMemo(() => [...stats.byType.entries()].sort((a, b) => b[1] - a[1]), [stats.byType]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "unread") return rows.filter((r) => !r.is_read);
    return rows.filter((r) => r.type === filter);
  }, [rows, filter]);

  const unreadRows = rows.filter((r) => !r.is_read);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={
          unread > 0
            ? `${unread} unread alert${unread === 1 ? "" : "s"} · scanned from live stock, expiry, supplier and payment data`
            : "No unread alerts — the feed scans stock, expiry, supplier dues and pending payments"
        }
        actions={
          <>
            {unreadRows.length > 0 && (
              <Button
                variant="outline"
                onClick={() => markReadMutation.mutate(unreadRows.map((r) => r.id))}
                disabled={markReadMutation.isPending}
              >
                {markReadMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCheck className="size-4" />
                )}
                Mark all read
              </Button>
            )}
            <Button onClick={regenerate} disabled={generating}>
              {generating ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Scan now
            </Button>
          </>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl bg-muted/50 p-3 ring-1 ring-border">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BellRing className="size-3.5" /> Unread
          </p>
          <p className={`mt-0.5 text-lg font-bold tabular-nums ${unread > 0 ? "text-primary" : ""}`}>{unread}</p>
          <p className="text-[11px] text-muted-foreground">{rows.length} total alerts</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-3 ring-1 ring-border">
          <p className="text-xs text-muted-foreground">Critical</p>
          <p className={`mt-0.5 text-lg font-bold tabular-nums ${stats.danger > 0 ? "text-rose-600 dark:text-rose-400" : ""}`}>
            {stats.danger}
          </p>
          <p className="text-[11px] text-muted-foreground">expired / out of stock</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-3 ring-1 ring-border">
          <p className="text-xs text-muted-foreground">Warnings</p>
          <p className={`mt-0.5 text-lg font-bold tabular-nums ${stats.warning > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
            {stats.warning}
          </p>
          <p className="text-[11px] text-muted-foreground">low stock / dues</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-3 ring-1 ring-border">
          <p className="text-xs text-muted-foreground">Categories</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums">{stats.byType.size}</p>
          <p className="text-[11px] text-muted-foreground">alert types in play</p>
        </div>
      </div>

      {/* Filter chips */}
      {typeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            All · {rows.length}
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              filter === "unread" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            Unread · {unread}
          </button>
          {typeChips.map(([type, count]) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilter(filter === type ? "all" : type)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === type ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {TYPE_META[type]?.label ?? fallbackMeta.label} · {count}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={filter === "unread" ? "No unread alerts" : "Nothing to see here"}
          description={
            filter === "unread"
              ? "You're all caught up — new alerts appear here as soon as the store needs attention."
              : "Run a scan to check stock levels, expiring batches, supplier dues and pending payments."
          }
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((n) => {
            const meta = TYPE_META[n.type] ?? fallbackMeta;
            const Icon = meta.icon;
            return (
              <li
                key={n.id}
                className={`group flex items-start gap-3 rounded-xl p-3 shadow-card ring-1 transition-colors ${
                  n.is_read ? "bg-background ring-border" : "bg-muted/40 ring-primary/20"
                }`}
              >
                <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${meta.tint}`}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`truncate text-sm font-medium ${n.is_read ? "" : ""}`}>{n.title}</p>
                    {!n.is_read && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                  </div>
                  {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    <span className={`${meta.chip} rounded-full px-1.5 py-px text-[10px] font-medium`}>{meta.label}</span>
                    {" · "}
                    {relativeTime(n.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  {n.link && (
                    <Button asChild variant="ghost" size="sm">
                      <Link href={n.link}>View</Link>
                    </Button>
                  )}
                  {!n.is_read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label="Mark read"
                      onClick={() => markReadMutation.mutate([n.id])}
                    >
                      <CheckCheck className="size-3.5" />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
