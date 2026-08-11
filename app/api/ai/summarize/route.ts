import { NextResponse } from "next/server";
import { z } from "zod";
import { AIService } from "@/services/ai.service";

const bodySchema = z.object({
  metrics: z.record(z.unknown()),
});

/**
 * POST /api/ai/summarize
 * Returns a plain-language summary of the given business metrics.
 * Read-only: the AI never writes data.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid metrics payload" } },
      { status: 400 }
    );
  }

  try {
    const service = AIService.fromEnv();
    const result = await service.summarizeDashboard(parsed.data.metrics);
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("AI summarize failed:", err);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL",
          message:
            "The AI service is unavailable right now. Check that OPENROUTER_API_KEY is configured.",
        },
      },
      { status: 500 }
    );
  }
}
