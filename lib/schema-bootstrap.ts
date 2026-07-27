import { neuralRequest } from "@/lib/neural-pulse";

let bootstrapPromise: Promise<void> | null = null;

export function ensureNeuralSchemas(options?: { force?: boolean }): Promise<void> {
  if (
    !options?.force &&
    process.env.EVOROZEN_SCHEMA_READY?.toLowerCase() === "true"
  ) {
    return Promise.resolve();
  }

  if (!bootstrapPromise) {
    bootstrapPromise = neuralRequest({
      action_type: "create_schema",
      prompt:
        "Register Aliya's cognitive graph, evidence, mission, and product telemetry tables",
      data_payload: {
        tables: [
          {
            name: "aliya_twins",
            columns: [
              { name: "twin_id", type: "text", primary: true },
              { name: "visitor_id", type: "text" },
              { name: "alias", type: "text" },
              { name: "objective", type: "text" },
              { name: "horizon_days", type: "number" },
              { name: "minutes_per_day", type: "number" },
              { name: "friction", type: "text" },
              { name: "energy_pattern", type: "text" },
              { name: "north_star", type: "text" },
              { name: "field_note", type: "text" },
              { name: "selected_node_id", type: "text" },
              { name: "created_at", type: "text" },
              { name: "updated_at", type: "text" },
            ],
          },
          {
            name: "aliya_future_nodes",
            columns: [
              { name: "node_id", type: "text", primary: true },
              { name: "twin_id", type: "text" },
              { name: "name", type: "text" },
              { name: "archetype", type: "text" },
              { name: "probability", type: "number" },
              { name: "signal", type: "text" },
              { name: "thesis", type: "text" },
              { name: "future_memory", type: "text" },
              { name: "first_move", type: "text" },
              { name: "risk", type: "text" },
              { name: "position_x", type: "number" },
              { name: "position_y", type: "number" },
              { name: "color", type: "text" },
              { name: "created_at", type: "text" },
              { name: "updated_at", type: "text" },
            ],
          },
          {
            name: "aliya_missions",
            columns: [
              { name: "mission_id", type: "text", primary: true },
              { name: "twin_id", type: "text" },
              { name: "node_id", type: "text" },
              { name: "title", type: "text" },
              { name: "minutes", type: "number" },
              { name: "reason", type: "text" },
              { name: "proof", type: "text" },
              { name: "status", type: "text" },
              { name: "created_at", type: "text" },
              { name: "completed_at", type: "text" },
            ],
          },
          {
            name: "aliya_identity_signals",
            columns: [
              { name: "signal_id", type: "text", primary: true },
              { name: "twin_id", type: "text" },
              { name: "node_id", type: "text" },
              { name: "reflection", type: "text" },
              { name: "energy", type: "number" },
              { name: "effect", type: "number" },
              { name: "created_at", type: "text" },
            ],
          },
          {
            name: "aliya_causal_edges",
            columns: [
              { name: "edge_id", type: "text", primary: true },
              { name: "twin_id", type: "text" },
              { name: "signal_id", type: "text" },
              { name: "node_id", type: "text" },
              { name: "delta", type: "number" },
              { name: "rationale", type: "text" },
              { name: "created_at", type: "text" },
            ],
          },
          {
            name: "aliya_product_events",
            columns: [
              { name: "event_id", type: "uuid", primary: true },
              { name: "visitor_id", type: "text" },
              { name: "event_type", type: "text" },
              { name: "twin_id", type: "text" },
              { name: "created_at", type: "text" },
            ],
          },
        ],
      },
    })
      .then(() => undefined)
      .catch((error) => {
        bootstrapPromise = null;
        throw error;
      });
  }

  return bootstrapPromise;
}
