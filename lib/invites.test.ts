// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isInviteUsable } from "./invites";

describe("isInviteUsable", () => {
  it("returns false for a null invite", () => {
    expect(isInviteUsable(null)).toBe(false);
  });

  describe("unlimited invites (max_uses = null)", () => {
    it("returns true with uses_count 0", () => {
      expect(isInviteUsable({ max_uses: null, uses_count: 0 })).toBe(true);
    });

    it("returns true with uses_count 1", () => {
      expect(isInviteUsable({ max_uses: null, uses_count: 1 })).toBe(true);
    });

    it("returns true with uses_count 100", () => {
      expect(isInviteUsable({ max_uses: null, uses_count: 100 })).toBe(true);
    });
  });

  describe("capped invites (max_uses = 5)", () => {
    it("returns true with uses_count 0", () => {
      expect(isInviteUsable({ max_uses: 5, uses_count: 0 })).toBe(true);
    });

    it("returns true with uses_count 1", () => {
      expect(isInviteUsable({ max_uses: 5, uses_count: 1 })).toBe(true);
    });

    it("returns true with uses_count 4", () => {
      expect(isInviteUsable({ max_uses: 5, uses_count: 4 })).toBe(true);
    });

    it("returns false with uses_count 5 (cap reached)", () => {
      expect(isInviteUsable({ max_uses: 5, uses_count: 5 })).toBe(false);
    });

    it("returns false with uses_count 6 (over cap)", () => {
      expect(isInviteUsable({ max_uses: 5, uses_count: 6 })).toBe(false);
    });
  });

  describe("single-use invites (max_uses = 1)", () => {
    it("returns true with uses_count 0", () => {
      expect(isInviteUsable({ max_uses: 1, uses_count: 0 })).toBe(true);
    });

    it("returns false with uses_count 1 (cap reached)", () => {
      expect(isInviteUsable({ max_uses: 1, uses_count: 1 })).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("returns false for max_uses = 0 with uses_count 0 (treated as capped)", () => {
      expect(isInviteUsable({ max_uses: 0, uses_count: 0 })).toBe(false);
    });
  });
});
