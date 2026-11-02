import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { env } from "../lib/env";

export type Db = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
/** Anything that can run queries: the pool or an open transaction. */
export type Executor = Db | Tx;

export function createDb(url: string, opts: { max?: number; prepare?: boolean } = {}) {
  const client = postgres(url, {
    max: opts.max ?? 10,
    prepare: opts.prepare ?? true,
    // Never log query parameters (contact data, tokens).
    debug: false,
    onnotice: () => {},
    types: { bigint: postgres.BigInt },
  });
  const db = drizzle(client, { schema });
  return { db, client };
}

const globalForDb = globalThis as unknown as { __bookingDb?: ReturnType<typeof createDb> };

/** Process-wide pool (survives Next.js dev hot reloads). */
export function getDb(): Db {
  if (!globalForDb.__bookingDb) {
    const e = env();
    globalForDb.__bookingDb = createDb(e.DATABASE_URL, { max: e.DATABASE_POOL_MAX, prepare: e.DATABASE_PREPARE === "true" });
  }
  return globalForDb.__bookingDb.db;
}
