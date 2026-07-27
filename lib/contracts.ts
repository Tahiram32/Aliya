import { z } from "zod";
import { energyValues, frictionValues } from "@/lib/types";

export const intakeSchema = z.object({
  visitorId: z.string().uuid(),
  alias: z
    .string()
    .trim()
    .min(1, "Give your future self a name.")
    .max(32, "Keep the name under 32 characters."),
  objective: z
    .string()
    .trim()
    .min(12, "Describe the future you want in a little more detail.")
    .max(360, "Keep the objective under 360 characters."),
  horizonDays: z.union([z.literal(30), z.literal(60), z.literal(90)]),
  minutesPerDay: z.number().int().min(10).max(180),
  friction: z.enum(frictionValues),
  energyPattern: z.enum(energyValues),
});

export const checkInSchema = z.object({
  visitorId: z.string().uuid(),
  constellationId: z.string().min(8).max(120),
  timelineId: z.string().min(2).max(80),
  reflection: z.string().trim().min(3).max(500),
  energy: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  nexusMoveId: z.string().min(2).max(120).optional(),
});

export const signatureResolutionSchema = z.object({
  visitorId: z.string().uuid(),
  constellationId: z.string().min(8).max(120),
  signatureId: z.string().min(2).max(120),
  outcome: z.enum(["observed", "contradicted"]),
});

export const borrowedLightAdoptionSchema = z.object({
  visitorId: z.string().uuid(),
  constellationId: z.string().min(8).max(120),
  moveKey: z.enum(["repeat_signal", "protect_chamber", "show_unfinished"]),
});

export const realitySignatureSchema = z.object({
  id: z.string().min(2).max(120),
  timelineId: z.string().min(2).max(120),
  description: z.string().min(8).max(180),
  window: z.enum(["72h", "7d", "30d"]),
  dueAt: z.string().datetime(),
  status: z.enum(["pending", "observed", "contradicted"]),
  resolvedAt: z.string().datetime().nullable(),
});

export const nexusMoveSchema = z.object({
  id: z.string().min(2).max(120),
  title: z.string().min(3).max(100),
  minutes: z.number().int().min(5).max(90),
  reason: z.string().min(8).max(240),
  proof: z.string().min(3).max(160),
  supportsTimelineIds: z.array(z.string().min(2).max(120)).length(3),
  completed: z.boolean(),
});

export const shadowOrbitSchema = z.object({
  id: z.string().min(2).max(120),
  name: z.string().min(2).max(72),
  archetype: z.string().min(2).max(72),
  probability: z.number().int().min(1).max(45),
  thesis: z.string().min(12).max(300),
  risk: z.string().min(5).max(220),
  disruptionMove: z.string().min(5).max(220),
  lastObservation: z.string().min(8).max(240),
  revealAfter: z.number().int().min(1).max(12),
  evidenceCount: z.number().int().min(0),
  revealed: z.boolean(),
});

const generatedRealitySignatureSchema = z.object({
  timelineIndex: z.number().int().min(0).max(2),
  description: z.string().min(8).max(180),
  window: z.enum(["72h", "7d", "30d"]),
});

const generatedNexusMoveSchema = z.object({
  title: z.string().min(3).max(100),
  minutes: z.number().int().min(5).max(90),
  reason: z.string().min(8).max(240),
  proof: z.string().min(3).max(160),
});

const generatedShadowOrbitSchema = z.object({
  name: z.string().min(2).max(72),
  archetype: z.string().min(2).max(72),
  probability: z.number().int().min(1).max(45),
  thesis: z.string().min(12).max(300),
  risk: z.string().min(5).max(220),
  disruptionMove: z.string().min(5).max(220),
});

export const neuralConstellationSchema = z.object({
  northStar: z.string().min(8).max(180),
  fieldNote: z.string().min(12).max(420),
  timelines: z
    .array(
      z.object({
        name: z.string().min(2).max(72),
        archetype: z.string().min(2).max(72),
        probability: z.number().min(1).max(99),
        signal: z.enum(["stable", "volatile", "rare"]),
        thesis: z.string().min(12).max(300),
        futureMemory: z.string().min(12).max(360),
        firstMove: z.string().min(5).max(220),
        risk: z.string().min(5).max(220),
      }),
    )
    .length(3),
  missions: z
    .array(
      z.object({
        title: z.string().min(3).max(100),
        minutes: z.number().int().min(5).max(180),
        reason: z.string().min(8).max(240),
        proof: z.string().min(3).max(160),
      }),
    )
    .min(3)
    .max(5),
  realitySignatures: z
    .array(generatedRealitySignatureSchema)
    .length(3)
    .refine(
      (signatures) =>
        new Set(signatures.map((signature) => signature.timelineIndex)).size ===
        3,
      "Each future needs exactly one reality signature.",
    ),
  nexusMove: generatedNexusMoveSchema,
  shadowOrbit: generatedShadowOrbitSchema,
});

export type NeuralConstellationInput = z.infer<
  typeof neuralConstellationSchema
>;

export const neuralMutationSchema = z.object({
  fieldNote: z.string().min(12).max(420),
  probabilityDeltas: z
    .array(
      z.object({
        nodeId: z.string().min(2).max(120),
        delta: z.number().int().min(-12).max(12),
        rationale: z.string().min(8).max(240),
      }),
    )
    .length(3),
  completedMissionId: z.string().min(2).max(120).nullable(),
  nextMission: z.object({
    title: z.string().min(3).max(100),
    minutes: z.number().int().min(5).max(180),
    reason: z.string().min(8).max(240),
    proof: z.string().min(3).max(160),
  }),
  shadowDelta: z.number().int().min(-8).max(8),
  shadowObservation: z.string().min(8).max(240),
});
