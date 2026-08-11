import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentStoreId,
  listCategories,
  listManufacturers,
  listMedicines,
} from "@/repositories/inventory.repository";
import { InventoryView } from "@/features/inventory/inventory-view";

export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);

  if (!storeId) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Join or create a store to manage inventory.
      </div>
    );
  }

  const [medicines, categories, manufacturers] = await Promise.all([
    listMedicines(supabase, storeId),
    listCategories(supabase, storeId),
    listManufacturers(supabase, storeId),
  ]);

  return (
    <InventoryView
      initialMedicines={medicines}
      categories={categories}
      manufacturers={manufacturers}
    />
  );
}
