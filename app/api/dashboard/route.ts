import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentStoreId,
  getDashboardData,
  type DashboardPeriod,
} from "@/repositories/dashboard.repository";

const PERIODS = new Set<DashboardPeriod>(["7d", "14d", "30d", "this_month"]);

/** GET /api/dashboard?period=7d|14d|30d|this_month — live KPIs, series, alerts. */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const rawPeriod = url.searchParams.get("period") ?? "14d";
  const period: DashboardPeriod = PERIODS.has(rawPeriod as DashboardPeriod)
    ? (rawPeriod as DashboardPeriod)
    : "14d";

  const data = await getDashboardData(supabase, storeId, period);
  return NextResponse.json({ data });
}
