import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentStoreId,
  getMedicine,
  listBatches,
} from "@/repositories/inventory.repository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/inventory/medicines/:id/batches — batches (FEFO ordered) for a medicine. */
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }

  const medicine = await getMedicine(supabase, storeId, id);
  if (!medicine) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Medicine not found" } },
      { status: 404 }
    );
  }

  const batches = await listBatches(supabase, id);
  return NextResponse.json({ data: batches });
}
