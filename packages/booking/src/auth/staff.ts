// Staff authentication. Separate from guest verification; host-only cookies, no WordPress SSO,
// no parent-domain cookies (spec §12). Authorisation happens in the domain layer.
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Db } from "../db/client";
import { staffProfile } from "../db/schema";
import type { StaffActor } from "../domain/actor";
import { env, isDevelopment } from "../lib/env";

export const DEV_STAFF_COOKIE = "rp_staff";
const DEV_SESSION_HOURS = 10;

export type StaffAuthState =
  | { status: "anonymous" }
  | { status: "needs_mfa"; email: string | null }
  | { status: "no_profile"; email: string | null }
  | { status: "ok"; actor: StaffActor };

function toActor(p: typeof staffProfile.$inferSelect): StaffActor {
  return { kind: "staff", staffId: p.id, role: p.role, therapistId: p.therapistId, displayName: p.displayName };
}

// ------------------------------------------------------------------ dev provider (local only)

function sign(payload: string) {
  return createHmac("sha256", env().APP_SECRET).update("dev-staff\0" + payload).digest("base64url");
}

export function issueDevStaffCookie(staffId: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ sub: staffId, exp: now + DEV_SESSION_HOURS * 3_600_000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readDevStaffCookie(value: string | undefined, now = Date.now()): string | null {
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  try {
    const { sub, exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { sub: string; exp: number };
    return exp > now ? sub : null;
  } catch {
    return null;
  }
}

export function devAuthAllowed() {
  return env().AUTH_PROVIDER === "dev" && isDevelopment();
}

export const staffCookieOptions = () => ({
  httpOnly: true,
  secure: env().APP_URL.startsWith("https://"),
  sameSite: "lax" as const,
  path: "/",
  // no `domain`: host-only cookie, never shared with redpoint-clinic.cz
});

// ------------------------------------------------------------------ supabase provider

export async function supabaseServerClient() {
  const e = env();
  const store = await cookies();
  return createServerClient(e.NEXT_PUBLIC_SUPABASE_URL!, e.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const c of list) store.set(c.name, c.value, { ...c.options, domain: undefined });
        } catch {
          // Called from a Server Component: cookies are read-only there; middleware/route handlers refresh them.
        }
      },
    },
  });
}

// ------------------------------------------------------------------ resolve current staff

export async function getStaffAuth(db: Db): Promise<StaffAuthState> {
  const e = env();
  if (e.AUTH_PROVIDER === "dev") {
    if (!devAuthAllowed()) return { status: "anonymous" };
    const store = await cookies();
    const staffId = readDevStaffCookie(store.get(DEV_STAFF_COOKIE)?.value);
    if (!staffId) return { status: "anonymous" };
    const [p] = await db.select().from(staffProfile).where(and(eq(staffProfile.id, staffId), eq(staffProfile.active, true)));
    return p ? { status: "ok", actor: toActor(p) } : { status: "anonymous" };
  }

  const supabase = await supabaseServerClient();
  const { data, error } = await supabase.auth.getUser(); // verifies the JWT with Supabase Auth
  if (error || !data.user) return { status: "anonymous" };
  if (e.STAFF_REQUIRE_MFA === "true") {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== "aal2") return { status: "needs_mfa", email: data.user.email ?? null };
  }
  const [p] = await db.select().from(staffProfile).where(and(eq(staffProfile.authSubject, data.user.id), eq(staffProfile.active, true)));
  if (!p) return { status: "no_profile", email: data.user.email ?? null };
  return { status: "ok", actor: toActor(p) };
}

export async function getStaffActor(db: Db): Promise<StaffActor | null> {
  const s = await getStaffAuth(db);
  return s.status === "ok" ? s.actor : null;
}
