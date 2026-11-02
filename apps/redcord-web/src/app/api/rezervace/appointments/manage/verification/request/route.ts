import { requestManageVerification } from "@redcord/booking/domain/verification";
import { createEmailProvider } from "@redcord/booking/notifications/provider";
import { clientIp, json, route } from "@redcord/booking/lib/http";
import { requireManageSession } from "../../_session";

/** POST /api/appointments/manage/verification/request → OTP sent to the appointment's email. */
export const POST = route(async (req, db) => {
  const s = await requireManageSession(req, db, { verified: false });
  const { challengeId } = await requestManageVerification(db, createEmailProvider(db), { sessionId: s.id, ip: clientIp(req) });
  return json({ challengeId });
});
