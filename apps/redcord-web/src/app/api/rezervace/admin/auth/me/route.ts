import { getStaffAuth } from "@redcord/booking/auth/staff";
import { json, route } from "@redcord/booking/lib/http";

/** GET /api/admin/auth/me → authentication state for the admin UI. */
export const GET = route(async (_req, db) => {
  const s = await getStaffAuth(db);
  if (s.status === "ok") return json({ status: "ok", staff: { id: s.actor.staffId, role: s.actor.role, therapistId: s.actor.therapistId, displayName: s.actor.displayName } });
  return json({ status: s.status }, { status: s.status === "anonymous" ? 401 : 403 });
});
