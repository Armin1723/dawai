import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStoreId, createSaleReturn } from "@/repositories/sales.repository";
import { createSaleReturnSchema } from "@/schemas/sale";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** POST /api/sales/[id]/returns — process a partial or full return + refund. */
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in first" } },
      { status: 401 }
    );
  }

  const parsed = createSaleReturnSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
      { status: 400 }
    );
  }
  const body = parsed.data;

  try {
    const data = await createSaleReturn(supabase, storeId, id, user.id, {
      items: body.items,
      refund_method: body.refund_method,
      refund_note: body.refund_note ?? null,
    });

    await supabase.rpc("write_audit_log", {
      p_entity: "sale",
      p_entity_id: id,
      p_action: "return",
      p_after: {
        returned_items: data.returned_items,
        refund_amount: data.refund_amount,
        refund_method: body.refund_method,
      },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (msg.includes("sale not found")) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Sale not found" } },
        { status: 404 }
      );
    }
    if (msg.includes("only completed sales")) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "This sale has already been returned or voided" } },
        { status: 409 }
      );
    }
    if (msg.includes("return quantity exceeds")) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Return quantity exceeds the quantity sold for one or more items" } },
        { status: 409 }
      );
    }
    if (msg.includes("sale item not found")) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "One or more returned items do not belong to this sale" } },
        { status: 400 }
      );
    }
    if (msg.includes("nothing to return")) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Select at least one item to return" } },
        { status: 400 }
      );
    }
    if (msg.includes("refund amount exceeds")) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "The refund amount exceeds the sale total" } },
        { status: 409 }
      );
    }
    console.error("[sales/returns] create_sale_return failed:", msg);
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Could not process the return. Please try again." } },
      { status: 500 }
    );
  }
}
