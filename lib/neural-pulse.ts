import { z } from "zod";
import type {
  BorrowedLightField,
  CheckIn,
  Constellation,
  EvidenceDelta,
  EvidenceMoment,
  Intake,
  Mission,
  NexusMove,
  PulseMetrics,
  RealitySignature,
  RealitySignatureWindow,
  ShadowOrbit,
  SignatureResolution,
  Timeline,
} from "@/lib/types";
import {
  neuralConstellationSchema,
  neuralMutationSchema,
  nexusMoveSchema,
  realitySignatureSchema,
  shadowOrbitSchema,
  type NeuralConstellationInput,
} from "@/lib/contracts";
import { generateSimulationConstellation } from "@/lib/demo-engine";
import {
  aggregateBorrowedLight,
  borrowedLightByKey,
  borrowedLightForTimeline,
} from "@/lib/borrowed-light";

const DEFAULT_ENDPOINT = "https://pulse.evorozen.com/api/neural";

type ActionType =
  | "create_schema"
  | "insert_data"
  | "select_data"
  | "update_data"
  | "delete_data"
  | "chat";

interface NeuralRequest {
  action_type: ActionType;
  prompt?: string;
  data_payload?: Record<string, unknown>;
}

interface NeuralResponse {
  response?: string;
  traceId?: string;
  trace_id?: string;
  data?: unknown[];
  row?: Record<string, unknown>;
  [key: string]: unknown;
}

type ProductEvent =
  | "constellation_created"
  | "check_in"
  | "signature_resolved"
  | "borrowed_light_adopted";

export class NeuralPulseError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly traceId?: string,
  ) {
    super(message);
    this.name = "NeuralPulseError";
  }
}

function isSecurityPolicyBlock(error: unknown): error is NeuralPulseError {
  return (
    error instanceof NeuralPulseError &&
    error.status === 400 &&
    error.message.toLowerCase().includes("security policy")
  );
}

export function isNeuralConfigured(): boolean {
  return Boolean(process.env.EVOROZEN_API_KEY?.trim());
}

export async function neuralRequest(
  body: NeuralRequest,
): Promise<NeuralResponse> {
  const apiKey = process.env.EVOROZEN_API_KEY?.trim();
  if (!apiKey) {
    throw new NeuralPulseError("EVOROZEN_API_KEY is not configured.");
  }

  const endpoint = process.env.EVOROZEN_API_URL?.trim() || DEFAULT_ENDPOINT;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });

  const rawPayload = (await response.json().catch(() => ({}))) as NeuralResponse;
  const payload: NeuralResponse = {
    ...rawPayload,
    traceId: rawPayload.traceId ?? rawPayload.trace_id,
  };

  if (!response.ok) {
    const detail =
      typeof payload.error === "string"
        ? payload.error
        : `Neural Pulse returned HTTP ${response.status}.`;
    throw new NeuralPulseError(detail, response.status, payload.traceId);
  }

  return payload;
}

export function extractJsonObject(value: string): unknown {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? value;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end <= start) {
    throw new NeuralPulseError(
      "Neural Pulse did not return a JSON object for the constellation.",
    );
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    throw new NeuralPulseError(
      "Neural Pulse returned an unreadable constellation payload.",
    );
  }
}

function timelineCoordinates(index: number) {
  return (
    [
      { x: 72, y: 25, color: "lime" as const },
      { x: 82, y: 70, color: "violet" as const },
      { x: 28, y: 73, color: "coral" as const },
    ][index] ?? { x: 50, y: 50, color: "lime" as const }
  );
}

function signatureDueAt(
  createdAt: string,
  window: RealitySignatureWindow,
): string {
  const hours = window === "72h" ? 72 : window === "7d" ? 168 : 720;
  return new Date(new Date(createdAt).getTime() + hours * 60 * 60 * 1000)
    .toISOString();
}

export function buildManifestPrompt(intake: Intake): string {
  return `Create a grounded possible-self model for a student. Produce exactly 3 divergent ${intake.horizonDays}-day futures that fit ${intake.minutesPerDay} minutes/day. No diagnosis, certainty, or supernatural claims.

PROFILE:${JSON.stringify({
    alias: intake.alias,
    objective: intake.objective,
    friction: intake.friction,
    energy: intake.energyPattern,
  })}

Return only JSON:
{"northStar":"identity direction","fieldNote":"causal observation","timelines":[{"name":"2-4 words","archetype":"short identity","probability":50,"signal":"stable|volatile|rare","thesis":"how it forms","futureMemory":"grounded memory from day ${intake.horizonDays}","firstMove":"action today","risk":"unique failure mode"}],"missions":[{"title":"action","minutes":20,"reason":"why it matters","proof":"observable proof"}],"realitySignatures":[{"timelineIndex":0,"description":"falsifiable observable sign","window":"72h"}],"nexusMove":{"title":"one action useful to all 3 futures","minutes":20,"reason":"cross-future leverage","proof":"observable proof"},"shadowOrbit":{"name":"2-4 words","archetype":"identity formed by default","probability":15,"thesis":"how repeated friction forms it","risk":"cost of inertia","disruptionMove":"small action that weakens it"}}

Rules: timelines=3 with one stable, volatile, rare. missions=3-5. realitySignatures=3 using indices 0,1,2 once each and windows 72h,7d,30d once each. Signatures must be observable in real life. Shadow probability must be 1-45.`;
}

function fallbackNeuralInput(intake: Intake): NeuralConstellationInput {
  const fallback = generateSimulationConstellation(intake);
  const nexusMove = fallback.nexusMove;
  const shadowOrbit = fallback.shadowOrbit;

  if (!nexusMove || !shadowOrbit) {
    throw new NeuralPulseError("The local temporal model is incomplete.");
  }

  return {
    northStar: fallback.northStar,
    fieldNote: fallback.fieldNote,
    timelines: fallback.timelines.map(
      ({
        name,
        archetype,
        probability,
        signal,
        thesis,
        futureMemory,
        firstMove,
        risk,
      }) => ({
        name,
        archetype,
        probability,
        signal,
        thesis,
        futureMemory,
        firstMove,
        risk,
      }),
    ),
    missions: fallback.missions.map(({ title, minutes, reason, proof }) => ({
      title,
      minutes,
      reason,
      proof,
    })),
    realitySignatures: fallback.realitySignatures.map((signature, index) => ({
      timelineIndex: index,
      description: signature.description,
      window: signature.window,
    })),
    nexusMove: {
      title: nexusMove.title,
      minutes: nexusMove.minutes,
      reason: nexusMove.reason,
      proof: nexusMove.proof,
    },
    shadowOrbit: {
      name: shadowOrbit.name,
      archetype: shadowOrbit.archetype,
      probability: shadowOrbit.probability,
      thesis: shadowOrbit.thesis,
      risk: shadowOrbit.risk,
      disruptionMove: shadowOrbit.disruptionMove,
    },
  };
}

export async function generateNeuralConstellation(
  intake: Intake,
): Promise<Constellation> {
  let parsed: NeuralConstellationInput;
  let routingTraceId: string | undefined;

  try {
    const generated = await neuralRequest({
      action_type: "chat",
      prompt: buildManifestPrompt(intake),
    });
    if (!generated.response) {
      throw new NeuralPulseError(
        "Neural Pulse returned no cognitive simulation.",
        undefined,
        generated.traceId,
      );
    }
    parsed = neuralConstellationSchema.parse(
      extractJsonObject(generated.response),
    ) as NeuralConstellationInput;
    routingTraceId = generated.traceId;
  } catch (error) {
    if (!isSecurityPolicyBlock(error)) throw error;
    parsed = fallbackNeuralInput(intake);
    routingTraceId = error.traceId;
  }

  const twinId = `twin_${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();
  const timelines: Timeline[] = parsed.timelines.map((timeline, index) => ({
    ...timeline,
    id: `${twinId}_node_${index + 1}`,
    ...timelineCoordinates(index),
  }));
  const realitySignatures: RealitySignature[] =
    parsed.realitySignatures.map((signature, index) => {
      const timeline =
        timelines[signature.timelineIndex] ?? timelines[index] ?? timelines[0];
      if (!timeline) {
        throw new NeuralPulseError("Neural Pulse returned no future nodes.");
      }
      return {
        id: `${twinId}_signature_${index + 1}`,
        timelineId: timeline.id,
        description: signature.description,
        window: signature.window,
        dueAt: signatureDueAt(createdAt, signature.window),
        status: "pending",
        resolvedAt: null,
      };
    });
  const nexusMove: NexusMove = {
    id: `${twinId}_nexus`,
    ...parsed.nexusMove,
    supportsTimelineIds: timelines.map((timeline) => timeline.id),
    completed: false,
  };
  const shadowOrbit: ShadowOrbit = {
    id: `${twinId}_shadow`,
    ...parsed.shadowOrbit,
    lastObservation:
      "Not enough real evidence exists to resolve this hidden trajectory.",
    revealAfter: 3,
    evidenceCount: 0,
    revealed: false,
  };

  const constellation: Constellation = {
    id: twinId,
    visitorId: intake.visitorId,
    alias: intake.alias,
    objective: intake.objective,
    generatedAt: createdAt,
    horizonDays: intake.horizonDays,
    northStar: parsed.northStar,
    fieldNote: parsed.fieldNote,
    timelines,
    missions: parsed.missions.map((mission, index) => ({
      ...mission,
      id: `${twinId}_mission_${index + 1}`,
      completed: false,
      origin: "native",
    })),
    realitySignatures,
    nexusMove,
    shadowOrbit,
    evidenceHistory: [],
    selectedTimelineId: null,
    mode: "neural",
    traceId: routingTraceId,
  };

  await neuralRequest({
    action_type: "insert_data",
    prompt: "Create the root record for an Aliya cognitive twin",
    data_payload: {
      table: "aliya_twins",
      record: {
        twin_id: twinId,
        visitor_id: intake.visitorId,
        alias: intake.alias,
        objective: intake.objective,
        horizon_days: intake.horizonDays,
        minutes_per_day: intake.minutesPerDay,
        friction: intake.friction,
        energy_pattern: intake.energyPattern,
        north_star: constellation.northStar,
        field_note: constellation.fieldNote,
        selected_node_id: "",
        created_at: createdAt,
        updated_at: createdAt,
      },
    },
  });

  for (const timeline of constellation.timelines) {
    await insertFutureNode(twinId, timeline, createdAt);
  }
  for (const mission of constellation.missions) {
    await insertMission(twinId, "", mission, createdAt);
  }
  await insertTemporalArtifacts(constellation, createdAt);
  await recordNeuralEvent({
    visitorId: intake.visitorId,
    eventType: "constellation_created",
    twinId,
  });

  return constellation;
}

async function insertFutureNode(
  twinId: string,
  timeline: Timeline,
  createdAt: string,
): Promise<void> {
  await neuralRequest({
    action_type: "insert_data",
    prompt: "Add one divergent future node to an Aliya cognitive graph",
    data_payload: {
      table: "aliya_future_nodes",
      record: {
        node_id: timeline.id,
        twin_id: twinId,
        name: timeline.name,
        archetype: timeline.archetype,
        probability: timeline.probability,
        signal: timeline.signal,
        thesis: timeline.thesis,
        future_memory: timeline.futureMemory,
        first_move: timeline.firstMove,
        risk: timeline.risk,
        position_x: timeline.x,
        position_y: timeline.y,
        color: timeline.color,
        created_at: createdAt,
        updated_at: createdAt,
      },
    },
  });
}

async function insertMission(
  twinId: string,
  nodeId: string,
  mission: Mission,
  createdAt: string,
): Promise<void> {
  await neuralRequest({
    action_type: "insert_data",
    prompt: "Attach an evidence-producing mission to an Aliya cognitive twin",
    data_payload: {
      table: "aliya_missions",
      record: {
        mission_id: mission.id,
        twin_id: twinId,
        node_id: nodeId,
        title: mission.title,
        minutes: mission.minutes,
        reason: mission.reason,
        proof: mission.proof,
        status: mission.completed ? "completed" : "open",
        origin: mission.origin ?? "native",
        created_at: createdAt,
        completed_at: "",
      },
    },
  });
}

async function insertTemporalArtifacts(
  constellation: Constellation,
  createdAt: string,
): Promise<void> {
  await neuralRequest({
    action_type: "insert_data",
    prompt:
      "Store Aliya reality signatures, Nexus Move, and hidden Shadow Orbit",
    data_payload: {
      table: "aliya_temporal_artifacts",
      record: {
        artifact_id: `${constellation.id}_temporal`,
        twin_id: constellation.id,
        reality_signatures: JSON.stringify(constellation.realitySignatures),
        nexus_move: JSON.stringify(constellation.nexusMove),
        shadow_orbit: JSON.stringify(constellation.shadowOrbit),
        created_at: createdAt,
        updated_at: createdAt,
      },
    },
  });
}

async function updateTemporalArtifacts(
  constellation: Constellation,
  updatedAt: string,
): Promise<void> {
  if (
    !constellation.nexusMove &&
    !constellation.shadowOrbit &&
    constellation.realitySignatures.length === 0
  ) {
    return;
  }

  await neuralRequest({
    action_type: "update_data",
    prompt: "Update Aliya's living temporal artifacts",
    data_payload: {
      table: "aliya_temporal_artifacts",
      where: {
        twin_id: constellation.id,
        artifact_id: `${constellation.id}_temporal`,
      },
      changes: {
        reality_signatures: JSON.stringify(constellation.realitySignatures),
        nexus_move: JSON.stringify(constellation.nexusMove),
        shadow_orbit: JSON.stringify(constellation.shadowOrbit),
        updated_at: updatedAt,
      },
    },
  });
}

export async function recordNeuralEvent(input: {
  visitorId: string;
  eventType: ProductEvent;
  twinId: string;
}): Promise<void> {
  await neuralRequest({
    action_type: "insert_data",
    prompt: "Record an anonymous Aliya product event",
    data_payload: {
      table: "aliya_product_events",
      record: {
        event_id: crypto.randomUUID(),
        visitor_id: input.visitorId,
        event_type: input.eventType,
        twin_id: input.twinId,
        created_at: new Date().toISOString(),
      },
    },
  });
}

async function selectRows(
  table: string,
  where: Record<string, unknown> | undefined,
  prompt: string,
): Promise<Record<string, unknown>[]> {
  const response = await neuralRequest({
    action_type: "select_data",
    prompt,
    data_payload: {
      table,
      ...(where ? { where } : {}),
    },
  });

  return Array.isArray(response.data)
    ? response.data.filter(
        (row): row is Record<string, unknown> =>
          Boolean(row) && typeof row === "object",
      )
    : [];
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function numberValue(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseStored<T>(value: unknown, schema: z.ZodType<T>): T | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const result = schema.safeParse(JSON.parse(value));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function rowToTimeline(row: Record<string, unknown>): Timeline | null {
  const id = stringValue(row.node_id);
  if (!id) return null;
  const signalValue = stringValue(row.signal);
  const signal =
    signalValue === "volatile" || signalValue === "rare"
      ? signalValue
      : "stable";
  const colorValue = stringValue(row.color);
  const color =
    colorValue === "violet" || colorValue === "coral" ? colorValue : "lime";

  return {
    id,
    name: stringValue(row.name),
    archetype: stringValue(row.archetype),
    probability: numberValue(row.probability),
    signal,
    thesis: stringValue(row.thesis),
    futureMemory: stringValue(row.future_memory),
    firstMove: stringValue(row.first_move),
    risk: stringValue(row.risk),
    x: numberValue(row.position_x),
    y: numberValue(row.position_y),
    color,
  };
}

function rowToMission(row: Record<string, unknown>): Mission | null {
  const id = stringValue(row.mission_id);
  if (!id) return null;
  return {
    id,
    title: stringValue(row.title),
    minutes: numberValue(row.minutes),
    reason: stringValue(row.reason),
    proof: stringValue(row.proof),
    completed: stringValue(row.status) === "completed",
    origin:
      stringValue(row.origin) === "borrowed_light"
        ? "borrowed_light"
        : "native",
  };
}

function rowsToEvidenceHistory(
  signalRows: Record<string, unknown>[],
  edgeRows: Record<string, unknown>[],
): EvidenceMoment[] {
  const edgesBySignal = new Map<string, EvidenceDelta[]>();
  for (const row of edgeRows) {
    const signalId = stringValue(row.signal_id);
    const nodeId = stringValue(row.node_id);
    if (!signalId || !nodeId) continue;
    const deltas = edgesBySignal.get(signalId) ?? [];
    deltas.push({
      nodeId,
      delta: numberValue(row.delta),
      rationale: stringValue(row.rationale),
    });
    edgesBySignal.set(signalId, deltas);
  }

  return signalRows
    .map((row): EvidenceMoment | null => {
      const id = stringValue(row.signal_id);
      const timelineId = stringValue(row.node_id);
      if (!id || !timelineId) return null;
      const source =
        stringValue(row.source) === "reality_signature"
          ? "reality_signature"
          : "check_in";
      return {
        id,
        timelineId,
        reflection: stringValue(row.reflection),
        energy: numberValue(row.energy),
        source,
        signatureId: stringValue(row.signature_id) || null,
        createdAt: stringValue(row.created_at),
        deltas: edgesBySignal.get(id) ?? [],
      };
    })
    .filter((moment): moment is EvidenceMoment => moment !== null)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function readNeuralConstellation(
  visitorId: string,
  twinId: string,
): Promise<Constellation | null> {
  const [
    twinRows,
    nodeRows,
    missionRows,
    artifactRows,
    signalRows,
    edgeRows,
  ] = await Promise.all([
    selectRows(
      "aliya_twins",
      { visitor_id: visitorId, twin_id: twinId },
      "Retrieve one Aliya cognitive twin for its anonymous owner",
    ),
    selectRows(
      "aliya_future_nodes",
      { twin_id: twinId },
      "Retrieve the future nodes connected to an Aliya cognitive twin",
    ),
    selectRows(
      "aliya_missions",
      { twin_id: twinId },
      "Retrieve the missions connected to an Aliya cognitive twin",
    ),
    selectRows(
      "aliya_temporal_artifacts",
      { twin_id: twinId },
      "Retrieve reality signatures, Nexus Move, and Shadow Orbit",
    ),
    selectRows(
      "aliya_identity_signals",
      { twin_id: twinId },
      "Retrieve the evidence history for temporal rewind",
    ),
    selectRows(
      "aliya_causal_edges",
      { twin_id: twinId },
      "Retrieve causal changes for temporal rewind",
    ),
  ]);

  const twin = twinRows[0];
  if (!twin) return null;

  const timelines = nodeRows
    .map(rowToTimeline)
    .filter((value): value is Timeline => value !== null)
    .sort((left, right) => left.id.localeCompare(right.id));
  const missions = missionRows
    .map(rowToMission)
    .filter((value): value is Mission => value !== null);

  if (timelines.length !== 3) {
    throw new NeuralPulseError(
      "The cognitive graph is incomplete: expected three future nodes.",
    );
  }

  const artifact = artifactRows[0];
  const realitySignatures = artifact
    ? (parseStored(
        artifact.reality_signatures,
        z.array(realitySignatureSchema).length(3),
      ) ?? [])
    : [];
  const nexusMove = artifact
    ? parseStored(artifact.nexus_move, nexusMoveSchema)
    : null;
  const storedShadow = artifact
    ? parseStored(artifact.shadow_orbit, shadowOrbitSchema)
    : null;
  const evidenceHistory = rowsToEvidenceHistory(signalRows, edgeRows);
  const evidenceCount = evidenceHistory.filter(
    (moment) => moment.source === "check_in",
  ).length;
  const shadowOrbit = storedShadow
    ? {
        ...storedShadow,
        evidenceCount,
        revealed: evidenceCount >= storedShadow.revealAfter,
      }
    : null;

  return {
    id: stringValue(twin.twin_id),
    visitorId: stringValue(twin.visitor_id),
    alias: stringValue(twin.alias),
    objective: stringValue(twin.objective),
    generatedAt: stringValue(twin.created_at),
    horizonDays: numberValue(twin.horizon_days),
    northStar: stringValue(twin.north_star),
    fieldNote: stringValue(twin.field_note),
    timelines,
    missions,
    realitySignatures,
    nexusMove,
    shadowOrbit,
    evidenceHistory,
    selectedTimelineId: stringValue(twin.selected_node_id) || null,
    mode: "neural",
  };
}

export function buildMutationPrompt(
  constellation: Constellation,
  checkIn: CheckIn,
): string {
  return `Evaluate real evidence against this ALIYA graph. Return conservative integer changes, normally 1-6 points. Complete a mission only when plausibly proven. A Nexus Move should usually help all 3 futures. Also measure whether the evidence weakens or strengthens the hidden default path.

GRAPH:${JSON.stringify({
    objective: constellation.objective.slice(0, 72),
    timelines: constellation.timelines.map((timeline) => ({
      id: timeline.id,
      name: timeline.name.slice(0, 40),
      p: timeline.probability,
      risk: timeline.risk.slice(0, 28),
    })),
    missions: constellation.missions
      .filter((mission) => !mission.completed)
      .slice(0, 2)
      .map((mission) => ({
        id: mission.id,
        title: mission.title.slice(0, 50),
      })),
    shadow: constellation.shadowOrbit
      ? {
          p: constellation.shadowOrbit.probability,
          thesis: constellation.shadowOrbit.thesis.slice(0, 60),
        }
      : null,
  })}

EVIDENCE:${JSON.stringify({
    nodeId: checkIn.timelineId,
    reflection: checkIn.reflection.slice(0, 240),
    energy: checkIn.energy,
    nexus: Boolean(checkIn.nexusMoveId),
  })}

Return only JSON:
{"fieldNote":"causal observation","probabilityDeltas":[{"nodeId":"exact id","delta":0,"rationale":"reason"}],"completedMissionId":null,"nextMission":{"title":"action","minutes":20,"reason":"leverage","proof":"observable proof"},"shadowDelta":0,"shadowObservation":"how evidence changed the default path"}

Include exactly one delta for each of the 3 graph ids. shadowDelta must be -8 to 8.`;
}

export function deterministicMutation(
  constellation: Constellation,
  checkIn: CheckIn,
) {
  const selected = constellation.timelines.find(
    (timeline) => timeline.id === checkIn.timelineId,
  );
  if (!selected) {
    throw new NeuralPulseError("The selected future node does not exist.", 400);
  }

  const selectedDelta = Math.max(2, Math.min(8, checkIn.energy + 1));
  const nexusCompleted =
    Boolean(checkIn.nexusMoveId) &&
    checkIn.nexusMoveId === constellation.nexusMove?.id;
  const completedMission =
    checkIn.reflection.trim().length >= 18
      ? constellation.missions.find((mission) => !mission.completed)
      : undefined;
  const shadowDelta =
    checkIn.energy >= 3 && checkIn.reflection.trim().length >= 18 ? -2 : 3;

  return neuralMutationSchema.parse({
    fieldNote: `Evidence now favors ${selected.name}: the reported action converted intention into an observable signal. The field will keep changing as more evidence arrives.`,
    probabilityDeltas: constellation.timelines.map((timeline) => ({
      nodeId: timeline.id,
      delta:
        timeline.id === selected.id
          ? selectedDelta
          : nexusCompleted
            ? 1
            : -1,
      rationale:
        timeline.id === selected.id
          ? "The new evidence directly supports the behavior pattern of this future."
          : nexusCompleted
            ? "The Nexus Move creates useful evidence across every live future."
            : "Attention committed to a competing future slightly reduces this path's momentum.",
    })),
    completedMissionId: completedMission?.id ?? null,
    nextMission: {
      title: `Create the next visible signal for ${selected.name}`,
      minutes: Math.min(30, Math.max(10, checkIn.energy * 6)),
      reason:
        "A second piece of evidence tests whether the action was a moment or the beginning of a pattern.",
      proof: "One new timestamped artifact or witnessed action",
    },
    shadowDelta,
    shadowObservation:
      shadowDelta < 0
        ? "Concrete evidence weakened the future formed by delay."
        : "The evidence left more gravity in the default path.",
  });
}

async function recordBorrowedLightContribution(
  constellation: Constellation,
  timeline: Timeline,
  createdAt: string,
): Promise<void> {
  const move = borrowedLightForTimeline(timeline);
  await neuralRequest({
    action_type: "insert_data",
    prompt: "Add one anonymous proven move to Aliya Borrowed Light",
    data_payload: {
      table: "aliya_borrowed_light",
      record: {
        contribution_id: crypto.randomUUID(),
        visitor_id: constellation.visitorId,
        twin_id: constellation.id,
        move_key: move.moveKey,
        created_at: createdAt,
      },
    },
  });
}

export async function evolveNeuralConstellation(
  checkIn: CheckIn,
): Promise<Constellation> {
  const constellation = await readNeuralConstellation(
    checkIn.visitorId,
    checkIn.constellationId,
  );
  if (!constellation) {
    throw new NeuralPulseError("Cognitive twin not found.", 404);
  }
  const selected = constellation.timelines.find(
    (node) => node.id === checkIn.timelineId,
  );
  if (!selected) {
    throw new NeuralPulseError("The selected future node does not exist.", 400);
  }
  if (
    checkIn.nexusMoveId &&
    checkIn.nexusMoveId !== constellation.nexusMove?.id
  ) {
    throw new NeuralPulseError("The Nexus Move does not belong to this field.", 400);
  }

  let mutation;
  let routingTraceId: string | undefined;
  try {
    const mutationResponse = await neuralRequest({
      action_type: "chat",
      prompt: buildMutationPrompt(constellation, checkIn),
    });
    if (!mutationResponse.response) {
      throw new NeuralPulseError(
        "Neural Pulse returned no graph mutation.",
        undefined,
        mutationResponse.traceId,
      );
    }
    mutation = neuralMutationSchema.parse(
      extractJsonObject(mutationResponse.response),
    );
    routingTraceId = mutationResponse.traceId;
  } catch (error) {
    if (!isSecurityPolicyBlock(error)) throw error;
    mutation = deterministicMutation(constellation, checkIn);
    routingTraceId = error.traceId;
  }

  const allowedNodeIds = new Set(
    constellation.timelines.map((timeline) => timeline.id),
  );
  if (
    mutation.probabilityDeltas.some(
      (delta) => !allowedNodeIds.has(delta.nodeId),
    )
  ) {
    throw new NeuralPulseError(
      "Neural Pulse returned a mutation for an unknown future node.",
    );
  }

  const now = new Date().toISOString();
  const signalId = `signal_${crypto.randomUUID()}`;
  const deltas = new Map(
    mutation.probabilityDeltas.map((item) => [item.nodeId, item]),
  );
  const timelines = constellation.timelines.map((timeline) => {
    const delta = deltas.get(timeline.id)?.delta ?? 0;
    return {
      ...timeline,
      probability: Math.max(1, Math.min(99, timeline.probability + delta)),
    };
  });
  const completedMission = constellation.missions.find(
    (mission) =>
      mission.id === mutation.completedMissionId && !mission.completed,
  );
  const completedMissionId = completedMission?.id ?? null;
  const missions = constellation.missions.map((mission) =>
    mission.id === completedMissionId
      ? { ...mission, completed: true }
      : mission,
  );
  const nextMission: Mission = {
    id: `${constellation.id}_mission_${crypto.randomUUID()}`,
    ...mutation.nextMission,
    completed: false,
    origin: "native",
  };
  missions.push(nextMission);

  const evidenceCount =
    (constellation.shadowOrbit?.evidenceCount ?? 0) + 1;
  const shadowOrbit = constellation.shadowOrbit
    ? {
        ...constellation.shadowOrbit,
        probability: Math.max(
          1,
          Math.min(
            45,
            constellation.shadowOrbit.probability + mutation.shadowDelta,
          ),
        ),
        lastObservation: mutation.shadowObservation,
        evidenceCount,
        revealed: evidenceCount >= constellation.shadowOrbit.revealAfter,
      }
    : null;
  const nexusMove = constellation.nexusMove
    ? {
        ...constellation.nexusMove,
        completed:
          constellation.nexusMove.completed ||
          checkIn.nexusMoveId === constellation.nexusMove.id,
      }
    : null;
  const evidenceMoment: EvidenceMoment = {
    id: signalId,
    timelineId: checkIn.timelineId,
    reflection: checkIn.reflection,
    energy: checkIn.energy,
    source: "check_in",
    signatureId: null,
    createdAt: now,
    deltas: mutation.probabilityDeltas,
  };
  const updated: Constellation = {
    ...constellation,
    timelines,
    missions,
    nexusMove,
    shadowOrbit,
    evidenceHistory: [...constellation.evidenceHistory, evidenceMoment],
    fieldNote: mutation.fieldNote,
    selectedTimelineId: checkIn.timelineId,
    traceId: routingTraceId,
  };

  const selectedDelta = deltas.get(checkIn.timelineId)?.delta ?? 0;
  await neuralRequest({
    action_type: "insert_data",
    prompt: "Store new real-world evidence for an Aliya cognitive twin",
    data_payload: {
      table: "aliya_identity_signals",
      record: {
        signal_id: signalId,
        twin_id: constellation.id,
        node_id: checkIn.timelineId,
        reflection: checkIn.reflection,
        energy: checkIn.energy,
        effect: selectedDelta,
        source: "check_in",
        signature_id: "",
        created_at: now,
      },
    },
  });
  await neuralRequest({
    action_type: "update_data",
    prompt: "Update the root state of an Aliya cognitive twin",
    data_payload: {
      table: "aliya_twins",
      where: {
        visitor_id: checkIn.visitorId,
        twin_id: constellation.id,
      },
      changes: {
        field_note: mutation.fieldNote,
        selected_node_id: checkIn.timelineId,
        updated_at: now,
      },
    },
  });
  for (const timeline of updated.timelines) {
    await neuralRequest({
      action_type: "update_data",
      prompt: "Mutate a future node from new causal evidence",
      data_payload: {
        table: "aliya_future_nodes",
        where: {
          twin_id: constellation.id,
          node_id: timeline.id,
        },
        changes: {
          probability: timeline.probability,
          updated_at: now,
        },
      },
    });
  }
  for (const delta of mutation.probabilityDeltas) {
    await neuralRequest({
      action_type: "insert_data",
      prompt: "Record a causal edge between evidence and a possible future",
      data_payload: {
        table: "aliya_causal_edges",
        record: {
          edge_id: `edge_${crypto.randomUUID()}`,
          twin_id: constellation.id,
          signal_id: signalId,
          node_id: delta.nodeId,
          delta: delta.delta,
          rationale: delta.rationale,
          created_at: now,
        },
      },
    });
  }
  if (completedMissionId) {
    await neuralRequest({
      action_type: "update_data",
      prompt: "Mark a mission complete when new evidence proves it",
      data_payload: {
        table: "aliya_missions",
        where: {
          twin_id: constellation.id,
          mission_id: completedMissionId,
        },
        changes: {
          status: "completed",
          completed_at: now,
        },
      },
    });
    if (completedMission?.origin !== "borrowed_light") {
      await recordBorrowedLightContribution(constellation, selected, now);
    }
  }
  await insertMission(constellation.id, checkIn.timelineId, nextMission, now);
  await updateTemporalArtifacts(updated, now);
  await recordNeuralEvent({
    visitorId: checkIn.visitorId,
    eventType: "check_in",
    twinId: constellation.id,
  });

  return updated;
}

export async function resolveNeuralSignature(
  input: SignatureResolution,
): Promise<Constellation> {
  const constellation = await readNeuralConstellation(
    input.visitorId,
    input.constellationId,
  );
  if (!constellation) {
    throw new NeuralPulseError("Cognitive twin not found.", 404);
  }

  const signature = constellation.realitySignatures.find(
    (item) => item.id === input.signatureId,
  );
  if (!signature) {
    throw new NeuralPulseError("Reality signature not found.", 404);
  }
  if (signature.status !== "pending") {
    throw new NeuralPulseError(
      "This reality signature has already been resolved.",
      409,
    );
  }

  const timeline = constellation.timelines.find(
    (item) => item.id === signature.timelineId,
  );
  if (!timeline) {
    throw new NeuralPulseError("The signature's future node is missing.", 409);
  }

  const now = new Date().toISOString();
  const signalId = `signal_${crypto.randomUUID()}`;
  const delta = input.outcome === "observed" ? 4 : -4;
  const rationale =
    input.outcome === "observed"
      ? "Reality produced the observable sign this future expected."
      : "Reality contradicted the observable sign this future expected.";
  const realitySignatures = constellation.realitySignatures.map((item) =>
    item.id === signature.id
      ? {
          ...item,
          status: input.outcome,
          resolvedAt: now,
        }
      : item,
  );
  const timelines = constellation.timelines.map((item) =>
    item.id === timeline.id
      ? {
          ...item,
          probability: Math.max(1, Math.min(99, item.probability + delta)),
        }
      : item,
  );
  const fieldNote =
    input.outcome === "observed"
      ? "Reality matched one observable signature. That future gained weight, but remains a hypothesis."
      : "Reality contradicted one observable signature. Aliya reduced that future instead of defending it.";
  const evidenceMoment: EvidenceMoment = {
    id: signalId,
    timelineId: timeline.id,
    reflection: `Reality signature ${input.outcome}: ${signature.description}`,
    energy: 3,
    source: "reality_signature",
    signatureId: signature.id,
    createdAt: now,
    deltas: [{ nodeId: timeline.id, delta, rationale }],
  };
  const updated: Constellation = {
    ...constellation,
    timelines,
    realitySignatures,
    evidenceHistory: [...constellation.evidenceHistory, evidenceMoment],
    fieldNote,
  };

  await updateTemporalArtifacts(updated, now);
  await neuralRequest({
    action_type: "insert_data",
    prompt: "Store the observed outcome of an Aliya reality signature",
    data_payload: {
      table: "aliya_identity_signals",
      record: {
        signal_id: signalId,
        twin_id: constellation.id,
        node_id: timeline.id,
        reflection: evidenceMoment.reflection,
        energy: 3,
        effect: delta,
        source: "reality_signature",
        signature_id: signature.id,
        created_at: now,
      },
    },
  });
  await neuralRequest({
    action_type: "update_data",
    prompt: "Recalibrate a future from a reality signature outcome",
    data_payload: {
      table: "aliya_future_nodes",
      where: { twin_id: constellation.id, node_id: timeline.id },
      changes: {
        probability:
          timelines.find((item) => item.id === timeline.id)?.probability ??
          timeline.probability,
        updated_at: now,
      },
    },
  });
  await neuralRequest({
    action_type: "insert_data",
    prompt: "Connect a reality signature outcome to its future",
    data_payload: {
      table: "aliya_causal_edges",
      record: {
        edge_id: `edge_${crypto.randomUUID()}`,
        twin_id: constellation.id,
        signal_id: signalId,
        node_id: timeline.id,
        delta,
        rationale,
        created_at: now,
      },
    },
  });
  await neuralRequest({
    action_type: "update_data",
    prompt: "Update the field note after reality tests the model",
    data_payload: {
      table: "aliya_twins",
      where: {
        visitor_id: input.visitorId,
        twin_id: constellation.id,
      },
      changes: { field_note: fieldNote, updated_at: now },
    },
  });
  await recordNeuralEvent({
    visitorId: input.visitorId,
    eventType: "signature_resolved",
    twinId: constellation.id,
  });

  return updated;
}

export async function readNeuralBorrowedLight(): Promise<BorrowedLightField> {
  const rows = await selectRows(
    "aliya_borrowed_light",
    undefined,
    "Aggregate anonymous proven moves without returning personal text",
  );
  return aggregateBorrowedLight(rows);
}

export async function adoptNeuralBorrowedLight(input: {
  visitorId: string;
  constellationId: string;
  moveKey: string;
}): Promise<Constellation> {
  const [field, constellation] = await Promise.all([
    readNeuralBorrowedLight(),
    readNeuralConstellation(input.visitorId, input.constellationId),
  ]);
  if (!constellation) {
    throw new NeuralPulseError("Cognitive twin not found.", 404);
  }
  if (!field.unlocked) {
    throw new NeuralPulseError(
      "Borrowed Light has not reached its anonymous contributor threshold.",
      409,
    );
  }

  const move = borrowedLightByKey(input.moveKey);
  if (!move || !field.suggestions.some((item) => item.moveKey === move.moveKey)) {
    throw new NeuralPulseError("Borrowed move not found.", 404);
  }
  if (
    constellation.missions.some(
      (mission) =>
        mission.origin === "borrowed_light" && mission.title === move.title,
    )
  ) {
    throw new NeuralPulseError("This light is already in your field.", 409);
  }

  const now = new Date().toISOString();
  const mission: Mission = {
    id: `${constellation.id}_borrowed_${crypto.randomUUID()}`,
    title: move.title,
    minutes: move.minutes,
    reason: `${move.reason} Borrowed from ${field.suggestions.find(
      (item) => item.moveKey === move.moveKey,
    )?.uses ?? 0} anonymous explorers.`,
    proof: move.proof,
    completed: false,
    origin: "borrowed_light",
  };
  await insertMission(constellation.id, "", mission, now);
  await recordNeuralEvent({
    visitorId: input.visitorId,
    eventType: "borrowed_light_adopted",
    twinId: constellation.id,
  });

  return {
    ...constellation,
    missions: [...constellation.missions, mission],
  };
}

export async function readNeuralMetrics(): Promise<PulseMetrics> {
  const rows = await selectRows(
    "aliya_product_events",
    undefined,
    "Aggregate anonymous Aliya product adoption evidence",
  );
  const visitors = new Set(rows.map((row) => stringValue(row.visitor_id)));
  return {
    explorers: Array.from(visitors).filter(Boolean).length,
    constellations: rows.filter(
      (row) => stringValue(row.event_type) === "constellation_created",
    ).length,
    checkIns: rows.filter(
      (row) => stringValue(row.event_type) === "check_in",
    ).length,
    mode: "neural",
  };
}
