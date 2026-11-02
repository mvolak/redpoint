import type { StaffRole } from "../db/schema";
import { DomainError } from "./errors";

export type StaffActor = { kind: "staff"; staffId: string; role: StaffRole; therapistId: string | null; displayName: string };
export type GuestActor = { kind: "guest"; sessionId: string };
export type SystemActor = { kind: "system" };
export type Actor = StaffActor | GuestActor | SystemActor;

const rank: Record<StaffRole, number> = { therapist: 1, reception: 2, admin: 3 };

/** Server-side role gate. Throws unless actor is staff with at least `min` role. */
export function requireStaff(actor: Actor | null | undefined, min: StaffRole = "therapist"): StaffActor {
  if (!actor || actor.kind !== "staff") throw new DomainError("unauthenticated", "Přihlaste se prosím.");
  if (rank[actor.role] < rank[min]) throw new DomainError("forbidden", "K této akci nemáte oprávnění.");
  return actor;
}

/** Therapists are scoped to their own schedule; reception/admin see all. */
export function therapistScope(actor: StaffActor): string | null {
  return actor.role === "therapist" ? actor.therapistId : null;
}

export function assertCanAccessTherapist(actor: StaffActor, therapistId: string) {
  const scope = therapistScope(actor);
  if (scope !== null && scope !== therapistId) throw new DomainError("forbidden", "K tomuto rozvrhu nemáte přístup.");
}

export function auditActor(actor: Actor): { actorType: "staff" | "patient" | "system"; actorId: string | null } {
  if (actor.kind === "staff") return { actorType: "staff", actorId: actor.staffId };
  if (actor.kind === "guest") return { actorType: "patient", actorId: actor.sessionId };
  return { actorType: "system", actorId: null };
}
