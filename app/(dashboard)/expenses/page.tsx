import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStoreId, listExpenses } from "@/repositories/expenses.repository";
import { ExpensesView } from "@/features/expenses/expenses-view";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage() {
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);

  if (!storeId) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Join or create a store to view expenses.
      </div>
    );
  }

  const expenses = await listExpenses(supabase, storeId);
  return <ExpensesView initialExpenses={expenses} />;
}
