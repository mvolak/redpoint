import { retryNotification } from "@redcord/booking/domain/admin";
import { uuid } from "@redcord/booking/lib/api-schemas";
import { json, staffRoute } from "@redcord/booking/lib/http";

export const POST = staffRoute<{ id: string }>(async (_req, db, actor, { id }) => {
  await retryNotification(db, actor, uuid.parse(id));
  return json({ ok: true });
});
