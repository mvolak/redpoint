import { getSchedule, setWorkingHours } from "@redcord/booking/domain/schedule";
import { hoursBody, uuid } from "@redcord/booking/lib/api-schemas";
import { body, json, staffRoute } from "@redcord/booking/lib/http";

/** GET /api/admin/schedule/:therapistId — weekly hours, upcoming exceptions and blocks. */
export const GET = staffRoute<{ therapistId: string }>(async (_req, db, actor, { therapistId }) => {
  return json(await getSchedule(db, actor, uuid.parse(therapistId)));
});

/** PUT /api/admin/schedule/:therapistId {rules} — admin; rejected if it would invalidate appointments. */
export const PUT = staffRoute<{ therapistId: string }>(async (req, db, actor, { therapistId }) => {
  const { rules } = await body(req, hoursBody);
  await setWorkingHours(db, actor, uuid.parse(therapistId), rules);
  return json({ ok: true });
});
