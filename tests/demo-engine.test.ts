import { describe, expect, it } from "vitest";
import {
  evolveSimulationConstellation,
  generateSimulationConstellation,
  resolveSimulationSignature,
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
    expect(constellation.realitySignatures).toHaveLength(3);
    expect(
      new Set(
        constellation.realitySignatures.map((signature) => signature.window),
      ),
    ).toEqual(new Set(["72h", "7d", "30d"]));
    expect(constellation.nexusMove?.supportsTimelineIds).toHaveLength(3);
    expect(constellation.shadowOrbit).toMatchObject({
      revealed: false,
      evidenceCount: 0,
      revealAfter: 3,
    });
    expect(constellation.evidenceHistory).toEqual([]);
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
    expect(evolved.evidenceHistory).toHaveLength(1);
    expect(evolved.fieldNote).toContain("Signal received");
  });

  it("lets one Nexus Move strengthen all three possible selves", () => {
    const constellation = generateSimulationConstellation(intake);
    const selected = constellation.timelines[0];
    const evolved = evolveSimulationConstellation(constellation, {
      visitorId: intake.visitorId,
      constellationId: constellation.id,
      timelineId: selected.id,
      reflection: "I made the shared artifact and saved its timestamped link.",
      energy: 4,
      nexusMoveId: constellation.nexusMove?.id,
    });

    expect(evolved.nexusMove?.completed).toBe(true);
    for (const timeline of evolved.timelines) {
      const original = constellation.timelines.find(
        (candidate) => candidate.id === timeline.id,
      );
      expect(timeline.probability).toBeGreaterThan(original?.probability ?? 0);
    }
  });

  it("reveals the Shadow Orbit only after three evidence signals", () => {
    let constellation = generateSimulationConstellation(intake);
    const timelineId = constellation.timelines[0].id;

    for (let index = 0; index < 2; index += 1) {
      constellation = evolveSimulationConstellation(constellation, {
        visitorId: intake.visitorId,
        constellationId: constellation.id,
        timelineId,
        reflection: `I created observable artifact number ${index + 1}.`,
        energy: 4,
      });
      expect(constellation.shadowOrbit?.revealed).toBe(false);
    }

    constellation = evolveSimulationConstellation(constellation, {
      visitorId: intake.visitorId,
      constellationId: constellation.id,
      timelineId,
      reflection: "I created observable artifact number 3.",
      energy: 4,
    });

    expect(constellation.shadowOrbit).toMatchObject({
      revealed: true,
      evidenceCount: 3,
    });
  });

  it("calibrates a future against a reality signature and records rewind data", () => {
    const constellation = generateSimulationConstellation(intake);
    const signature = constellation.realitySignatures[0];
    const before = constellation.timelines.find(
      (timeline) => timeline.id === signature.timelineId,
    )?.probability;
    const evolved = resolveSimulationSignature(
      constellation,
      signature.id,
      "contradicted",
    );
    const after = evolved.timelines.find(
      (timeline) => timeline.id === signature.timelineId,
    )?.probability;

    expect(evolved.realitySignatures[0].status).toBe("contradicted");
    expect(after).toBe((before ?? 0) - 4);
    expect(evolved.evidenceHistory.at(-1)).toMatchObject({
      source: "reality_signature",
      signatureId: signature.id,
      deltas: [{ nodeId: signature.timelineId, delta: -4 }],
    });
  });
});
