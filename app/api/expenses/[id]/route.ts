import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentStoreId,
  updateExpense,
  deleteExpense,
} from "@/repositories/expenses.repository";
import { expenseFormSchema } from "@/schemas/expense";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** PATCH /api/expenses/[id] — update an expense or recurring template. */
export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
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

  try {
    const data = await updateExpense(supabase, storeId, id, {
      category: body.category,
      description: body.description || null,
      amount: body.amount,
      payment_method: body.payment_method,
      expense_date: body.expense_date,
      is_recurring: body.is_recurring,
      frequency: body.is_recurring ? body.frequency || null : null,
      next_due_date: body.is_recurring ? body.next_due_date || null : null,
    });

    await supabase.rpc("write_audit_log", {
      p_entity: "expense",
      p_entity_id: id,
      p_action: "update",
      p_after: { category: body.category, amount: body.amount },
    });

    return NextResponse.json({ data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    console.error("[expenses] update failed:", msg);
    if (msg.includes("not found")) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Expense not found" } },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Could not update the expense. Please try again." } },
      { status: 500 }
    );
  }
}

/** DELETE /api/expenses/[id] — delete an expense or recurring template. */
export async function DELETE(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }

  try {
    await deleteExpense(supabase, storeId, id);
    await supabase.rpc("write_audit_log", {
      p_entity: "expense",
      p_entity_id: id,
      p_action: "delete",
    });
    return NextResponse.json({ data: { id } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    console.error("[expenses] delete failed:", msg);
    if (msg.includes("not found")) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Expense not found" } },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Could not delete the expense. Please try again." } },
      { status: 500 }
    );
  }
}
