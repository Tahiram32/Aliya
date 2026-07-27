import { NextResponse } from "next/server";
import {
  isNeuralConfigured,
  NeuralPulseError,
  readNeuralMetrics,
} from "@/lib/neural-pulse";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isNeuralConfigured()) {
    return NextResponse.json(
      {
        explorers: 0,
        constellations: 0,
        checkIns: 0,
        mode: "simulation",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    return NextResponse.json(await readNeuralMetrics(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const traceId =
      error instanceof NeuralPulseError ? error.traceId : undefined;
    console.error("Failed to read Aliya adoption metrics:", error);
    return NextResponse.json(
      { error: "Adoption telemetry is temporarily unavailable.", traceId },
      { status: 502 },
    );
  }
}
