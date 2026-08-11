import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStoreId, listSales } from "@/repositories/sales.repository";

/** GET /api/sales?payment_status=paid&status=completed — list sales. */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const data = await listSales(supabase, storeId, {
    payment_status: searchParams.get("payment_status") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });
  return NextResponse.json({ data });
}
