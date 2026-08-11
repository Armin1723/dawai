import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStoreId, getSaleDetail } from "@/repositories/sales.repository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/sales/[id] — full sale detail with items + payments. */
export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }
  const data = await getSaleDetail(supabase, storeId, id);
  if (!data) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Sale not found" } },
      { status: 404 }
    );
  }
  return NextResponse.json({ data });
}
