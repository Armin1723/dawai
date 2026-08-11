import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStoreId, listSales } from "@/repositories/sales.repository";
import { getInvoiceContext } from "@/repositories/store.repository";
import { SalesView } from "@/features/sales/sales-view";

export const metadata: Metadata = { title: "Sales" };

interface SalesPageProps {
  searchParams: Promise<{ payment_status?: string; status?: string }>;
}

export default async function SalesPage({ searchParams }: SalesPageProps) {
  const { payment_status, status } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);

  if (!storeId) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Join or create a store to view sales.
      </div>
    );
  }

  const [sales, invoiceContext] = await Promise.all([
    listSales(supabase, storeId, {
      payment_status: payment_status && payment_status !== "all" ? payment_status : undefined,
      status: status && status !== "all" ? status : undefined,
    }),
    getInvoiceContext(supabase, storeId),
  ]);
  return (
    <SalesView
      initialSales={sales}
      invoiceContext={invoiceContext}
      initialPaymentStatus={payment_status}
      initialStatus={status}
    />
  );
}
