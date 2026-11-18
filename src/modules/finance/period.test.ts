import { describe, expect, it } from "vitest";
import { resolveBookPeriod } from "./period";

describe("resolveBookPeriod", () => {
  const now = new Date("2026-11-18T12:00:00.000Z");

  it("uses the selected day as a one-day range", () => {
    const range = resolveBookPeriod({ period: "day", date: "2026-11-18", now });

    expect(range.start.toISOString()).toBe("2026-11-18T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-11-19T00:00:00.000Z");
    expect(range.label).toBe("18/11/2026");
  });

  it("uses Monday through Sunday for the selected week", () => {
    const range = resolveBookPeriod({ period: "week", date: "2026-11-22", now });

    expect(range.start.toISOString()).toBe("2026-11-16T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-11-23T00:00:00.000Z");
    expect(range.label).toBe("16/11/2026 - 22/11/2026");
  });

  it("falls back to the current month when no period is selected", () => {
    const range = resolveBookPeriod({ now });

    expect(range.period).toBe("month");
    expect(range.start.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });
});
