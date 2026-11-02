import { listTherapistsForStaff } from "@redcord/booking/domain/schedule";
import { json, staffRoute } from "@redcord/booking/lib/http";

export const GET = staffRoute(async (_req, db, actor) => json({ therapists: await listTherapistsForStaff(db, actor) }));
