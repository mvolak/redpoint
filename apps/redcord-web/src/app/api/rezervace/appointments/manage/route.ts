import { getManagedAppointment } from "@redcord/booking/domain/verification";
import { json, route } from "@redcord/booking/lib/http";
import { requireManageSession } from "./_session";

/** GET /api/appointments/manage → minimal appointment details for a verified management session. */
export const GET = route(async (req, db) => {
  const s = await requireManageSession(req, db, { verified: true });
  return json(await getManagedAppointment(db, s.id));
});
