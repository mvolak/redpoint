import { createBlock } from "@redcord/booking/domain/schedule";
import { blockBody } from "@redcord/booking/lib/api-schemas";
import { body, json, staffRoute } from "@redcord/booking/lib/http";

export const POST = staffRoute(async (req, db, actor) => {
  const input = await body(req, blockBody);
  return json(await createBlock(db, actor, input), { status: 201 });
});
