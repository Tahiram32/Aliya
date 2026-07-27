import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { checkInSchema } from "@/lib/contracts";
import {
  evolveNeuralConstellation,
  isNeuralConfigured,
  NeuralPulseError,
} from "@/lib/neural-pulse";
import { consumeRateLimit, requestKey } from "@/lib/rate-limit";
import { ensureNeuralSchemas } from "@/lib/schema-bootstrap";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const rate = consumeRateLimit(`check-in:${requestKey(request)}`, 10);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Signal limit reached. Give the field a moment to settle." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  if (!isNeuralConfigured()) {
    return NextResponse.json(
      {
        error:
          "Persistent check-ins require an Evorozen Neural Pulse connection.",
      },
      { status: 503 },
    );
  }

  try {
    const checkIn = checkInSchema.parse(await request.json());
    await ensureNeuralSchemas();
    const constellation = await evolveNeuralConstellation(checkIn);
    return NextResponse.json(constellation, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: error.issues[0]?.message ?? "The check-in signal is invalid.",
        },
        { status: 400 },
      );
    }
    if (error instanceof NeuralPulseError) {
      return NextResponse.json(
        { error: error.message, traceId: error.traceId },
        { status: error.status && error.status >= 400 ? error.status : 502 },
      );
    }
    console.error("Failed to evolve Aliya constellation:", error);
    return NextResponse.json(
      { error: "The cognitive graph could not absorb this signal." },
      { status: 500 },
    );
  }
}
