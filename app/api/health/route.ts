import { NextResponse } from "next/server";

/** GET /api/health — liveness probe. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "mediflow-ai",
    time: new Date().toISOString(),
    supabaseConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    aiConfigured: Boolean(process.env.OPENROUTER_API_KEY),
  });
}
