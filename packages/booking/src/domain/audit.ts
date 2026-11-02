import type { Executor } from "../db/client";
import { auditEvent } from "../db/schema";
import { auditActor, type Actor } from "./actor";

/** Record an audit event. `details` must not contain contact data or tokens. */
export async function audit(db: Executor, actor: Actor, operation: string, recordType: string, recordId: string | null, details: Record<string, unknown> = {}) {
  const a = auditActor(actor);
  await db.insert(auditEvent).values({ ...a, operation, recordType, recordId, details });
}
