import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentStoreId,
  recordSupplierPayment,
} from "@/repositories/purchases.repository";
import { recordPaymentSchema } from "@/schemas/purchase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** POST /api/purchases/orders/[id]/payments — record a payment against a PO. */
export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }

  const parsed = recordPaymentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
      { status: 400 }
    );
  }
  const body = parsed.data;

  try {
    const data = await recordSupplierPayment(supabase, storeId, id, {
      amount: body.amount,
      method: body.method,
      reference: body.reference ?? null,
      notes: body.notes ?? null,
    });

    await supabase.rpc("write_audit_log", {
      p_entity: "purchase_order",
      p_entity_id: id,
      p_action: "payment",
      p_after: { amount: body.amount, method: body.method },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (msg.includes("exceeds the outstanding balance")) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Payment exceeds the outstanding balance for this order" } },
        { status: 409 }
      );
    }
    if (msg.includes("cancelled")) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Cannot record a payment against a cancelled order" } },
        { status: 409 }
      );
    }
    if (msg.includes("not found")) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Purchase order not found" } },
        { status: 404 }
      );
    }
    console.error("[purchases/payments] record_supplier_payment failed:", msg);
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Could not record the payment. Please try again." } },
      { status: 500 }
    );
  }
}
