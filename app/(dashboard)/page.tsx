import type { Metadata } from "next";
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStoreId, getDashboardData, emptyDashboard } from "@/repositories/dashboard.repository";
import { DashboardView } from "@/features/dashboard/dashboard-view";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  let userName: string | null = null;
  let initialData = emptyDashboard();

  try {
    const user = await getCurrentUser();
    userName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? null;

    const supabase = await createSupabaseServerClient();
    const storeId = await getCurrentStoreId(supabase);
    if (storeId) {
      initialData = await getDashboardData(supabase, storeId);
    }
  } catch {
    // Shell still renders with an empty dashboard if Supabase isn't configured yet.
  }

  return <DashboardView userName={userName} initialData={initialData} />;
}
