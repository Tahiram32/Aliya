import { describe, expect, it } from "vitest";
import {
  buildMutationPrompt,
  deterministicMutation,
  extractJsonObject,
  NeuralPulseError,
} from "@/lib/neural-pulse";
import type { Constellation } from "@/lib/types";

describe("Neural Pulse response parsing", () => {
  it("extracts an object from a fenced JSON response", () => {
    expect(
      extractJsonObject('```json\n{"northStar":"ship evidence"}\n```'),
    ).toEqual({ northStar: "ship evidence" });
  });

  it("extracts an object surrounded by a short narrative", () => {
    expect(extractJsonObject('Result: {"delta":4} End.')).toEqual({
      delta: 4,
    });
  });

  it("fails closed when no structured object is returned", () => {
    expect(() => extractJsonObject("There is no graph here.")).toThrow(
      NeuralPulseError,
    );
  });

  it("keeps evidence-routing prompts inside the API limit", () => {
    const timelines = [1, 2, 3].map((index) => ({
      id: `twin_${"a".repeat(36)}_node_${index}`,
      name: "A future with a deliberately long evocative name",
      archetype: "Signal builder",
      probability: 33,
      signal: "stable" as const,
      thesis: "x".repeat(300),
      futureMemory: "x".repeat(360),
      firstMove: "x".repeat(220),
      risk: "x".repeat(220),
      x: index * 20,
      y: index * 20,
      color: "lime" as const,
    }));
    const constellation: Constellation = {
      id: `twin_${"a".repeat(36)}`,
      visitorId: "b".repeat(36),
      alias: "Nyx",
      objective: "x".repeat(360),
      generatedAt: new Date(0).toISOString(),
      horizonDays: 60,
      northStar: "x".repeat(180),
      fieldNote: "x".repeat(420),
      timelines,
      missions: [1, 2, 3].map((index) => ({
        id: `twin_${"a".repeat(36)}_mission_${index}`,
        title: "x".repeat(100),
        minutes: 20,
        reason: "x".repeat(240),
        proof: "x".repeat(160),
        completed: false,
      })),
      selectedTimelineId: null,
      mode: "neural",
    };

    const checkIn = {
      visitorId: constellation.visitorId,
      constellationId: constellation.id,
      timelineId: timelines[0].id,
      reflection: "x".repeat(500),
      energy: 5 as const,
    };
    const prompt = buildMutationPrompt(constellation, checkIn);
    const fallback = deterministicMutation(constellation, checkIn);

    expect(prompt.length).toBeLessThanOrEqual(2_000);
    expect(fallback.probabilityDeltas.map(({ delta }) => delta)).toEqual([
      6, -1, -1,
    ]);
    expect(fallback.completedMissionId).toBe(constellation.missions[0].id);
  });
});
