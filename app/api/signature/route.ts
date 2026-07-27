import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { signatureResolutionSchema } from "@/lib/contracts";
import {
  isNeuralConfigured,
  NeuralPulseError,
  resolveNeuralSignature,
} from "@/lib/neural-pulse";
import { consumeRateLimit, requestKey } from "@/lib/rate-limit";
import { ensureNeuralSchemas } from "@/lib/schema-bootstrap";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const rate = consumeRateLimit(`signature:${requestKey(request)}`, 12);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Reality calibration limit reached. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  if (!isNeuralConfigured()) {
    return NextResponse.json(
      { error: "Persistent reality signatures require Neural Pulse." },
      { status: 503 },
    );
  }

  try {
    const input = signatureResolutionSchema.parse(await request.json());
    await ensureNeuralSchemas();
    return NextResponse.json(await resolveNeuralSignature(input), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid signature outcome." },
        { status: 400 },
      );
    }
    if (error instanceof NeuralPulseError) {
      return NextResponse.json(
        { error: error.message, traceId: error.traceId },
        { status: error.status && error.status >= 400 ? error.status : 502 },
      );
    }
    console.error("Failed to resolve Aliya reality signature:", error);
    return NextResponse.json(
      { error: "Reality could not be written back to the field." },
      { status: 500 },
    );
  }
}
