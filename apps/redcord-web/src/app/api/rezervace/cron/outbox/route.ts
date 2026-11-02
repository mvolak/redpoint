import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { getDb } from "@redcord/booking/db/client";
import { bookingConfigured, env } from "@redcord/booking/lib/env";
import { errorResponse, json } from "@redcord/booking/lib/http";
import { pruneRateLimits } from "@redcord/booking/lib/rate-limit";
import { createEmailProvider } from "@redcord/booking/notifications/provider";
import { runWorkerTick } from "@redcord/booking/notifications/outbox";

function authorised(req: NextRequest) {
  const secret = env().CRON_SECRET;
  const got = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return !!secret && got.length === expected.length && timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

/**
 * Scheduled worker endpoint for hosts with HTTP cron (e.g. Vercel Cron → GET with Bearer secret).
 * Alternatively run `npm run worker` as a long-lived process. Both use the same durable outbox.
 */
async function handler(req: NextRequest) {
  if (!bookingConfigured()) return json({ error: { code: "unavailable" } }, { status: 503 });
  try {
    if (!authorised(req)) return json({ error: { code: "forbidden" } }, { status: 403 });
    const db = getDb();
    const result = await runWorkerTick(db, createEmailProvider(db));
    await pruneRateLimits(db);
    return json(result);
  } catch (e) {
    return errorResponse(e);
  }
}

export const GET = handler;
export const POST = handler;
export const dynamic = "force-dynamic";
