import { z } from "zod";
import { listRequests } from "@redcord/booking/domain/admin";
import { json, query, staffRoute } from "@redcord/booking/lib/http";

export const GET = staffRoute(async (req, db, actor) => {
  const { state } = query(req, z.object({ state: z.enum(["pending", "resolved", "declined"]).default("pending") }));
  return json({ requests: await listRequests(db, actor, state) });
});
