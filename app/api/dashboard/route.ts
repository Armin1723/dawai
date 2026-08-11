import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStoreId, getDashboardData } from "@/repositories/dashboard.repository";

/** GET /api/dashboard — live KPIs, revenue series, alerts, recent sales. */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }

  const data = await getDashboardData(supabase, storeId);
  return NextResponse.json({ data });
}
