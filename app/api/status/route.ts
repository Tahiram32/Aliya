import { NextResponse } from "next/server";
import { isNeuralConfigured } from "@/lib/neural-pulse";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      mode: isNeuralConfigured() ? "neural" : "simulation",
      engine: "Evorozen Neural Pulse",
      endpoint: "server-side",
      schemaReady:
        process.env.EVOROZEN_SCHEMA_READY?.toLowerCase() === "true",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
