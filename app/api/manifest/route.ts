import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { intakeSchema } from "@/lib/contracts";
import { generateSimulationConstellation } from "@/lib/demo-engine";
import {
  generateNeuralConstellation,
  isNeuralConfigured,
  NeuralPulseError,
} from "@/lib/neural-pulse";
import { consumeRateLimit, requestKey } from "@/lib/rate-limit";
import { ensureNeuralSchemas } from "@/lib/schema-bootstrap";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const rate = consumeRateLimit(`manifest:${requestKey(request)}`, 5);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "The observatory is cooling down. Try again in a moment." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  try {
    const intake = intakeSchema.parse(await request.json());

    if (!isNeuralConfigured()) {
      return NextResponse.json(generateSimulationConstellation(intake), {
        headers: { "Cache-Control": "no-store" },
      });
    }

    await ensureNeuralSchemas();
    const constellation = await generateNeuralConstellation(intake);
    return NextResponse.json(constellation, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: error.issues[0]?.message ?? "The intake signal is invalid.",
        },
        { status: 400 },
      );
    }
    if (error instanceof NeuralPulseError) {
      return NextResponse.json(
        {
          error: error.message,
          traceId: error.traceId,
        },
        { status: error.status && error.status >= 400 ? error.status : 502 },
      );
    }
    console.error("Failed to generate Aliya constellation:", error);
    return NextResponse.json(
      { error: "The possibility field could not be generated." },
      { status: 500 },
    );
  }
}
