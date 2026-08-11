import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentStoreId,
  listCategories,
  searchProducts,
} from "@/repositories/pos.repository";
import { getInvoiceContext } from "@/repositories/store.repository";
import { listCustomerOptions } from "@/repositories/customers.repository";
import { PosView } from "@/features/pos/pos-view";

export const metadata: Metadata = { title: "Point of Sale" };

interface PosPageProps {
  searchParams: Promise<{ customer?: string }>;
}

export default async function PosPage({ searchParams }: PosPageProps) {
  const { customer } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);

  if (!storeId) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Join or create a store to open the POS.
      </div>
    );
  }

  const [products, customers, categories, invoiceContext] = await Promise.all([
    searchProducts(supabase, storeId, ""),
    listCustomerOptions(supabase, storeId),
    listCategories(supabase, storeId),
    getInvoiceContext(supabase, storeId),
  ]);
  return (
    <PosView
      initialProducts={products}
      initialCustomers={customers}
      initialCategories={categories}
      invoiceContext={invoiceContext}
      preselectCustomerId={customer}
    />
  );
}
