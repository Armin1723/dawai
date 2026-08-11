import type { Metadata } from "next";
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentStoreId,
  getDashboardData,
  emptyDashboard,
  DASHBOARD_PERIODS,
  type DashboardPeriod,
} from "@/repositories/dashboard.repository";
import { DashboardView } from "@/features/dashboard/dashboard-view";

export const metadata: Metadata = { title: "Dashboard" };

interface DashboardPageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { period: rawPeriod } = await searchParams;
  const period: DashboardPeriod = DASHBOARD_PERIODS.some((p) => p.id === rawPeriod)
    ? (rawPeriod as DashboardPeriod)
    : "14d";

  let userName: string | null = null;
  let initialData = emptyDashboard(period);

  try {
    const user = await getCurrentUser();
    userName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? null;

    const supabase = await createSupabaseServerClient();
    const storeId = await getCurrentStoreId(supabase);
    if (storeId) {
      initialData = await getDashboardData(supabase, storeId, period);
    }
  } catch {
    // Shell still renders with an empty dashboard if Supabase isn't configured yet.
  }

  return <DashboardView userName={userName} initialData={initialData} />;
}
