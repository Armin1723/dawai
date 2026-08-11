import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentStoreId,
  listExpenses,
  createExpense,
} from "@/repositories/expenses.repository";
import { expenseFormSchema } from "@/schemas/expense";

/** GET /api/expenses — all expenses for the store (newest first). */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }
  const data = await listExpenses(supabase, storeId);
  return NextResponse.json({ data });
}

/** POST /api/expenses — record a new expense (or recurring template). */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }

  const parsed = expenseFormSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    const data = await createExpense(supabase, storeId, {
      category: body.category,
      description: body.description || null,
      amount: body.amount,
      payment_method: body.payment_method,
      expense_date: body.expense_date,
      is_recurring: body.is_recurring,
      frequency: body.is_recurring ? body.frequency || null : null,
      next_due_date: body.is_recurring ? body.next_due_date || null : null,
    }, user?.id ?? null);

    await supabase.rpc("write_audit_log", {
      p_entity: "expense",
      p_entity_id: data.id,
      p_action: body.is_recurring ? "create_recurring" : "create",
      p_after: {
        category: body.category,
        amount: body.amount,
        expense_date: body.expense_date,
        is_recurring: body.is_recurring,
      },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[expenses] create failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Could not record the expense. Please try again." } },
      { status: 500 }
    );
  }
}
