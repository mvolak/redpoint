import { upsertStaff } from "@redcord/booking/domain/admin";
import { staffBody, uuid } from "@redcord/booking/lib/api-schemas";
import { body, json, staffRoute } from "@redcord/booking/lib/http";

export const PUT = staffRoute<{ id: string }>(async (req, db, actor, { id }) => {
  const input = await body(req, staffBody);
  return json(await upsertStaff(db, actor, { ...input, id: uuid.parse(id) }));
});
