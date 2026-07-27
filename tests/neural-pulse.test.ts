import { describe, expect, it } from "vitest";
import {
  buildManifestPrompt,
  buildMutationPrompt,
  deterministicMutation,
  extractJsonObject,
  NeuralPulseError,
} from "@/lib/neural-pulse";
import type { Constellation, Intake } from "@/lib/types";

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
      realitySignatures: timelines.map((timeline, index) => ({
        id: `signature_${index}`,
        timelineId: timeline.id,
        description: "An observable signal appears in the real world.",
        window: (["72h", "7d", "30d"] as const)[index],
        dueAt: new Date(86_400_000 * (index + 3)).toISOString(),
        status: "pending",
        resolvedAt: null,
      })),
      nexusMove: {
        id: "nexus_move",
        title: "Create one shared artifact",
        minutes: 20,
        reason: "The artifact gives every possible future useful evidence.",
        proof: "One timestamped link",
        supportsTimelineIds: timelines.map((timeline) => timeline.id),
        completed: false,
      },
      shadowOrbit: {
        id: "shadow_orbit",
        name: "The Gravity Well",
        archetype: "The self formed by default",
        probability: 18,
        thesis: "Repeated delay quietly becomes the organizing identity.",
        risk: "Planning replaces evidence.",
        disruptionMove: "Make one small irreversible mark.",
        lastObservation: "The hidden path still lacks enough evidence.",
        revealAfter: 3,
        evidenceCount: 0,
        revealed: false,
      },
      evidenceHistory: [],
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
    expect(fallback.shadowDelta).toBe(-2);
  });

  it("keeps manifestation prompts inside the API limit", () => {
    const intake: Intake = {
      visitorId: "d830e52f-d97f-4326-8b86-a8e8b919d281",
      alias: "a".repeat(32),
      objective: "x".repeat(360),
      horizonDays: 90,
      minutesPerDay: 180,
      friction: "overwhelm",
      energyPattern: "unpredictable",
    };

    expect(buildManifestPrompt(intake).length).toBeLessThanOrEqual(2_000);
  });
});
