import { updateService } from "@redcord/booking/domain/admin";
import { serviceUpdateBody, uuid } from "@redcord/booking/lib/api-schemas";
import { body, json, staffRoute } from "@redcord/booking/lib/http";

/** PATCH — affects future bookings only; existing appointments keep their snapshot. */
export const PATCH = staffRoute<{ id: string }>(async (req, db, actor, { id }) => {
  const patch = await body(req, serviceUpdateBody);
  return json(await updateService(db, actor, uuid.parse(id), patch));
});
