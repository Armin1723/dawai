type Client = Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>;

export { getCurrentStoreId } from "@/repositories/store.repository";

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  severity: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

interface NotificationBase {
  id: string;
  type: string;
  title: string;
  body: string | null;
  severity: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

/** List notifications for the store (newest first) with an unread count. */
export async function listNotifications(
  supabase: Client,
  storeId: string
): Promise<{ rows: NotificationRow[]; unread: number }> {
  const { data: rows } = await supabase
    .from("notifications")
    .select("id, type, title, body, severity, link, is_read, created_at, updated_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(100);

  const typed = ((rows ?? []) as unknown as NotificationBase[]).map((r) => ({
    ...r,
    body: r.body ?? null,
    link: r.link ?? null,
  }));

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("is_read", false);

  return { rows: typed, unread: count ?? 0 };
}

/** Mark a single notification (or all) as read. */
export async function markNotificationsRead(
  supabase: Client,
  storeId: string,
  ids?: string[]
): Promise<number> {
  let query = supabase
    .from("notifications")
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .eq("store_id", storeId)
    .eq("is_read", false);
  if (ids && ids.length > 0) query = query.in("id", ids);
  const { data: updated } = await query.select("id");
  return (updated ?? []).length;
}

/** Run the alert generator for the store; returns how many were inserted. */
export async function generateNotifications(supabase: Client, storeId: string): Promise<number> {
  const { data, error } = await supabase.rpc("generate_notifications", {
    p_store_id: storeId,
  });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}
