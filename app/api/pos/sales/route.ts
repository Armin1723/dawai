import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStoreId, recentSales } from "@/repositories/pos.repository";
import { posSaleSchema } from "@/schemas/pos";

export interface CreateSaleResult {
  sale_id: string;
  sale_number: string;
  invoice_id: string;
  invoice_number: string;
  total: number;
  items: number;
}

/** POST /api/pos/sales — atomic checkout. */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }

  const parsed = posSaleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Invalid cart" } },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in first" } },
      { status: 401 }
    );
  }

  // Generated types mark nullable function params as `string`; the DB accepts
  // null for customer/notes/payments, so cast the args object loosely.
  const { data, error } = await supabase.rpc(
    "create_sale",
    {
      p_store_id: storeId,
      p_cashier_id: user.id,
      p_customer_id: body.customer_id ?? null,
      p_items: body.items.map((i) => ({
        medicine_id: i.medicine_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        gst_rate: i.gst_rate,
        discount: i.discount,
      })),
      p_discount: body.discount,
      p_payment_method: body.payment_method,
      p_amount_received: body.amount_received,
      p_notes: body.notes ?? null,
      p_payments:
        body.payments && body.payments.length > 0
          ? body.payments.map((p) => ({ method: p.method, amount: p.amount }))
          : null,
    } as never
  );

  if (error) {
    const msg = error.message.toLowerCase();
    const isStock = msg.includes("insufficient");
    const isCreditLimit = msg.includes("credit limit");
    const isCartEmpty = msg.includes("cart is empty");
    if (isStock || isCreditLimit) {
      return NextResponse.json(
        {
          error: {
            code: isStock ? "INSUFFICIENT_STOCK" : "CREDIT_LIMIT_EXCEEDED",
            message: isStock
              ? "Insufficient stock for one of the items"
              : "This customer has exceeded their credit limit",
          },
        },
        { status: 409 }
      );
    }
    if (isCartEmpty) {
      return NextResponse.json(
        { error: { code: "EMPTY_CART", message: "Cart is empty" } },
        { status: 400 }
      );
    }
    // Internal error: do not leak DB details to the client.
    console.error("[pos/sales] create_sale failed:", error.message);
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Could not complete the sale. Please try again." } },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { data: data as unknown as CreateSaleResult },
    { status: 201 }
  );
}

/** GET /api/pos/sales — recent sales for the POS sidebar. */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }
  const data = await recentSales(supabase, storeId);
  return NextResponse.json({ data });
}
