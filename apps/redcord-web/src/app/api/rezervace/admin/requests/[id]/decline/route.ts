import { declineRequest } from "@redcord/booking/domain/booking";
import { declineRequestBody, uuid } from "@redcord/booking/lib/api-schemas";
import { body, json, staffRoute } from "@redcord/booking/lib/http";

export const POST = staffRoute<{ id: string }>(async (req, db, actor, { id }) => {
  const input = await body(req, declineRequestBody);
  await declineRequest(db, actor, { requestId: uuid.parse(id), ...input });
  return json({ ok: true });
});
