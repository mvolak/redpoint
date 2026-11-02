import { listCatalogueForAdmin, setTherapistService } from "@redcord/booking/domain/admin";
import { therapistServiceBody } from "@redcord/booking/lib/api-schemas";
import { body, json, staffRoute } from "@redcord/booking/lib/http";

export const GET = staffRoute(async (_req, db, actor) => json(await listCatalogueForAdmin(db, actor)));

/** PUT — set therapist eligibility and explicit overrides for a service (admin). */
export const PUT = staffRoute(async (req, db, actor) => {
  const input = await body(req, therapistServiceBody);
  await setTherapistService(db, actor, input);
  return json({ ok: true });
});
