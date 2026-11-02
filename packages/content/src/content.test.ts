import { describe, expect, it } from "vitest";
import { createFixtureRepository, defaultFixtures, isVisible } from "./repository";
import { deriveSessionState, formatSessionRange } from "./sessions";
import { searchDocs, sanitiseQuery } from "./search";
import type { CourseSession } from "./types";

const base: CourseSession = {
  id: "t",
  courseSlug: "neurac-1",
  start: "2027-03-10T09:00:00+01:00",
  end: "2027-03-12T16:00:00+01:00",
  timezone: "Europe/Prague",
  location: "Praha",
  language: "cs",
  status: "scheduled",
  capacitySource: "none",
  source: { sourceUrl: "test", observedOn: "2026-11-01", approval: "approved" },
};

describe("session state", () => {
  const now = new Date("2027-03-11T12:00:00+01:00");

  it("treats a session that is running now as still open, not past", () => {
    expect(deriveSessionState(base, now)).toBe("open");
  });
  it("marks a scheduled session as past once its end time has passed", () => {
    expect(deriveSessionState(base, new Date("2027-03-12T16:00:01+01:00"))).toBe("past");
  });
  it("past wins over a stale 'scheduled' or 'full' status", () => {
    expect(deriveSessionState({ ...base, status: "full" }, new Date("2028-01-01"))).toBe("past");
  });
  it("keeps cancelled and full explicit for future sessions", () => {
    expect(deriveSessionState({ ...base, status: "cancelled" }, now)).toBe("cancelled");
    expect(deriveSessionState({ ...base, status: "full" }, now)).toBe("full");
  });
  it("returns unknown for an unknown status or invalid date", () => {
    expect(deriveSessionState({ ...base, status: "unknown" }, now)).toBe("unknown");
    expect(deriveSessionState({ ...base, end: "not-a-date" }, now)).toBe("unknown");
  });
  it("formats in Europe/Prague regardless of server timezone", () => {
    // 23:30 UTC on 9 March is already 10 March in Prague.
    const s = { ...base, start: "2027-03-09T23:30:00Z", end: "2027-03-12T15:00:00Z" };
    expect(formatSessionRange(s)).toBe("10. 3. 2027 – 12. 3. 2027");
    const sameDay = { ...base, start: "2027-06-03T12:00:00Z", end: "2027-06-03T15:00:00Z" };
    expect(formatSessionRange(sameDay)).toBe("3. 6. 2027, 14:00–17:00");
  });
});

describe("repository", () => {
  const now = new Date("2026-11-01T12:00:00+01:00");

  it("never lists the 2020 programme as upcoming", () => {
    const repo = createFixtureRepository({ mode: "preview", includeIllustrative: false });
    const { upcoming, archive } = repo.listSessions({ now });
    expect(upcoming).toHaveLength(0);
    expect(archive.length).toBeGreaterThan(0);
    expect(archive.every((v) => v.state === "past")).toBe(true);
  });

  it("returns empty results for filters that match nothing", () => {
    const repo = createFixtureRepository({ mode: "preview", includeIllustrative: true });
    expect(repo.listSessions({ now, location: "Ostrava" }).upcoming).toEqual([]);
  });

  it("labels illustrative sessions and hides them in production", () => {
    const preview = createFixtureRepository({ mode: "preview", includeIllustrative: true });
    const up = preview.listSessions({ now }).upcoming;
    expect(up.length).toBeGreaterThan(0);
    expect(up.every((v) => v.illustrative)).toBe(true);
    const prod = createFixtureRepository({ mode: "production", includeIllustrative: true });
    expect(prod.listSessions({ now }).upcoming).toHaveLength(0);
  });

  it("production shows approved records only", () => {
    expect(isVisible("pending", { mode: "production", includeIllustrative: false })).toBe(false);
    expect(isVisible("proposal", { mode: "production", includeIllustrative: false })).toBe(false);
    expect(isVisible("approved", { mode: "production", includeIllustrative: false })).toBe(true);
  });

  it("never renders unapproved metrics, testimonials or practitioners even in preview", () => {
    const repo = createFixtureRepository({ mode: "preview", includeIllustrative: true });
    expect(defaultFixtures.metrics.length).toBeGreaterThan(0);
    expect(repo.listMetrics()).toEqual([]);
    expect(repo.listTestimonials()).toEqual([]);
    expect(repo.listPractitioners()).toEqual([]);
  });

  it("filters equipment by audience", () => {
    const repo = createFixtureRepository({ mode: "preview", includeIllustrative: false });
    const individual = repo.listProducts({ audience: "jednotlivec" });
    expect(individual.length).toBeGreaterThan(0);
    expect(individual.every((p) => p.audiences.includes("jednotlivec"))).toBe(true);
  });

  it("never carries a made-up price on product families", () => {
    expect(defaultFixtures.products.every((p) => p.priceDisplay === "on-request")).toBe(true);
  });
});

describe("search", () => {
  const index = [
    { url: "/bezpecnost/skoleni-bezpecnosti/", title: "Školení bezpečnosti", excerpt: "Zaškolení", kind: "Bezpečnost" as const },
    { url: "/vybaveni/mini/", title: "Redcord Mini", excerpt: "Kompaktní zařízení", kind: "Vybavení" as const },
  ];
  it("matches without diacritics", () => {
    expect(searchDocs(index, "skoleni")[0]?.url).toBe("/bezpecnost/skoleni-bezpecnosti/");
  });
  it("returns nothing for empty or one-letter queries", () => {
    expect(searchDocs(index, "")).toEqual([]);
    expect(searchDocs(index, "a")).toEqual([]);
  });
  it("limits query length", () => {
    expect(sanitiseQuery("x".repeat(500)).length).toBe(80);
    expect(sanitiseQuery(["array"])).toBe("");
  });
});
