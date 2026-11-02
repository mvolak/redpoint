import { listAppointments } from "@redcord/booking/domain/admin";
import { staffCreateAppointment } from "@redcord/booking/domain/booking";
import { staffCreateAppointmentBody, staffListQuery } from "@redcord/booking/lib/api-schemas";
import { body, json, query, staffRoute } from "@redcord/booking/lib/http";

/** GET /api/admin/appointments?from&to&therapistId?&states? — therapist scope enforced in the domain. */
export const GET = staffRoute(async (req, db, actor) => {
  const q = query(req, staffListQuery);
  return json({ appointments: await listAppointments(db, actor, q) });
});

/** POST /api/admin/appointments — reception creates an appointment (same transaction rules as online). */
export const POST = staffRoute(async (req, db, actor) => {
  const input = await body(req, staffCreateAppointmentBody);
  return json(await staffCreateAppointment(db, actor, input), { status: 201 });
});
