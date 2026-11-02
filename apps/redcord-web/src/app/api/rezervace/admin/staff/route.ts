import { listStaff, upsertStaff } from "@redcord/booking/domain/admin";
import { staffBody } from "@redcord/booking/lib/api-schemas";
import { body, json, staffRoute } from "@redcord/booking/lib/http";

export const GET = staffRoute(async (_req, db, actor) => json({ staff: await listStaff(db, actor) }));

export const POST = staffRoute(async (req, db, actor) => {
  const input = await body(req, staffBody);
  return json(await upsertStaff(db, actor, { ...input, id: undefined }), { status: 201 });
});
