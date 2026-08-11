import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStoreId, getReportData, emptyReportData } from "@/repositories/reports.repository";
import { ReportsView } from "@/features/reports/reports-view";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  let initialData = emptyReportData("30d");
  try {
    const supabase = await createSupabaseServerClient();
    const storeId = await getCurrentStoreId(supabase);
    if (storeId) {
      initialData = await getReportData(supabase, storeId, "30d");
    }
  } catch {
    // Shell still renders with an empty report if Supabase isn't configured yet.
  }

  return <ReportsView initialData={initialData} />;
}
