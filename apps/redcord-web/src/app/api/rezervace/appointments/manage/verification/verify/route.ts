import { verifyManageEmail } from "@redcord/booking/domain/verification";
import { manageVerifyBody } from "@redcord/booking/lib/api-schemas";
import { body, clientIp, json, route } from "@redcord/booking/lib/http";
import { requireManageSession } from "../../_session";

/** POST /api/appointments/manage/verification/verify {challengeId, code} → session becomes verified. */
export const POST = route(async (req, db) => {
  const s = await requireManageSession(req, db, { verified: false });
  const input = await body(req, manageVerifyBody);
  await verifyManageEmail(db, { sessionId: s.id, ...input, ip: clientIp(req) });
  return json({ verified: true });
});
