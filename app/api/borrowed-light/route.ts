import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { borrowedLightAdoptionSchema } from "@/lib/contracts";
import {
  adoptNeuralBorrowedLight,
  isNeuralConfigured,
  NeuralPulseError,
  readNeuralBorrowedLight,
} from "@/lib/neural-pulse";
import { consumeRateLimit, requestKey } from "@/lib/rate-limit";
import { ensureNeuralSchemas } from "@/lib/schema-bootstrap";
import type { BorrowedLightField } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const emptyField: BorrowedLightField = {
  unlocked: false,
  contributors: 0,
  requiredContributors: 3,
  suggestions: [],
};

export async function GET() {
  if (!isNeuralConfigured()) {
    return NextResponse.json(emptyField, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    return NextResponse.json(await readNeuralBorrowedLight(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const traceId =
      error instanceof NeuralPulseError ? error.traceId : undefined;
    console.error("Failed to read Aliya Borrowed Light:", error);
    return NextResponse.json(
      { ...emptyField, traceId },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request: Request) {
  const rate = consumeRateLimit(`borrow:${requestKey(request)}`, 8);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Borrowing limit reached. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  if (!isNeuralConfigured()) {
    return NextResponse.json(
      { error: "Borrowed Light requires a persistent Neural Pulse field." },
      { status: 503 },
    );
  }

  try {
    const input = borrowedLightAdoptionSchema.parse(await request.json());
    await ensureNeuralSchemas();
    return NextResponse.json(await adoptNeuralBorrowedLight(input), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid borrowed move." },
        { status: 400 },
      );
    }
    if (error instanceof NeuralPulseError) {
      return NextResponse.json(
        { error: error.message, traceId: error.traceId },
        { status: error.status && error.status >= 400 ? error.status : 502 },
      );
    }
    console.error("Failed to borrow light into Aliya field:", error);
    return NextResponse.json(
      { error: "The borrowed move could not enter this field." },
      { status: 500 },
    );
  }
}
