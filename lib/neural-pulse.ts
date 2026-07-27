import type {
  CheckIn,
  Constellation,
  Intake,
  Mission,
  PulseMetrics,
  Timeline,
} from "@/lib/types";
import {
  neuralConstellationSchema,
  neuralMutationSchema,
  type NeuralConstellationInput,
} from "@/lib/contracts";
import { generateSimulationConstellation } from "@/lib/demo-engine";

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
  return [
    { x: 72, y: 25, color: "lime" as const },
    { x: 82, y: 70, color: "violet" as const },
    { x: 28, y: 73, color: "coral" as const },
  ][index];
}

function buildPrompt(intake: Intake): string {
  return `Create a rigorous possible-self model for a student using the profile below. Generate exactly three meaningfully divergent ${intake.horizonDays}-day futures. Keep the model grounded, educational, and actionable with ${intake.minutesPerDay} minutes per day. Do not include diagnoses, guarantees, or supernatural claims.

STUDENT PROFILE:
${JSON.stringify({
  alias: intake.alias,
  objective: intake.objective,
  friction: intake.friction,
  energyPattern: intake.energyPattern,
})}

Format the response as valid JSON with this exact shape:
{
  "northStar": "one precise identity-level direction",
  "fieldNote": "one surprising observation about leverage or friction",
  "timelines": [
    {
      "name": "evocative 2-4 word timeline name",
      "archetype": "short identity archetype",
      "probability": 1-99,
      "signal": "stable | volatile | rare",
      "thesis": "how this future emerges",
      "futureMemory": "a vivid but grounded memory written from day ${intake.horizonDays}",
      "firstMove": "a concrete action for today",
      "risk": "the failure mode unique to this path"
    }
  ],
  "missions": [
    {
      "title": "concrete action",
      "minutes": 5-180,
      "reason": "why this shifts the future",
      "proof": "observable completion evidence"
    }
  ]
}

The timelines array must contain exactly 3 items and missions must contain 3-5 items.`;
}

export async function generateNeuralConstellation(
  intake: Intake,
): Promise<Constellation> {
  let parsed: NeuralConstellationInput;
  let routingTraceId: string | undefined;

  try {
    const generated = await neuralRequest({
      action_type: "chat",
      prompt: buildPrompt(intake),
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

    const fallback = generateSimulationConstellation(intake);
    parsed = {
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
      missions: fallback.missions.map(
        ({ title, minutes, reason, proof }) => ({
          title,
          minutes,
          reason,
          proof,
        }),
      ),
    };
    routingTraceId = error.traceId;
  }

  const twinId = `twin_${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();
  const constellation: Constellation = {
    id: twinId,
    visitorId: intake.visitorId,
    alias: intake.alias,
    objective: intake.objective,
    generatedAt: createdAt,
    horizonDays: intake.horizonDays,
    northStar: parsed.northStar,
    fieldNote: parsed.fieldNote,
    timelines: parsed.timelines.map((timeline, index) => ({
      ...timeline,
      id: `${twinId}_node_${index + 1}`,
      ...timelineCoordinates(index),
    })),
    missions: parsed.missions.map((mission, index) => ({
      ...mission,
      id: `${twinId}_mission_${index + 1}`,
      completed: false,
    })),
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
        created_at: createdAt,
        completed_at: "",
      },
    },
  });
}

export async function recordNeuralEvent(input: {
  visitorId: string;
  eventType: "constellation_created" | "check_in";
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

export async function readNeuralConstellation(
  visitorId: string,
  twinId: string,
): Promise<Constellation | null> {
  const [twinRows, nodeRows, missionRows] = await Promise.all([
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
  ]);

  const twin = twinRows[0];
  if (!twin) return null;

  const timelines = nodeRows
    .map(rowToTimeline)
    .filter((value): value is Timeline => value !== null)
    .sort((a, b) => a.x - b.x);
  const missions = missionRows
    .map(rowToMission)
    .filter((value): value is Mission => value !== null);

  if (timelines.length !== 3) {
    throw new NeuralPulseError(
      "The cognitive graph is incomplete: expected three future nodes.",
    );
  }

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
    selectedTimelineId: stringValue(twin.selected_node_id) || null,
    mode: "neural",
  };
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
  };
}

export function buildMutationPrompt(
  constellation: Constellation,
  checkIn: CheckIn,
): string {
  return `Evaluate evidence against this retrieved ALIYA cognitive graph. Return conservative integer probability changes, normally 1-6 points. Complete an open mission only when the evidence plausibly proves it.

GRAPH:
${JSON.stringify({
  objective: constellation.objective.slice(0, 100),
  timelines: constellation.timelines.map((timeline) => ({
    id: timeline.id,
    name: timeline.name.slice(0, 48),
    probability: timeline.probability,
    risk: timeline.risk.slice(0, 40),
  })),
  openMissions: constellation.missions
    .filter((mission) => !mission.completed)
    .slice(0, 2)
    .map((mission) => ({
      id: mission.id,
      title: mission.title.slice(0, 60),
    })),
})}

EVIDENCE:
${JSON.stringify({
  nodeId: checkIn.timelineId,
  reflection: checkIn.reflection.slice(0, 280),
  energy: checkIn.energy,
})}

Return only valid JSON:
{
  "fieldNote": "concise causal observation",
  "probabilityDeltas": [
    {"nodeId": "exact graph id", "delta": 0, "rationale": "causal reason"}
  ],
  "completedMissionId": null,
  "nextMission": {"title": "action", "minutes": 20, "reason": "leverage", "proof": "observable evidence"}
}

Include exactly one delta for each of the three graph ids.`;
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
  const completedMission =
    checkIn.reflection.trim().length >= 18
      ? constellation.missions.find((mission) => !mission.completed)
      : undefined;

  return neuralMutationSchema.parse({
    fieldNote: `Evidence now favors ${selected.name}: the reported action converted intention into an observable signal. The field will keep changing as more evidence arrives.`,
    probabilityDeltas: constellation.timelines.map((timeline) => ({
      nodeId: timeline.id,
      delta: timeline.id === selected.id ? selectedDelta : -1,
      rationale:
        timeline.id === selected.id
          ? "The new evidence directly supports the behavior pattern of this future."
          : "Attention committed to a competing future slightly reduces this path's current momentum.",
    })),
    completedMissionId: completedMission?.id ?? null,
    nextMission: {
      title: `Create the next visible signal for ${selected.name}`,
      minutes: Math.min(30, Math.max(10, checkIn.energy * 6)),
      reason:
        "A second piece of evidence tests whether the action was a moment or the beginning of a pattern.",
      proof: "One new timestamped artifact or witnessed action",
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
  if (!constellation.timelines.some((node) => node.id === checkIn.timelineId)) {
    throw new NeuralPulseError("The selected future node does not exist.", 400);
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
  const completedMissionId = constellation.missions.some(
    (mission) => mission.id === mutation.completedMissionId,
  )
    ? mutation.completedMissionId
    : null;
  const missions = constellation.missions.map((mission) =>
    mission.id === completedMissionId
      ? { ...mission, completed: true }
      : mission,
  );
  const nextMission: Mission = {
    id: `${constellation.id}_mission_${crypto.randomUUID()}`,
    ...mutation.nextMission,
    completed: false,
  };
  missions.push(nextMission);

  const updated: Constellation = {
    ...constellation,
    timelines,
    missions,
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
  }
  await insertMission(constellation.id, checkIn.timelineId, nextMission, now);
  await recordNeuralEvent({
    visitorId: checkIn.visitorId,
    eventType: "check_in",
    twinId: constellation.id,
  });

  return updated;
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
