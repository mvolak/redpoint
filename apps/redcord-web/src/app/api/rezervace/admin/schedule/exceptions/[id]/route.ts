import { deleteException } from "@redcord/booking/domain/schedule";
import { uuid } from "@redcord/booking/lib/api-schemas";
import { json, staffRoute } from "@redcord/booking/lib/http";

export const DELETE = staffRoute<{ id: string }>(async (_req, db, actor, { id }) => {
  await deleteException(db, actor, uuid.parse(id));
  return json({ ok: true });
});
