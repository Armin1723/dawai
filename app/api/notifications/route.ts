import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentStoreId,
  listNotifications,
  generateNotifications,
} from "@/repositories/notifications.repository";

/** GET /api/notifications — list for the store with unread count. */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }
  const data = await listNotifications(supabase, storeId);
  return NextResponse.json({ data });
}

/** POST /api/notifications — regenerate alerts from live store data. */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }
  try {
    const inserted = await generateNotifications(supabase, storeId);
    const data = await listNotifications(supabase, storeId);
    return NextResponse.json({ data, inserted });
  } catch (err) {
    console.error("[notifications] generate failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Could not refresh notifications" } },
      { status: 500 }
    );
  }
}
