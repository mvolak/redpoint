import { cancelAppointment } from "@redcord/booking/domain/booking";
import { staffCancelBody, uuid } from "@redcord/booking/lib/api-schemas";
import { body, json, staffRoute } from "@redcord/booking/lib/http";

export const POST = staffRoute<{ id: string }>(async (req, db, actor, { id }) => {
  const { expectedVersion } = await body(req, staffCancelBody);
  return json(await cancelAppointment(db, { actor }, { appointmentId: uuid.parse(id), expectedVersion }));
});
