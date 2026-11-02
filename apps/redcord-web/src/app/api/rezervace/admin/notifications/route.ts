import { z } from "zod";
import { listNotifications } from "@redcord/booking/domain/admin";
import { json, query, staffRoute } from "@redcord/booking/lib/http";

export const GET = staffRoute(async (req, db, actor) => {
  const { status } = query(req, z.object({ status: z.enum(["pending", "sending", "sent", "failed", "skipped"]).optional() }));
  return json({ notifications: await listNotifications(db, actor, status) });
});
