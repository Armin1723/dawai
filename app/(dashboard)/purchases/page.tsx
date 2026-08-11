import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStoreId, listPoMedicines, listPurchaseOrders } from "@/repositories/purchases.repository";
import { listSuppliers } from "@/repositories/suppliers.repository";
import { PurchasesView } from "@/features/purchases/purchases-view";

export const metadata: Metadata = { title: "Purchases" };

export default async function PurchasesPage() {
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);

  if (!storeId) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Join or create a store to manage purchases.
      </div>
    );
  }

  const [orders, suppliers, medicines] = await Promise.all([
    listPurchaseOrders(supabase, storeId),
    listSuppliers(supabase, storeId),
    listPoMedicines(supabase, storeId),
  ]);

  return (
    <PurchasesView
      initialOrders={orders}
      suppliers={suppliers}
      medicines={medicines}
    />
  );
}
