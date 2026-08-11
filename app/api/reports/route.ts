import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStoreId, getReportData, type ReportPeriod } from "@/repositories/reports.repository";

const PERIODS: ReportPeriod[] = ["7d", "30d", "90d", "this_month", "all"];

/** GET /api/reports?period=30d — period-scoped business analytics. */
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
  const raw = searchParams.get("period") ?? "30d";
  const period: ReportPeriod = PERIODS.includes(raw as ReportPeriod) ? (raw as ReportPeriod) : "30d";

  const data = await getReportData(supabase, storeId, period);
  return NextResponse.json({ data });
}
