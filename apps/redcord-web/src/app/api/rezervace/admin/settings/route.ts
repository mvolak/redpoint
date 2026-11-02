import { publishPolicy, updateSettings } from "@redcord/booking/domain/admin";
import { requireStaff } from "@redcord/booking/domain/actor";
import { getActivePolicy, getSettings } from "@redcord/booking/domain/catalogue";
import { policyBody, settingsBody } from "@redcord/booking/lib/api-schemas";
import { body, json, staffRoute } from "@redcord/booking/lib/http";

export const GET = staffRoute(async (_req, db, actor) => {
  requireStaff(actor, "reception");
  const [settings, policy] = await Promise.all([getSettings(db), getActivePolicy(db)]);
  return json({ settings, policy });
});

/** PUT — public mode (automatic / request_only / paused) and reception contact. */
export const PUT = staffRoute(async (req, db, actor) => {
  const input = await body(req, settingsBody);
  return json(await updateSettings(db, actor, input));
});

/** POST — publish a new policy version (admin). New bookings must acknowledge the new version. */
export const POST = staffRoute(async (req, db, actor) => {
  const input = await body(req, policyBody);
  return json(await publishPolicy(db, actor, input), { status: 201 });
});
