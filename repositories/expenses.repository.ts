type Client = Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>;

import type { PaymentMethod } from "@/types";

export { getCurrentStoreId } from "@/repositories/store.repository";

export interface ExpenseRow {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  payment_method: PaymentMethod;
  expense_date: string;
  paid_by: string | null;
  paid_by_name: string | null;
  is_recurring: boolean;
  frequency: string | null;
  next_due_date: string | null;
  created_at: string;
}

interface ExpenseBase {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  payment_method: PaymentMethod;
  expense_date: string;
  paid_by: string | null;
  is_recurring: boolean;
  frequency: string | null;
  next_due_date: string | null;
  created_at: string;
}

/** List all expenses for the store, newest first, with the recorder's name. */
export async function listExpenses(supabase: Client, storeId: string): Promise<ExpenseRow[]> {
  const { data: expenses } = await supabase
    .from("expenses")
    .select(
      "id, category, description, amount, payment_method, expense_date, paid_by, is_recurring, frequency, next_due_date, created_at"
    )
    .eq("store_id", storeId)
    .order("expense_date", { ascending: false });

  const rows = (expenses ?? []) as unknown as ExpenseBase[];

  const profileIds = [...new Set(rows.map((r) => r.paid_by).filter(Boolean))] as string[];
  const names = new Map<string, string>();
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", profileIds);
    for (const p of (profiles ?? []) as unknown as { id: string; full_name: string | null }[]) {
      names.set(p.id, p.full_name?.trim() || "Staff");
    }
  }

  return rows.map((r) => ({
    ...r,
    paid_by_name: r.paid_by ? names.get(r.paid_by) ?? null : null,
  }));
}

export interface ExpenseInput {
  category: string;
  description?: string | null;
  amount: number;
  payment_method: PaymentMethod;
  expense_date: string;
  is_recurring?: boolean;
  frequency?: string | null;
  next_due_date?: string | null;
}

/** Create an expense row for the store (records who processed it). */
export async function createExpense(
  supabase: Client,
  storeId: string,
  input: ExpenseInput,
  processedBy: string | null
) {
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      store_id: storeId,
      category: input.category,
      description: input.description?.trim() ? input.description : null,
      amount: input.amount,
      payment_method: input.payment_method,
      expense_date: input.expense_date,
      paid_by: processedBy,
      is_recurring: input.is_recurring ?? false,
      frequency: input.is_recurring ? (input.frequency ?? null) : null,
      next_due_date: input.is_recurring ? (input.next_due_date ?? null) : null,
    })
    .select("id, category, amount, expense_date, is_recurring")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/** Update an expense row (store-scoped; 404 when it isn't found). */
export async function updateExpense(
  supabase: Client,
  storeId: string,
  expenseId: string,
  input: ExpenseInput
) {
  const { data, error } = await supabase
    .from("expenses")
    .update({
      category: input.category,
      description: input.description?.trim() ? input.description : null,
      amount: input.amount,
      payment_method: input.payment_method,
      expense_date: input.expense_date,
      is_recurring: input.is_recurring ?? false,
      frequency: input.is_recurring ? (input.frequency ?? null) : null,
      next_due_date: input.is_recurring ? (input.next_due_date ?? null) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", expenseId)
    .eq("store_id", storeId)
    .select("id, category, amount, expense_date, is_recurring")
    .single();

  if (error) throw new Error("Expense not found");
  return data;
}

/** Hard-delete an expense row (store-scoped). */
export async function deleteExpense(supabase: Client, storeId: string, expenseId: string) {
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId).eq("store_id", storeId);
  if (error) throw new Error("Expense not found");
}

export interface GenerateDueResult {
  generated: number;
  expense_ids: string[];
}

/** Instantiate all due recurring-expense templates (atomic RPC). */
export async function generateDueExpenses(
  supabase: Client,
  storeId: string,
  processedBy: string | null
): Promise<GenerateDueResult> {
  const { data, error } = await supabase.rpc("generate_due_expenses", {
    p_store_id: storeId,
    p_processed_by: processedBy,
  } as never);
  if (error) throw new Error(error.message);
  return data as unknown as GenerateDueResult;
}
