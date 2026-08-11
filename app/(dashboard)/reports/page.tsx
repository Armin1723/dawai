import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentStoreId,
  getReportData,
  emptyReportData,
  type ReportPeriod,
} from "@/repositories/reports.repository";
import { ReportsView } from "@/features/reports/reports-view";

export const metadata: Metadata = { title: "Reports" };

const PERIODS = new Set<ReportPeriod>(["7d", "30d", "90d", "this_month", "all"]);

interface ReportsPageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const { period: rawPeriod } = await searchParams;
  const period: ReportPeriod = PERIODS.has(rawPeriod as ReportPeriod)
    ? (rawPeriod as ReportPeriod)
    : "30d";

  let initialData = emptyReportData(period);
  try {
    const supabase = await createSupabaseServerClient();
    const storeId = await getCurrentStoreId(supabase);
    if (storeId) {
      initialData = await getReportData(supabase, storeId, period);
    }
  } catch {
    // Shell still renders with an empty report if Supabase isn't configured yet.
  }

  return <ReportsView initialData={initialData} />;
}
