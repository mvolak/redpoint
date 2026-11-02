import { rescheduleAppointment } from "@redcord/booking/domain/booking";
import { manageRescheduleBody } from "@redcord/booking/lib/api-schemas";
import { body, clientIp, json, route } from "@redcord/booking/lib/http";
import { enforce } from "@redcord/booking/lib/rate-limit";
import { requireManageSession } from "../_session";

/** POST /api/appointments/manage/reschedule {expectedVersion, start} — same therapist and service. */
export const POST = route(async (req, db) => {
  await enforce(db, [{ bucket: `manage-mutate:ip:${clientIp(req)}`, max: 20, windowSeconds: 900 }]);
  const s = await requireManageSession(req, db, { verified: true });
  const input = await body(req, manageRescheduleBody);
  return json(await rescheduleAppointment(db, { guestSessionId: s.id }, { appointmentId: s.appointmentId!, expectedVersion: input.expectedVersion, start: input.start }));
});
