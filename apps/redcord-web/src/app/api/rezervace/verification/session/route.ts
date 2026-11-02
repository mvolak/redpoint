import { getGuestSession } from "@redcord/booking/domain/verification";
import { GUEST_BOOKING_COOKIE, json, route } from "@redcord/booking/lib/http";

/** GET /api/verification/session → current booking-session state (own email only). */
export const GET = route(async (req, db) => {
  const s = await getGuestSession(db, req.cookies.get(GUEST_BOOKING_COOKIE)?.value, "booking");
  if (!s || !s.verified) return json({ verified: false });
  return json({ verified: true, email: s.email, expiresAt: s.expiresAt.toISOString() });
});
