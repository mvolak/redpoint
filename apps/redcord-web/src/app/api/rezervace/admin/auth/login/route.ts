import { timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { staffProfile } from "@redcord/booking/db/schema";
import { DEV_STAFF_COOKIE, devAuthAllowed, issueDevStaffCookie, staffCookieOptions, supabaseServerClient } from "@redcord/booking/auth/staff";
import { DomainError } from "@redcord/booking/domain/errors";
import { audit } from "@redcord/booking/domain/audit";
import { staffLoginBody } from "@redcord/booking/lib/api-schemas";
import { env } from "@redcord/booking/lib/env";
import { body, clientIp, json, route } from "@redcord/booking/lib/http";
import { enforce } from "@redcord/booking/lib/rate-limit";

const INVALID = "Neplatný e-mail nebo heslo.";

/** POST /api/admin/auth/login {email, password} */
export const POST = route(async (req, db) => {
  await enforce(db, [{ bucket: `staff-login:ip:${clientIp(req)}`, max: 10, windowSeconds: 900 }]);
  const { email, password } = await body(req, staffLoginBody);

  if (env().AUTH_PROVIDER === "dev") {
    if (!devAuthAllowed()) throw new DomainError("forbidden", "Vývojové přihlášení je vypnuté.");
    const expected = Buffer.from(env().DEV_STAFF_PASSWORD ?? "");
    const got = Buffer.from(password);
    const okPassword = expected.length > 0 && expected.length === got.length && timingSafeEqual(expected, got);
    const [p] = await db.select().from(staffProfile).where(and(eq(staffProfile.email, email), eq(staffProfile.active, true)));
    if (!okPassword || !p) throw new DomainError("unauthenticated", INVALID);
    await audit(db, { kind: "staff", staffId: p.id, role: p.role, therapistId: p.therapistId, displayName: p.displayName }, "staff.login", "staff_profile", p.id, { provider: "dev" });
    const res = json({ ok: true, mfaRequired: false });
    res.cookies.set(DEV_STAFF_COOKIE, issueDevStaffCookie(p.id), { ...staffCookieOptions(), maxAge: 10 * 3600 });
    return res;
  }

  const supabase = await supabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new DomainError("unauthenticated", INVALID);
  const [p] = await db.select().from(staffProfile).where(and(eq(staffProfile.authSubject, data.user.id), eq(staffProfile.active, true)));
  if (!p) {
    await supabase.auth.signOut();
    throw new DomainError("forbidden", "Účet nemá přiřazený aktivní profil zaměstnance.");
  }
  await audit(db, { kind: "staff", staffId: p.id, role: p.role, therapistId: p.therapistId, displayName: p.displayName }, "staff.login", "staff_profile", p.id, { provider: "supabase" });
  return json({ ok: true, mfaRequired: env().STAFF_REQUIRE_MFA === "true" });
});
