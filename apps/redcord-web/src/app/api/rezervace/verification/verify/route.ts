import { verifyBookingEmail } from "@redcord/booking/domain/verification";
import { verificationVerifyBody } from "@redcord/booking/lib/api-schemas";
import { body, clientIp, GUEST_BOOKING_COOKIE, guestCookieOptions, json, route } from "@redcord/booking/lib/http";

/** POST /api/verification/verify {challengeId, code} → sets a short-lived booking-session cookie. */
export const POST = route(async (req, db) => {
  const input = await body(req, verificationVerifyBody);
  const s = await verifyBookingEmail(db, { ...input, ip: clientIp(req) });
  const res = json({ verified: true, email: s.email, expiresAt: s.expiresAt.toISOString() });
  res.cookies.set(GUEST_BOOKING_COOKIE, s.token, guestCookieOptions(s.expiresAt));
  return res;
});
