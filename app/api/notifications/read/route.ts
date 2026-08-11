import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentStoreId,
  markNotificationsRead,
} from "@/repositories/notifications.repository";

const markReadSchema = z.object({
  ids: z.array(z.string().uuid()).max(100).optional(),
});

/** POST /api/notifications/read — mark one or all notifications read. */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }

  const parsed = markReadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
      { status: 400 }
    );
  }

  const marked = await markNotificationsRead(supabase, storeId, parsed.data.ids);
  return NextResponse.json({ data: { marked } });
}
