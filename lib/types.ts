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
}

export interface PulseMetrics {
  explorers: number;
  constellations: number;
  checkIns: number;
  mode: "neural" | "simulation";
}
