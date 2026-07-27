import type {
  CheckIn,
  Constellation,
  Friction,
  Intake,
  Mission,
  Timeline,
} from "@/lib/types";

const frictionMoves: Record<Friction, string> = {
  starting: "Open a blank page and make the smallest irreversible mark.",
  consistency: "Anchor the work to a ritual you already perform every day.",
  overwhelm: "Delete every step except the one that creates visible evidence.",
  confidence: "Ship an intentionally small artifact to one trusted person.",
  direction: "Run a 20-minute experiment that makes one option falsifiable.",
};

const frictionRisks: Record<Friction, string> = {
  starting: "Waiting for certainty disguises itself as preparation.",
  consistency: "A heroic first week creates a pace your real life cannot hold.",
  overwhelm: "You optimize the map until the destination disappears.",
  confidence: "Private perfection prevents the feedback that would create skill.",
  direction: "Keeping every door open leaves you standing in the hallway.",
};

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function objectiveNoun(objective: string): string {
  const ignored = new Set([
    "about",
    "after",
    "again",
    "build",
    "create",
    "from",
    "have",
    "into",
    "learn",
    "make",
    "that",
    "their",
    "this",
    "want",
    "with",
  ]);
  const candidate = objective
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .find((word) => word.length > 4 && !ignored.has(word));

  return candidate ?? "new craft";
}

function makeMissions(intake: Intake, noun: string): Mission[] {
  const daily = intake.minutesPerDay;
  return [
    {
      id: "mission-signal",
      title: `Create one visible ${noun} signal`,
      minutes: Math.min(daily, 25),
      reason:
        "A future becomes believable when the present contains physical evidence of it.",
      proof: "One link, file, sketch, or recording",
      completed: false,
    },
    {
      id: "mission-friction",
      title: frictionMoves[intake.friction],
      minutes: Math.min(daily, 20),
      reason: `This directly attacks your declared ${intake.friction} friction instead of adding more planning.`,
      proof: "A timestamped before-and-after note",
      completed: false,
    },
    {
      id: "mission-witness",
      title: "Transmit the signal to one witness",
      minutes: Math.min(daily, 15),
      reason:
        "A private intention is fragile. A witnessed artifact begins to alter identity.",
      proof: "One sent message or public post",
      completed: false,
    },
  ];
}

export function generateSimulationConstellation(
  intake: Intake,
): Constellation {
  const seed = hashString(
    `${intake.objective}:${intake.friction}:${intake.energyPattern}`,
  );
  const noun = objectiveNoun(intake.objective);
  const stableProbability = 58 + (seed % 17);
  const volatileProbability = 30 + ((seed >>> 3) % 19);
  const rareProbability = 9 + ((seed >>> 6) % 14);

  const timelines: Timeline[] = [
    {
      id: "resonant-orbit",
      name: "The Resonant Orbit",
      archetype: "The patient signal-builder",
      probability: stableProbability,
      signal: "stable",
      thesis: `You make ${noun} practice so small and repeatable that identity changes before motivation can object.`,
      futureMemory: `Day ${intake.horizonDays}: you no longer introduce yourself as someone trying. There is a trail of work behind you.`,
      firstMove: frictionMoves[intake.friction],
      risk: frictionRisks[intake.friction],
      x: 71,
      y: 27,
      color: "lime",
    },
    {
      id: "quiet-singularity",
      name: "The Quiet Singularity",
      archetype: "The obsessive deep-diver",
      probability: volatileProbability,
      signal: "volatile",
      thesis: `You protect a narrow daily chamber for ${noun}, trading breadth for unusually fast depth.`,
      futureMemory: `Day ${intake.horizonDays}: one concentrated body of work has become difficult for other people to ignore.`,
      firstMove: `Reserve ${Math.min(intake.minutesPerDay, 45)} uninterrupted minutes at your ${intake.energyPattern} energy peak.`,
      risk:
        "Intensity produces exceptional output, but one disrupted week can collapse the whole orbit.",
      x: 83,
      y: 68,
      color: "violet",
    },
    {
      id: "wild-orbit",
      name: "The Wild Orbit",
      archetype: "The public experimenter",
      probability: rareProbability,
      signal: "rare",
      thesis: `You turn learning ${noun} into a live public experiment and let strangers pull the work somewhere unplanned.`,
      futureMemory: `Day ${intake.horizonDays}: the opportunity you value most came from a person you could not have predicted.`,
      firstMove: `Publish a rough “day zero” artifact before your next ${intake.energyPattern} window ends.`,
      risk:
        "External attention can bend the project toward applause instead of the future you actually wanted.",
      x: 30,
      y: 74,
      color: "coral",
    },
  ];

  return {
    id: `sim_${seed.toString(36)}_${Date.now().toString(36)}`,
    visitorId: intake.visitorId,
    alias: intake.alias,
    objective: intake.objective,
    generatedAt: new Date().toISOString(),
    horizonDays: intake.horizonDays,
    northStar: `Become the person for whom ${noun} is evidence, not aspiration.`,
    fieldNote: `The strongest timeline does not demand a new personality. It changes the environment around your ${intake.friction} friction until motion becomes easier than avoidance.`,
    timelines,
    missions: makeMissions(intake, noun),
    selectedTimelineId: null,
    mode: "simulation",
  };
}

export function evolveSimulationConstellation(
  constellation: Constellation,
  checkIn: CheckIn,
): Constellation {
  const energyDelta = (checkIn.energy - 3) * 2;
  const timelines = constellation.timelines.map((timeline) => {
    const selected = timeline.id === checkIn.timelineId;
    const nextProbability = Math.max(
      1,
      Math.min(99, timeline.probability + (selected ? 5 + energyDelta : -1)),
    );
    return {
      ...timeline,
      probability: nextProbability,
    };
  });

  const firstOpenMission = constellation.missions.findIndex(
    (mission) => !mission.completed,
  );
  const missions = constellation.missions.map((mission, index) =>
    index === firstOpenMission ? { ...mission, completed: true } : mission,
  );

  return {
    ...constellation,
    timelines,
    missions,
    selectedTimelineId: checkIn.timelineId,
    fieldNote: `Signal received: “${checkIn.reflection}” Your chosen future gained probability because observation was converted into evidence.`,
  };
}
