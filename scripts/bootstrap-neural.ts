import dotenv from "dotenv";
import { ensureNeuralSchemas } from "../lib/schema-bootstrap";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
  if (!process.env.EVOROZEN_API_KEY?.trim()) {
    throw new Error(
      "EVOROZEN_API_KEY is required. Copy .env.example to .env.local first.",
    );
  }

  await ensureNeuralSchemas({ force: true });
  console.log(
    "Aliya LivingDNA registered: twins, future nodes, causal edges, identity signals, missions, and product events.",
  );
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Neural bootstrap failed.",
  );
  process.exitCode = 1;
});
