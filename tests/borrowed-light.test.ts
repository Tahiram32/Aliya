import { describe, expect, it } from "vitest";
import {
  aggregateBorrowedLight,
  borrowedLightThreshold,
} from "@/lib/borrowed-light";

describe("Borrowed Light privacy threshold", () => {
  it("does not expose suggestions before three distinct explorers contribute", () => {
    const field = aggregateBorrowedLight([
      { visitor_id: "visitor-a", move_key: "repeat_signal" },
      { visitor_id: "visitor-a", move_key: "repeat_signal" },
      { visitor_id: "visitor-b", move_key: "show_unfinished" },
    ]);

    expect(field.unlocked).toBe(false);
    expect(field.contributors).toBe(2);
    expect(field.requiredContributors).toBe(borrowedLightThreshold);
    expect(field.suggestions).toEqual([]);
  });

  it("shares only catalog moves and deduplicated anonymous use counts", () => {
    const field = aggregateBorrowedLight([
      {
        visitor_id: "visitor-a",
        move_key: "repeat_signal",
        reflection: "private text that must never be returned",
      },
      { visitor_id: "visitor-a", move_key: "repeat_signal" },
      { visitor_id: "visitor-b", move_key: "repeat_signal" },
      { visitor_id: "visitor-c", move_key: "protect_chamber" },
      { visitor_id: "visitor-d", move_key: "unknown_move" },
    ]);

    expect(field.unlocked).toBe(true);
    expect(field.contributors).toBe(3);
    expect(field.suggestions[0]).toMatchObject({
      moveKey: "repeat_signal",
      uses: 2,
    });
    expect(JSON.stringify(field)).not.toContain("private text");
    expect(JSON.stringify(field)).not.toContain("visitor-");
  });
});
