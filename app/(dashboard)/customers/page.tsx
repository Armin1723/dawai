import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStoreId, listCustomers } from "@/repositories/customers.repository";
import { CustomersView } from "@/features/customers/customers-view";

export const metadata: Metadata = { title: "Customers" };

interface CustomersPageProps {
  searchParams: Promise<{ customer?: string }>;
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const { customer } = await searchParams;

  let initialCustomers: Awaited<ReturnType<typeof listCustomers>> = [];
  try {
    const supabase = await createSupabaseServerClient();
    const storeId = await getCurrentStoreId(supabase);
    if (storeId) {
      initialCustomers = await listCustomers(supabase, storeId);
    }
  } catch {
    // Shell still renders with an empty list if Supabase isn't configured yet.
  }

  return <CustomersView initialCustomers={initialCustomers} focusCustomerId={customer} />;
}
