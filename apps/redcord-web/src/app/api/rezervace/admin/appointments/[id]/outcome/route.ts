import { setAppointmentOutcome } from "@redcord/booking/domain/booking";
import { staffOutcomeBody, uuid } from "@redcord/booking/lib/api-schemas";
import { body, json, staffRoute } from "@redcord/booking/lib/http";

export const POST = staffRoute<{ id: string }>(async (req, db, actor, { id }) => {
  const input = await body(req, staffOutcomeBody);
  return json(await setAppointmentOutcome(db, actor, { appointmentId: uuid.parse(id), ...input }));
});
