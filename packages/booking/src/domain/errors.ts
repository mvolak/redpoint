/** Typed domain errors. Route handlers map `code` → HTTP status and a Czech message. */
export type DomainErrorCode =
  | "validation"            // 400
  | "unauthenticated"       // 401
  | "forbidden"             // 403
  | "not_found"             // 404
  | "slot_unavailable"      // 409 — slot taken or no longer valid
  | "stale_version"         // 409 — optimistic concurrency failure
  | "schedule_conflict"     // 409 — hours/leave/block change would invalidate appointments
  | "idempotency_mismatch"  // 422 — same key, different payload
  | "policy"                // 422 — e.g. late cancellation, terms changed, mode
  | "rate_limited"          // 429
  | "booking_paused";       // 503

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const httpStatus: Record<DomainErrorCode, number> = {
  validation: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  slot_unavailable: 409,
  stale_version: 409,
  schedule_conflict: 409,
  idempotency_mismatch: 422,
  policy: 422,
  rate_limited: 429,
  booking_paused: 503,
};

/** PostgreSQL exclusion_violation */
export function isExclusionViolation(e: unknown): boolean {
  return findPgCode(e) === "23P01";
}

export function findPgCode(e: unknown): string | undefined {
  let cur: unknown = e;
  for (let i = 0; i < 5 && cur; i++) {
    const code = (cur as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    cur = (cur as { cause?: unknown }).cause;
  }
  return undefined;
}
