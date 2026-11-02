import { getAppointmentDetail } from "@redcord/booking/domain/admin";
import { uuid } from "@redcord/booking/lib/api-schemas";
import { json, staffRoute } from "@redcord/booking/lib/http";

export const GET = staffRoute<{ id: string }>(async (_req, db, actor, { id }) => {
  return json(await getAppointmentDetail(db, actor, uuid.parse(id)));
});
