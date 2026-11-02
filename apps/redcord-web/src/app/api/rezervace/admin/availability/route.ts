import { findAvailability } from "@redcord/booking/domain/availability-query";
import { staffAvailabilityQuery } from "@redcord/booking/lib/api-schemas";
import { json, query, staffRoute } from "@redcord/booking/lib/http";

/** GET /api/admin/availability — staff view (no public lead time/horizon; shows free therapists). */
export const GET = staffRoute(async (req, db, actor) => {
  const q = query(req, staffAvailabilityQuery);
  return json(await findAvailability(db, { serviceId: q.serviceId, therapistId: q.therapistId ?? null, from: q.from, to: q.to }, { actor, staffView: true }));
});
