import { listAudit } from "@redcord/booking/domain/admin";
import { json, staffRoute } from "@redcord/booking/lib/http";

export const GET = staffRoute(async (_req, db, actor) => json({ events: await listAudit(db, actor) }));
