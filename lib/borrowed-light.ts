import type {
  BorrowedLight,
  BorrowedLightField,
  Timeline,
} from "@/lib/types";

export const borrowedLightThreshold = 3;

const borrowedLightCatalog = {
  repeat_signal: {
    moveKey: "repeat_signal",
    title: "Repeat the smallest visible signal",
    minutes: 15,
    reason:
      "A second piece of evidence reveals whether the first action was a moment or the start of a pattern.",
    proof: "Two related artifacts created on different days",
  },
  protect_chamber: {
    moveKey: "protect_chamber",
    title: "Protect one uninterrupted work chamber",
    minutes: 25,
    reason:
      "A small protected interval lets depth form without demanding an impossible routine.",
    proof: "One finished work interval and the artifact it produced",
  },
  show_unfinished: {
    moveKey: "show_unfinished",
    title: "Show one unfinished artifact",
    minutes: 12,
    reason:
      "Early contact with another person turns private intention into feedback and opportunity.",
    proof: "One sent link, screenshot, sketch, or recording",
  },
} satisfies Record<
  string,
  Omit<BorrowedLight, "uses">
>;

export type BorrowedLightKey = keyof typeof borrowedLightCatalog;

export function borrowedLightForTimeline(
  timeline: Timeline,
): Omit<BorrowedLight, "uses"> {
  if (timeline.signal === "volatile") {
    return borrowedLightCatalog.protect_chamber;
  }
  if (timeline.signal === "rare") {
    return borrowedLightCatalog.show_unfinished;
  }
  return borrowedLightCatalog.repeat_signal;
}

export function borrowedLightByKey(
  moveKey: string,
): Omit<BorrowedLight, "uses"> | null {
  return moveKey in borrowedLightCatalog
    ? borrowedLightCatalog[moveKey as BorrowedLightKey]
    : null;
}

export function aggregateBorrowedLight(
  rows: Record<string, unknown>[],
): BorrowedLightField {
  const contributors = new Set<string>();
  const usesByMove = new Map<BorrowedLightKey, Set<string>>();

  for (const row of rows) {
    const visitorId =
      typeof row.visitor_id === "string" ? row.visitor_id : "";
    const moveKey =
      typeof row.move_key === "string" ? row.move_key : "";
    const move = borrowedLightByKey(moveKey);
    if (!visitorId || !move) continue;

    contributors.add(visitorId);
    const key = move.moveKey as BorrowedLightKey;
    const uses = usesByMove.get(key) ?? new Set<string>();
    uses.add(visitorId);
    usesByMove.set(key, uses);
  }

  const unlocked = contributors.size >= borrowedLightThreshold;
  const suggestions = unlocked
    ? Array.from(usesByMove.entries())
        .map(([moveKey, visitors]) => ({
          ...borrowedLightCatalog[moveKey],
          uses: visitors.size,
        }))
        .sort((left, right) => right.uses - left.uses)
    : [];

  return {
    unlocked,
    contributors: contributors.size,
    requiredContributors: borrowedLightThreshold,
    suggestions,
  };
}
