"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, Bell, CircleAlert, Clock3, Info, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSupabaseClient } from "@/lib/supabase/client";
import { relativeTime } from "@/lib/utils";
import type { NotificationRow } from "@/repositories/notifications.repository";

const TYPE_ICON: Record<string, typeof Bell> = {
  low_stock: CircleAlert,
  near_expiry: Clock3,
  expired: AlertTriangle,
  supplier_due: Info,
  payment_due: Info,
};

export function NotificationsBell() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications-bell"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to load notifications");
      const json = (await res.json()) as {
        data?: { rows: NotificationRow[]; unread: number };
      };
      return json.data ?? { rows: [], unread: 0 };
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  // Realtime: any insert/update/delete on the store's notifications refreshes the badge.
  useEffect(() => {
    const channel = getSupabaseClient()
      .channel("notifications-bell")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => void queryClient.invalidateQueries({ queryKey: ["notifications-bell"] })
      )
      .subscribe();
    return () => {
      void getSupabaseClient().removeChannel(channel);
    };
  }, [queryClient]);

  const rows = data?.rows ?? [];
  const unread = data?.unread ?? 0;
  const latest = rows.slice(0, 4);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-background">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Bell className="size-3.5" /> Notifications
          </span>
          {unread > 0 && (
            <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
              {unread} unread
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {latest.length === 0 ? (
          <div className="flex flex-col items-center gap-1 px-3 py-6 text-center">
            <Sparkles className="size-5 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground">All caught up.</p>
            <p className="text-[11px] text-muted-foreground/70">Run a scan from the notifications page.</p>
          </div>
        ) : (
          latest.map((n) => {
            const Icon = TYPE_ICON[n.type] ?? Bell;
            return (
              <DropdownMenuItem
                key={n.id}
                className="flex items-start gap-2.5 py-2"
                onClick={async () => {
                  if (!n.is_read) {
                    await fetch("/api/notifications/read", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ ids: [n.id] }),
                    }).catch(() => null);
                    void queryClient.invalidateQueries({ queryKey: ["notifications-bell"] });
                  }
                  if (n.link) router.push(n.link);
                }}
              >
                <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md ${n.is_read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0">
                  <span className={`block truncate text-xs font-medium ${n.is_read ? "" : ""}`}>{n.title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {n.body}
                    {n.body ? " · " : ""}
                    {relativeTime(n.created_at)}
                  </span>
                </span>
              </DropdownMenuItem>
            );
          })
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/notifications")} className="justify-center">
          <Link href="/notifications" className="flex w-full items-center justify-center gap-1.5 text-xs font-medium">
            <Bell className="size-3.5" /> View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
