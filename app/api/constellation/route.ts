import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import {
  isNeuralConfigured,
  NeuralPulseError,
  readNeuralConstellation,
} from "@/lib/neural-pulse";
import { consumeRateLimit, requestKey } from "@/lib/rate-limit";

const querySchema = z.object({
  visitorId: z.string().uuid(),
  twinId: z.string().min(8).max(120),
});

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rate = consumeRateLimit(`read:${requestKey(request)}`, 20);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Read limit reached." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  if (!isNeuralConfigured()) {
    return NextResponse.json(
      { error: "Neural Pulse is not connected." },
      { status: 503 },
    );
  }

  try {
    const url = new URL(request.url);
    const input = querySchema.parse({
      visitorId: url.searchParams.get("visitorId"),
      twinId: url.searchParams.get("twinId"),
    });
    const constellation = await readNeuralConstellation(
      input.visitorId,
      input.twinId,
    );
    if (!constellation) {
      return NextResponse.json(
        { error: "Cognitive twin not found." },
        { status: 404 },
      );
    }
    return NextResponse.json(constellation, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid cognitive twin locator." },
        { status: 400 },
      );
    }
    if (error instanceof NeuralPulseError) {
      return NextResponse.json(
        { error: error.message, traceId: error.traceId },
        { status: error.status && error.status >= 400 ? error.status : 502 },
      );
    }
    console.error("Failed to retrieve Aliya constellation:", error);
    return NextResponse.json(
      { error: "The cognitive twin could not be retrieved." },
      { status: 500 },
    );
  }
}
