import { cancelAppointment } from "@redcord/booking/domain/booking";
import { manageCancelBody } from "@redcord/booking/lib/api-schemas";
import { body, clientIp, json, route } from "@redcord/booking/lib/http";
import { enforce } from "@redcord/booking/lib/rate-limit";
import { requireManageSession } from "../_session";

/** POST /api/appointments/manage/cancel {expectedVersion} */
export const POST = route(async (req, db) => {
  await enforce(db, [{ bucket: `manage-mutate:ip:${clientIp(req)}`, max: 20, windowSeconds: 900 }]);
  const s = await requireManageSession(req, db, { verified: true });
  const { expectedVersion } = await body(req, manageCancelBody);
  return json(await cancelAppointment(db, { guestSessionId: s.id }, { appointmentId: s.appointmentId!, expectedVersion }));
});
