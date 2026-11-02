import { rescheduleAppointment } from "@redcord/booking/domain/booking";
import { staffRescheduleBody, uuid } from "@redcord/booking/lib/api-schemas";
import { body, json, staffRoute } from "@redcord/booking/lib/http";

export const POST = staffRoute<{ id: string }>(async (req, db, actor, { id }) => {
  const input = await body(req, staffRescheduleBody);
  return json(await rescheduleAppointment(db, { actor }, { appointmentId: uuid.parse(id), expectedVersion: input.expectedVersion, start: input.start, therapistId: input.therapistId ?? null }));
});
