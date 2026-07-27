import type {
  BorrowedLight,
  CheckIn,
  Constellation,
  EvidenceDelta,
  Friction,
  Intake,
  Mission,
  NexusMove,
  RealitySignature,
  RealitySignatureStatus,
  RealitySignatureWindow,
  ShadowOrbit,
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
      origin: "native",
    },
    {
      id: "mission-friction",
      title: frictionMoves[intake.friction],
      minutes: Math.min(daily, 20),
      reason: `This directly attacks your declared ${intake.friction} friction instead of adding more planning.`,
      proof: "A timestamped before-and-after note",
      completed: false,
      origin: "native",
    },
    {
      id: "mission-witness",
      title: "Transmit the signal to one witness",
      minutes: Math.min(daily, 15),
      reason:
        "A private intention is fragile. A witnessed artifact begins to alter identity.",
      proof: "One sent message or public post",
      completed: false,
      origin: "native",
    },
  ];
}

function signatureDueAt(
  generatedAt: string,
  window: RealitySignatureWindow,
): string {
  const hours = window === "72h" ? 72 : window === "7d" ? 168 : 720;
  return new Date(new Date(generatedAt).getTime() + hours * 60 * 60 * 1000)
    .toISOString();
}

function makeRealitySignatures(
  twinId: string,
  timelines: Timeline[],
  noun: string,
  generatedAt: string,
): RealitySignature[] {
  const descriptions = [
    `You return to ${noun} twice without needing a new plan.`,
    `You protect one uninterrupted work chamber and leave visible evidence behind.`,
    `Another person responds to an unfinished ${noun} artifact.`,
  ];
  const windows: RealitySignatureWindow[] = ["72h", "7d", "30d"];

  return timelines.map((timeline, index) => ({
    id: `${twinId}_signature_${index + 1}`,
    timelineId: timeline.id,
    description: descriptions[index],
    window: windows[index],
    dueAt: signatureDueAt(generatedAt, windows[index]),
    status: "pending",
    resolvedAt: null,
  }));
}

function makeNexusMove(
  twinId: string,
  timelines: Timeline[],
  intake: Intake,
): NexusMove {
  return {
    id: `${twinId}_nexus`,
    title: frictionMoves[intake.friction],
    minutes: Math.min(intake.minutesPerDay, 20),
    reason:
      "This move creates useful evidence without forcing you to choose one future too early.",
    proof: "One timestamped artifact from the completed action",
    supportsTimelineIds: timelines.map((timeline) => timeline.id),
    completed: false,
  };
}

function makeShadowOrbit(
  twinId: string,
  intake: Intake,
  seed: number,
): ShadowOrbit {
  return {
    id: `${twinId}_shadow`,
    name: "The Gravity Well",
    archetype: "The self formed by default",
    probability: 12 + ((seed >>> 9) % 14),
    thesis: `Your ${intake.friction} friction quietly becomes the organizing force, so preserving every possibility begins to replace choosing one.`,
    risk: frictionRisks[intake.friction],
    disruptionMove: frictionMoves[intake.friction],
    lastObservation:
      "Not enough real evidence exists to resolve this hidden trajectory.",
    revealAfter: 3,
    evidenceCount: 0,
    revealed: false,
  };
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
  const twinId = `sim_${seed.toString(36)}_${Date.now().toString(36)}`;
  const generatedAt = new Date().toISOString();

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
    id: twinId,
    visitorId: intake.visitorId,
    alias: intake.alias,
    objective: intake.objective,
    generatedAt,
    horizonDays: intake.horizonDays,
    northStar: `Become the person for whom ${noun} is evidence, not aspiration.`,
    fieldNote: `The strongest timeline does not demand a new personality. It changes the environment around your ${intake.friction} friction until motion becomes easier than avoidance.`,
    timelines,
    missions: makeMissions(intake, noun),
    realitySignatures: makeRealitySignatures(
      twinId,
      timelines,
      noun,
      generatedAt,
    ),
    nexusMove: makeNexusMove(twinId, timelines, intake),
    shadowOrbit: makeShadowOrbit(twinId, intake, seed),
    evidenceHistory: [],
    selectedTimelineId: null,
    mode: "simulation",
  };
}

export function evolveSimulationConstellation(
  constellation: Constellation,
  checkIn: CheckIn,
): Constellation {
  const energyDelta = (checkIn.energy - 3) * 2;
  const nexusCompleted =
    Boolean(checkIn.nexusMoveId) &&
    checkIn.nexusMoveId === constellation.nexusMove?.id;
  const deltas: EvidenceDelta[] = constellation.timelines.map((timeline) => ({
    nodeId: timeline.id,
    delta:
      timeline.id === checkIn.timelineId
        ? 5 + energyDelta
        : nexusCompleted
          ? 1
          : -1,
    rationale:
      timeline.id === checkIn.timelineId
        ? "The evidence directly supports this future."
        : nexusCompleted
          ? "A Nexus Move preserves momentum across every live future."
          : "Attention committed elsewhere slightly reduces this path.",
  }));
  const timelines = constellation.timelines.map((timeline) => {
    const delta =
      deltas.find((item) => item.nodeId === timeline.id)?.delta ?? 0;
    const nextProbability = Math.max(
      1,
      Math.min(99, timeline.probability + delta),
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
  const createdAt = new Date().toISOString();
  const evidenceCount = (constellation.shadowOrbit?.evidenceCount ?? 0) + 1;
  const shadowDelta =
    checkIn.energy >= 3 && checkIn.reflection.trim().length >= 18 ? -2 : 3;
  const shadowOrbit = constellation.shadowOrbit
    ? {
        ...constellation.shadowOrbit,
        probability: Math.max(
          1,
          Math.min(45, constellation.shadowOrbit.probability + shadowDelta),
        ),
        lastObservation:
          shadowDelta < 0
            ? "Concrete evidence weakened the future formed by delay."
            : "Low-energy evidence left more gravity in the default path.",
        evidenceCount,
        revealed: evidenceCount >= constellation.shadowOrbit.revealAfter,
      }
    : null;

  return {
    ...constellation,
    timelines,
    missions,
    nexusMove: constellation.nexusMove
      ? {
          ...constellation.nexusMove,
          completed: constellation.nexusMove.completed || nexusCompleted,
        }
      : null,
    shadowOrbit,
    evidenceHistory: [
      ...constellation.evidenceHistory,
      {
        id: `signal_${crypto.randomUUID()}`,
        timelineId: checkIn.timelineId,
        reflection: checkIn.reflection,
        energy: checkIn.energy,
        source: "check_in",
        signatureId: null,
        createdAt,
        deltas,
      },
    ],
    selectedTimelineId: checkIn.timelineId,
    fieldNote: `Signal received: “${checkIn.reflection}” Your chosen future gained probability because observation was converted into evidence.`,
  };
}

export function resolveSimulationSignature(
  constellation: Constellation,
  signatureId: string,
  outcome: Exclude<RealitySignatureStatus, "pending">,
): Constellation {
  const signature = constellation.realitySignatures.find(
    (item) => item.id === signatureId,
  );
  if (!signature || signature.status !== "pending") return constellation;

  const delta = outcome === "observed" ? 4 : -4;
  const rationale =
    outcome === "observed"
      ? "Reality produced the observable sign this future expected."
      : "Reality contradicted the observable sign this future expected.";
  const createdAt = new Date().toISOString();

  return {
    ...constellation,
    timelines: constellation.timelines.map((timeline) =>
      timeline.id === signature.timelineId
        ? {
            ...timeline,
            probability: Math.max(
              1,
              Math.min(99, timeline.probability + delta),
            ),
          }
        : timeline,
    ),
    realitySignatures: constellation.realitySignatures.map((item) =>
      item.id === signatureId
        ? { ...item, status: outcome, resolvedAt: createdAt }
        : item,
    ),
    evidenceHistory: [
      ...constellation.evidenceHistory,
      {
        id: `signal_${crypto.randomUUID()}`,
        timelineId: signature.timelineId,
        reflection: `Reality signature ${outcome}: ${signature.description}`,
        energy: 3,
        source: "reality_signature",
        signatureId,
        createdAt,
        deltas: [
          {
            nodeId: signature.timelineId,
            delta,
            rationale,
          },
        ],
      },
    ],
    fieldNote:
      outcome === "observed"
        ? "Reality matched one of the field's observable signatures. That future gained weight, but remains a hypothesis."
        : "Reality contradicted one of the field's observable signatures. Aliya reduced that future instead of defending it.",
  };
}

export function adoptSimulationBorrowedLight(
  constellation: Constellation,
  move: BorrowedLight,
): Constellation {
  return {
    ...constellation,
    missions: [
      ...constellation.missions,
      {
        id: `${constellation.id}_borrowed_${crypto.randomUUID()}`,
        title: move.title,
        minutes: move.minutes,
        reason: move.reason,
        proof: move.proof,
        completed: false,
        origin: "borrowed_light",
      },
    ],
  };
}
