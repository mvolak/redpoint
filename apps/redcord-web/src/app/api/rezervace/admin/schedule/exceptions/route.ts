import { addException } from "@redcord/booking/domain/schedule";
import { exceptionBody } from "@redcord/booking/lib/api-schemas";
import { body, json, staffRoute } from "@redcord/booking/lib/http";

export const POST = staffRoute(async (req, db, actor) => {
  const input = await body(req, exceptionBody);
  return json(await addException(db, actor, input), { status: 201 });
});
