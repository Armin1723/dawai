import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStoreId, listSales } from "@/repositories/sales.repository";
import { SalesView } from "@/features/sales/sales-view";

export const metadata: Metadata = { title: "Sales" };

export default async function SalesPage() {
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);

  if (!storeId) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Join or create a store to view sales.
      </div>
    );
  }

  const sales = await listSales(supabase, storeId);
  return <SalesView initialSales={sales} />;
}
