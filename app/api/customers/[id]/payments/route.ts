import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentStoreId,
  recordCustomerPayment,
} from "@/repositories/customers.repository";
import { recordCustomerPaymentSchema } from "@/schemas/customer";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** POST /api/customers/[id]/payments — record a payment against the customer's dues. */
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

  const parsed = recordCustomerPaymentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
      { status: 400 }
    );
  }

  try {
    const data = await recordCustomerPayment(supabase, storeId, id, parsed.data);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (msg.includes("not found")) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Customer not found" } },
        { status: 404 }
      );
    }
    if (msg.includes("outstanding") || msg.includes("exceeds")) {
      return NextResponse.json(
        { error: { code: "PAYMENT_EXCEEDS_BALANCE", message: err instanceof Error ? err.message : "Payment exceeds balance" } },
        { status: 409 }
      );
    }
    console.error("[customers/payments] record_customer_payment failed:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Could not record the payment. Please try again." } },
      { status: 500 }
    );
  }
}
