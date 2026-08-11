import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

const bodySchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().min(1).max(120),
  email: z.string().email(),
});

/**
 * POST /api/auth/onboard
 * Creates a store + owner profile + default settings for a brand-new signup.
 * Uses the service-role client (server only).
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid payload" } },
      { status: 400 }
    );
  }

  const { userId, fullName, email } = parsed.data;

  // Only the signed-in user may onboard themselves, and only once.
  const sessionClient = await createSupabaseServerClient();
  const {
    data: { user: sessionUser },
  } = await sessionClient.auth.getUser();
  if (!sessionUser || sessionUser.id !== userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authorized to onboard this user" } },
      { status: 401 }
    );
  }

  const supabase = await createSupabaseAdminClient();

  // Idempotent: if the user already has a profile, nothing to do.
  const { data: existing } = await supabase
    .from("profiles")
    .select("store_id")
    .eq("id", userId)
    .maybeSingle();
  if (existing?.store_id) {
    return NextResponse.json({ data: { storeId: existing.store_id, alreadyOnboarded: true } });
  }

  // 1. Create the store.
  const storeName = `${fullName.split(" ")[0]}'s Pharmacy`;
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .insert({ name: storeName, email, currency: "INR" })
    .select("id")
    .single();

  if (storeError) {
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Could not create store" } },
      { status: 500 }
    );
  }

  // 2. Create the owner profile.
  const { error: profileError } = await supabase
    .from("profiles")
    .insert({ id: userId, store_id: store.id, role: "owner", full_name: fullName });

  if (profileError) {
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Could not create profile" } },
      { status: 500 }
    );
  }

  // 3. Default settings.
  await supabase
    .from("settings")
    .insert({ store_id: store.id, business_name: storeName, email });

  return NextResponse.json({ data: { storeId: store.id } });
}
