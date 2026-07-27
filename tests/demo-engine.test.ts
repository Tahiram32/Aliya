import { describe, expect, it } from "vitest";
import {
  evolveSimulationConstellation,
  generateSimulationConstellation,
} from "@/lib/demo-engine";
import type { Intake } from "@/lib/types";

const intake: Intake = {
  visitorId: "c20f9183-73eb-48ca-8d15-91966ca874e3",
  alias: "Ari",
  objective: "Publish an interactive astronomy learning project",
  horizonDays: 60,
  minutesPerDay: 30,
  friction: "starting",
  energyPattern: "dusk",
};

describe("simulation cognitive graph", () => {
  it("creates three divergent, bounded future nodes", () => {
    const constellation = generateSimulationConstellation(intake);

    expect(constellation.mode).toBe("simulation");
    expect(constellation.timelines).toHaveLength(3);
    expect(new Set(constellation.timelines.map((node) => node.signal))).toEqual(
      new Set(["stable", "volatile", "rare"]),
    );
    expect(
      constellation.timelines.every(
        (node) => node.probability >= 1 && node.probability <= 99,
      ),
    ).toBe(true);
    expect(constellation.missions).toHaveLength(3);
  });

  it("turns a check-in into probability and mission evidence", () => {
    const constellation = generateSimulationConstellation(intake);
    const selected = constellation.timelines[0];
    const evolved = evolveSimulationConstellation(constellation, {
      visitorId: intake.visitorId,
      constellationId: constellation.id,
      timelineId: selected.id,
      reflection: "I published the first interactive star map.",
      energy: 4,
    });

    expect(evolved.selectedTimelineId).toBe(selected.id);
    expect(evolved.timelines[0].probability).toBeGreaterThan(
      selected.probability,
    );
    expect(evolved.missions.some((mission) => mission.completed)).toBe(true);
    expect(evolved.fieldNote).toContain("Signal received");
  });
});
