import { sql } from "drizzle-orm";
import type { Executor } from "../db/client";
import { DomainError } from "../domain/errors";

export type Limit = { bucket: string; max: number; windowSeconds: number };

/** Fixed-window counter in Postgres: shared across app instances, survives restarts. */
export async function hit(db: Executor, limit: Limit, now = new Date()): Promise<boolean> {
  const windowStart = new Date(Math.floor(now.getTime() / (limit.windowSeconds * 1000)) * limit.windowSeconds * 1000);
  const rows = await db.execute<{ count: number }>(sql`
    INSERT INTO rate_limit (bucket, window_start, count) VALUES (${limit.bucket}, ${windowStart.toISOString()}::timestamptz, 1)
    ON CONFLICT (bucket, window_start) DO UPDATE SET count = rate_limit.count + 1
    RETURNING count`);
  return Number(rows[0]!.count) <= limit.max;
}

export async function enforce(db: Executor, limits: Limit[], now = new Date()) {
  for (const l of limits) {
    if (!(await hit(db, l, now))) throw new DomainError("rate_limited", "Příliš mnoho pokusů. Zkuste to prosím za chvíli.");
  }
}

export async function pruneRateLimits(db: Executor, olderThanHours = 24) {
  await db.execute(sql`DELETE FROM rate_limit WHERE window_start < now() - make_interval(hours => ${olderThanHours})`);
}
