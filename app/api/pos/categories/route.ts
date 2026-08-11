import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStoreId, listCategories } from "@/repositories/pos.repository";

/** GET /api/pos/categories — store-scoped categories for POS filter chips. */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }

  const data = await listCategories(supabase, storeId);
  return NextResponse.json({ data });
}
