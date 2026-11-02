import { describe, expect, it } from "vitest";
import { APP_ROUTES, EXTERNAL_REDIRECT_HOSTS, REQUIRED_ANCHORS, isExternalTarget, redirectRules } from "./redirects";

const redirecting = redirectRules.filter((r) => r.status === "decided" || r.status === "proposed");
const internal = redirecting.filter((r) => r.to && !isExternalTarget(r.to));
const external = redirecting.filter((r) => r.to && isExternalTarget(r.to));
const pathOf = (to: string) => to.split(/[?#]/)[0] ?? to;

describe("migration map", () => {
  it("has unique source URLs", () => {
    const froms = redirectRules.map((r) => r.from);
    expect(new Set(froms).size).toBe(froms.length);
  });

  it("every redirect has a destination", () => {
    for (const r of redirecting) expect(r.to, r.from).toBeDefined();
  });

  it("internal destinations exist in the app", () => {
    for (const r of internal) {
      expect(r.to!.startsWith("/"), `${r.from} → ${r.to}`).toBe(true);
      expect(APP_ROUTES as readonly string[], `${r.from} → ${r.to}`).toContain(pathOf(r.to!));
    }
  });

  it("external destinations are https on an allow-listed host", () => {
    for (const r of external) {
      const u = new URL(r.to!);
      expect(u.protocol, r.to).toBe("https:");
      expect(EXTERNAL_REDIRECT_HOSTS as readonly string[], r.to).toContain(u.hostname);
      expect(u.username + u.password, r.to).toBe("");
    }
  });

  it("detects external targets", () => {
    expect(isExternalTarget("https://www.redpoint-clinic.cz/x/")).toBe(true);
    expect(isExternalTarget("/kontakt/#poptavka")).toBe(false);
    expect(isExternalTarget("//evil.example/")).toBe(false);
  });

  it("never blanket-redirects to the homepage", () => {
    expect(internal.filter((r) => pathOf(r.to!) === "/")).toEqual([]);
  });

  it("has no redirect chains", () => {
    const sources = new Set(redirecting.map((r) => r.from));
    for (const r of internal) expect(sources.has(pathOf(r.to!)), `${r.from} chains`).toBe(false);
  });

  it("only kept/redirected entries point somewhere; undecided ones carry no destination", () => {
    for (const r of redirectRules.filter((x) => x.status === "needs-owner" || x.status === "gone")) {
      expect(r.to, r.from).toBeUndefined();
    }
  });

  it("internal fragment targets are declared as required anchors on their page", () => {
    for (const r of internal.filter((x) => x.to!.includes("#"))) {
      const [path, anchor] = r.to!.split("#") as [string, string];
      expect(REQUIRED_ANCHORS[pathOf(path)], r.to).toContain(anchor);
    }
  });
});
