import { exchangeManagementToken } from "@redcord/booking/domain/verification";
import { manageSessionBody } from "@redcord/booking/lib/api-schemas";
import { body, clientIp, GUEST_MANAGE_COOKIE, guestCookieOptions, json, route } from "@redcord/booking/lib/http";

/**
 * POST /api/appointments/manage/session {token}
 * Exchanges the emailed link token (read by the page from the URL fragment) for an unverified
 * management session cookie. Reveals only a masked email; changes nothing.
 */
export const POST = route(async (req, db) => {
  const { token } = await body(req, manageSessionBody);
  const s = await exchangeManagementToken(db, { token, ip: clientIp(req) });
  const res = json({ maskedEmail: s.maskedEmail, verified: false });
  res.cookies.set(GUEST_MANAGE_COOKIE, s.token, guestCookieOptions(s.expiresAt));
  return res;
});
