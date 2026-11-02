import { createAppointmentRequest } from "@redcord/booking/domain/booking";
import { getActivePolicy } from "@redcord/booking/domain/catalogue";
import { DomainError } from "@redcord/booking/domain/errors";
import { getGuestSession } from "@redcord/booking/domain/verification";
import { createRequestBody } from "@redcord/booking/lib/api-schemas";
import { body, clientIp, GUEST_BOOKING_COOKIE, json, route } from "@redcord/booking/lib/http";
import { enforce } from "@redcord/booking/lib/rate-limit";

/** POST /api/requests — verified contact + bounded preferences → pending request (reserves nothing). */
export const POST = route(async (req, db) => {
  await enforce(db, [{ bucket: `request:ip:${clientIp(req)}`, max: 10, windowSeconds: 900 }]);
  const input = await body(req, createRequestBody);
  const session = await getGuestSession(db, req.cookies.get(GUEST_BOOKING_COOKIE)?.value, "booking");
  if (!session?.verified) throw new DomainError("unauthenticated", "Ověření e-mailu vypršelo. Ověřte prosím e-mail znovu.");
  const policy = await getActivePolicy(db);
  if (policy.version !== input.termsVersion) throw new DomainError("policy", "Podmínky se změnily. Zkontrolujte je prosím a potvrďte znovu.", { reason: "terms_changed" });
  const result = await createAppointmentRequest(db, {
    sessionId: session.id, serviceId: input.serviceId, therapistId: input.therapistId,
    preferredFrom: input.preferredFrom, preferredTo: input.preferredTo, preferredTimeOfDay: input.preferredTimeOfDay,
    preferredStart: input.preferredStart, contact: input.contact, idempotencyKey: input.idempotencyKey,
  });
  return json(result, { status: result.replayed ? 200 : 201 });
});
