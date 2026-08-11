import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStoreId, listNotifications } from "@/repositories/notifications.repository";
import { NotificationsView } from "@/features/notifications/notifications-view";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);

  if (!storeId) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Join or create a store to view notifications.
      </div>
    );
  }

  const { rows, unread } = await listNotifications(supabase, storeId);
  return <NotificationsView initialRows={rows} initialUnread={unread} />;
}
