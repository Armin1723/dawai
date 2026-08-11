import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStoreId } from "@/repositories/purchases.repository";
import { receivePoSchema } from "@/schemas/purchase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** POST /api/purchases/orders/[id]/receive — receive stock against a PO. */
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

  const parsed = receivePoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const { data, error } = await supabase.rpc("receive_purchase_order", {
    p_store_id: storeId,
    p_po_id: id,
    p_items: body.items.map((i) => ({
      purchase_item_id: i.purchase_item_id,
      medicine_id: i.medicine_id,
      received_quantity: i.received_quantity,
      batch_number: i.batch_number,
      expiry_date: i.expiry_date,
      cost_price: i.cost_price,
      selling_price: i.selling_price ?? i.cost_price,
      mrp: i.mrp ?? i.cost_price,
      gst_rate: i.gst_rate,
    })),
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("not found on this order")) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "One of the items doesn't belong to this order" } },
        { status: 404 }
      );
    }
    console.error("[purchases/receive] receive_purchase_order failed:", error.message);
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Could not receive stock. Please try again." } },
      { status: 500 }
    );
  }

  await supabase.rpc("write_audit_log", {
    p_entity: "purchase_order",
    p_entity_id: id,
    p_action: "receive",
    p_after: { status: (data as { status: string }).status },
  });

  return NextResponse.json({ data }, { status: 201 });
}
