import type { CourseSession } from "../types";
import { illustrative, src } from "./sources";

const PROGRAM_2020 = src(
  "/vzdelavani/vzdelavaci-program/",
  "pending",
  "Historický program 2020. Zobrazovat pouze v archivu, nikdy jako nadcházející termín.",
);

/** Price as listed in 2020 — archive only. Second value on source was a discounted price. */
const p = (amount: number, discounted: number) => ({
  amount,
  currency: "CZK" as const,
  note: `Cena 2020; po slevě ${discounted.toLocaleString("cs-CZ")} Kč`,
});

const s2020 = (
  id: string,
  courseSlug: string,
  startDay: string,
  endDay: string,
  location: string,
  price: CourseSession["price"],
): CourseSession => ({
  id,
  courseSlug,
  start: `${startDay}T09:00:00+02:00`,
  end: `${endDay}T17:00:00+02:00`,
  timezone: "Europe/Prague",
  location,
  language: "cs",
  status: "scheduled",
  price,
  capacitySource: "none",
  source: PROGRAM_2020,
});

/** Historical sessions migrated from the 2020 programme (archive evidence). */
export const archivedSessions: CourseSession[] = [
  s2020("2020-n1-hk-jun", "neurac-1", "2020-06-03", "2020-06-05", "Hradec Králové", p(12000, 10800)),
  s2020("2020-n1-pha-sep", "neurac-1", "2020-09-16", "2020-09-18", "Praha", p(12000, 10800)),
  s2020("2020-n1-hk-dec", "neurac-1", "2020-12-09", "2020-12-11", "Hradec Králové", p(12000, 10800)),
  s2020("2020-n2-lb-may", "neurac-2", "2020-05-19", "2020-05-20", "Hradec Králové", p(7400, 6660)),
  s2020("2020-n2-ub-may", "neurac-2", "2020-05-21", "2020-05-22", "Hradec Králové", p(7400, 6660)),
  s2020("2020-n2-vib-nov", "neurac-2", "2020-11-19", "2020-11-20", "Hradec Králové", p(7400, 6660)),
  s2020("2020-ai-pha-may", "active-intro", "2020-05-06", "2020-05-07", "Praha", p(7400, 6660)),
  s2020("2020-aa-hk-sep", "active-advanced", "2020-09-03", "2020-09-04", "Hradec Králové", p(7400, 6660)),
  s2020("2020-ws-3r-jun", "workshop-princip-treti-ruky", "2020-06-18", "2020-06-18", "Praha", p(1200, 1080)),
];

/**
 * ILLUSTRATIVE sessions so owners can review the calendar UI (open/full/cancelled/unknown).
 * They are not real dates. Gated by the `showIllustrativeSessions` feature flag and
 * always labelled in the UI. Remove once a trusted session source exists.
 */
export const illustrativeSessions: CourseSession[] = [
  {
    id: "demo-n1-hk",
    courseSlug: "neurac-1",
    start: "2027-03-10T09:00:00+01:00",
    end: "2027-03-12T16:00:00+01:00",
    timezone: "Europe/Prague",
    location: "Hradec Králové",
    lecturer: "Lektor bude potvrzen",
    language: "cs",
    status: "scheduled",
    capacitySource: "none",
    source: illustrative(),
  },
  {
    id: "demo-ai-pha",
    courseSlug: "active-intro",
    start: "2027-04-15T09:00:00+02:00",
    end: "2027-04-16T16:00:00+02:00",
    timezone: "Europe/Prague",
    location: "Praha",
    language: "cs",
    status: "full",
    capacitySource: "registration-system",
    source: illustrative(),
  },
  {
    id: "demo-n2-hk",
    courseSlug: "neurac-2",
    start: "2027-05-20T09:00:00+02:00",
    end: "2027-05-21T16:00:00+02:00",
    timezone: "Europe/Prague",
    location: "Hradec Králové",
    language: "cs",
    status: "cancelled",
    capacitySource: "none",
    source: illustrative(),
  },
  {
    id: "demo-ws-pha",
    courseSlug: "workshop-uvod-do-metody-neurac",
    start: "2027-06-03T14:00:00+02:00",
    end: "2027-06-03T17:00:00+02:00",
    timezone: "Europe/Prague",
    location: "Praha",
    language: "cs",
    status: "unknown",
    capacitySource: "none",
    source: illustrative(),
  },
];
