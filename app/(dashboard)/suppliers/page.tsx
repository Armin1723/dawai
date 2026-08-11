import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStoreId, listSuppliers } from "@/repositories/suppliers.repository";
import { SuppliersView } from "@/features/suppliers/suppliers-view";

export const metadata: Metadata = { title: "Suppliers" };

export default async function SuppliersPage() {
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);

  if (!storeId) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Join or create a store to manage suppliers.
      </div>
    );
  }

  const suppliers = await listSuppliers(supabase, storeId);

  return <SuppliersView initialSuppliers={suppliers} />;
}
