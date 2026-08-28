import { describe, expect, it, vi } from "vitest";
import { cn, formatRelativeDate } from "./utils";

describe("formatRelativeDate", () => {
  it("returns empty string for invalid dates", () => {
    expect(formatRelativeDate("pas-une-date")).toBe("");
  });

  it("returns à l'instant for less than a minute", () => {
    vi.setSystemTime(new Date("2026-08-13T12:00:00Z"));
    expect(formatRelativeDate("2026-08-13T11:59:30Z")).toBe("à l'instant");
  });

  it("returns minutes", () => {
    vi.setSystemTime(new Date("2026-08-13T12:00:00Z"));
    expect(formatRelativeDate("2026-08-13T11:58:00Z")).toBe("il y a 2 minutes");
  });

  it("returns singular minutes", () => {
    vi.setSystemTime(new Date("2026-08-13T12:00:00Z"));
    expect(formatRelativeDate("2026-08-13T11:59:00Z")).toBe("il y a 1 minute");
  });

  it("returns hours", () => {
    vi.setSystemTime(new Date("2026-08-13T12:00:00Z"));
    expect(formatRelativeDate("2026-08-13T09:00:00Z")).toBe("il y a 3 heures");
  });

  it("returns days", () => {
    vi.setSystemTime(new Date("2026-08-13T12:00:00Z"));
    expect(formatRelativeDate("2026-08-10T12:00:00Z")).toBe("il y a 3 jours");
  });

  it("returns weeks, months and years", () => {
    vi.setSystemTime(new Date("2026-08-13T12:00:00Z"));
    expect(formatRelativeDate("2026-07-13T12:00:00Z")).toBe("il y a 4 semaines");
    expect(formatRelativeDate("2026-01-13T12:00:00Z")).toBe("il y a 7 mois");
    expect(formatRelativeDate("2016-08-13T12:00:00Z")).toBe("il y a 10 ans");
  });
});

describe("cn", () => {
  it("joins truthy values", () => {
    expect(cn("a", "b", null, undefined, false, "c")).toBe("a b c");
  });

  it("returns empty string when nothing", () => {
    expect(cn(null, false)).toBe("");
  });
});
