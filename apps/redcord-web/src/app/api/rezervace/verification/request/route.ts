import { requestBookingVerification } from "@redcord/booking/domain/verification";
import { createEmailProvider } from "@redcord/booking/notifications/provider";
import { verificationRequestBody } from "@redcord/booking/lib/api-schemas";
import { body, clientIp, json, route } from "@redcord/booking/lib/http";

/** POST /api/verification/request {email} → {challengeId}. Generic response; never reveals whether the address is known. */
export const POST = route(async (req, db) => {
  const { email } = await body(req, verificationRequestBody);
  const { challengeId } = await requestBookingVerification(db, createEmailProvider(db), { email, ip: clientIp(req) });
  return json({ challengeId, message: "Pokud je adresa platná, poslali jsme na ni ověřovací kód." });
});
