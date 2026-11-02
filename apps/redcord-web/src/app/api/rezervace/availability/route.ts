import { findAvailability } from "@redcord/booking/domain/availability-query";
import { availabilityQuery } from "@redcord/booking/lib/api-schemas";
import { clientIp, json, query, route } from "@redcord/booking/lib/http";
import { enforce } from "@redcord/booking/lib/rate-limit";

/** GET /api/availability?serviceId&therapistId?&from&to — indicative free slots only. */
export const GET = route(async (req, db) => {
  await enforce(db, [{ bucket: `avail:ip:${clientIp(req)}`, max: 120, windowSeconds: 300 }]);
  const q = query(req, availabilityQuery);
  const res = await findAvailability(db, { serviceId: q.serviceId, therapistId: q.therapistId ?? null, from: q.from, to: q.to });
  return json({ ...res, indicative: true });
});
