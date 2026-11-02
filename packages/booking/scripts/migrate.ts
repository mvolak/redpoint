// Applies migrations/*.sql in order, once each, inside a transaction per file.
import "./load-env";
import postgres from "postgres";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export async function migrate(url: string, log = true) {
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
    // Serialize concurrent migrators.
    await sql`SELECT pg_advisory_lock(727274)`;
    const dir = path.resolve(process.cwd(), "migrations");
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    const applied = new Set((await sql<{ name: string }[]>`SELECT name FROM schema_migrations`).map((r) => r.name));
    for (const file of files) {
      if (applied.has(file)) continue;
      const body = readFileSync(path.join(dir, file), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx`INSERT INTO schema_migrations (name) VALUES (${file})`;
      });
      if (log) console.log(`applied ${file}`);
    }
    await sql`SELECT pg_advisory_unlock(727274)`;
  } finally {
    await sql.end();
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]).replace(/\.ts$/, "") === path.resolve("scripts/migrate").replace(/\.ts$/, "");
if (isMain) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  migrate(url).then(() => console.log("migrations up to date")).catch((e) => { console.error(e); process.exit(1); });
}
