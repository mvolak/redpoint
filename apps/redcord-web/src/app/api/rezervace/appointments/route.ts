import { createAppointment } from "@redcord/booking/domain/booking";
import { DomainError } from "@redcord/booking/domain/errors";
import { getGuestSession } from "@redcord/booking/domain/verification";
import { createAppointmentBody } from "@redcord/booking/lib/api-schemas";
import { body, clientIp, GUEST_BOOKING_COOKIE, json, route } from "@redcord/booking/lib/http";
import { enforce } from "@redcord/booking/lib/rate-limit";

/** POST /api/appointments — verified session + idempotency key → confirmed appointment or conflict. */
export const POST = route(async (req, db) => {
  await enforce(db, [{ bucket: `book:ip:${clientIp(req)}`, max: 20, windowSeconds: 900 }]);
  const input = await body(req, createAppointmentBody);
  const session = await getGuestSession(db, req.cookies.get(GUEST_BOOKING_COOKIE)?.value, "booking");
  if (!session?.verified) throw new DomainError("unauthenticated", "Ověření e-mailu vypršelo. Ověřte prosím e-mail znovu.");
  const result = await createAppointment(db, {
    sessionId: session.id, serviceId: input.serviceId, therapistId: input.therapistId, start: input.start,
    termsVersion: input.termsVersion, contact: input.contact, idempotencyKey: input.idempotencyKey,
  });
  return json(result, { status: result.replayed ? 200 : 201 });
});
