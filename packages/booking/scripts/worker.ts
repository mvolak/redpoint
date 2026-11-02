// Long-running outbox worker: reminders + email delivery with retries. Safe to run several
// instances (rows are claimed with FOR UPDATE SKIP LOCKED). `--once` runs a single tick.
import "./load-env";
import { getDb } from "../src/db/client";
import { pruneRateLimits } from "../src/lib/rate-limit";
import { createEmailProvider } from "../src/notifications/provider";
import { runWorkerTick } from "../src/notifications/outbox";

const INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS ?? 30_000);
const once = process.argv.includes("--once");
const db = getDb();
const mail = createEmailProvider(db);
let stopping = false;

async function tick() {
  try {
    const r = await runWorkerTick(db, mail);
    if (r.reminders || r.sent || r.retry || r.failed || r.skipped) console.log(new Date().toISOString(), JSON.stringify(r));
  } catch (e) {
    console.error(new Date().toISOString(), "worker tick failed:", (e as Error).message);
  }
}

if (once) {
  await tick();
  process.exit(0);
}

process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });
console.log(`outbox worker running every ${INTERVAL_MS / 1000}s (email provider: ${mail.name})`);
let n = 0;
while (!stopping) {
  await tick();
  if (++n % 120 === 0) await pruneRateLimits(db).catch(() => {});
  await new Promise((r) => setTimeout(r, INTERVAL_MS));
}
process.exit(0);
