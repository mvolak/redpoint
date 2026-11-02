import { resolveRequest } from "@redcord/booking/domain/booking";
import { resolveRequestBody, uuid } from "@redcord/booking/lib/api-schemas";
import { body, json, staffRoute } from "@redcord/booking/lib/http";

/** Confirm a request by reserving a concrete, valid slot (same locking/constraints as bookings). */
export const POST = staffRoute<{ id: string }>(async (req, db, actor, { id }) => {
  const input = await body(req, resolveRequestBody);
  return json(await resolveRequest(db, actor, { requestId: uuid.parse(id), ...input }));
});
