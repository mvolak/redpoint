import type { NextRequest } from "next/server";
import type { Db } from "@redcord/booking/db/client";
import { DomainError } from "@redcord/booking/domain/errors";
import { getGuestSession } from "@redcord/booking/domain/verification";
import { GUEST_MANAGE_COOKIE } from "@redcord/booking/lib/http";

export async function requireManageSession(req: NextRequest, db: Db, opts: { verified: boolean }) {
  const s = await getGuestSession(db, req.cookies.get(GUEST_MANAGE_COOKIE)?.value, "manage");
  if (!s) throw new DomainError("unauthenticated", "Relace vypršela. Otevřete prosím odkaz z e-mailu znovu.");
  if (opts.verified && !s.verified) throw new DomainError("unauthenticated", "Nejprve ověřte e-mail kódem.");
  return s;
}
