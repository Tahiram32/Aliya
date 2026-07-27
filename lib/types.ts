export const frictionValues = [
  "starting",
  "consistency",
  "overwhelm",
  "confidence",
  "direction",
] as const;

export const energyValues = [
  "dawn",
  "midday",
  "dusk",
  "unpredictable",
] as const;

export type Friction = (typeof frictionValues)[number];
export type EnergyPattern = (typeof energyValues)[number];

export interface Intake {
  visitorId: string;
  alias: string;
  objective: string;
  horizonDays: 30 | 60 | 90;
  minutesPerDay: number;
  friction: Friction;
  energyPattern: EnergyPattern;
}

export interface Timeline {
  id: string;
  name: string;
  archetype: string;
  probability: number;
  signal: "stable" | "volatile" | "rare";
  thesis: string;
  futureMemory: string;
  firstMove: string;
  risk: string;
  x: number;
  y: number;
  color: "lime" | "violet" | "coral";
}

export interface Mission {
  id: string;
  title: string;
  minutes: number;
  reason: string;
  proof: string;
  completed: boolean;
  origin?: "native" | "borrowed_light";
}

export type RealitySignatureWindow = "72h" | "7d" | "30d";
export type RealitySignatureStatus =
  | "pending"
  | "observed"
  | "contradicted";

export interface RealitySignature {
  id: string;
  timelineId: string;
  description: string;
  window: RealitySignatureWindow;
  dueAt: string;
  status: RealitySignatureStatus;
  resolvedAt: string | null;
}

export interface NexusMove {
  id: string;
  title: string;
  minutes: number;
  reason: string;
  proof: string;
  supportsTimelineIds: string[];
  completed: boolean;
}

export interface ShadowOrbit {
  id: string;
  name: string;
  archetype: string;
  probability: number;
  thesis: string;
  risk: string;
  disruptionMove: string;
  lastObservation: string;
  revealAfter: number;
  evidenceCount: number;
  revealed: boolean;
}

export interface EvidenceDelta {
  nodeId: string;
  delta: number;
  rationale: string;
}

export interface EvidenceMoment {
  id: string;
  timelineId: string;
  reflection: string;
  energy: number;
  source: "check_in" | "reality_signature";
  signatureId: string | null;
  createdAt: string;
  deltas: EvidenceDelta[];
}

export interface BorrowedLight {
  moveKey: string;
  title: string;
  minutes: number;
  reason: string;
  proof: string;
  uses: number;
}

export interface BorrowedLightField {
  unlocked: boolean;
  contributors: number;
  requiredContributors: number;
  suggestions: BorrowedLight[];
}

export interface Constellation {
  id: string;
  visitorId: string;
  alias: string;
  objective: string;
  generatedAt: string;
  horizonDays: number;
  northStar: string;
  fieldNote: string;
  timelines: Timeline[];
  missions: Mission[];
  realitySignatures: RealitySignature[];
  nexusMove: NexusMove | null;
  shadowOrbit: ShadowOrbit | null;
  evidenceHistory: EvidenceMoment[];
  selectedTimelineId: string | null;
  mode: "neural" | "simulation";
  traceId?: string;
}

export interface CheckIn {
  visitorId: string;
  constellationId: string;
  timelineId: string;
  reflection: string;
  energy: 1 | 2 | 3 | 4 | 5;
  nexusMoveId?: string;
}

export interface SignatureResolution {
  visitorId: string;
  constellationId: string;
  signatureId: string;
  outcome: "observed" | "contradicted";
}

export interface PulseMetrics {
  explorers: number;
  constellations: number;
  checkIns: number;
  mode: "neural" | "simulation";
}
