import { z } from "zod";
import { supabaseServerClient } from "@redcord/booking/auth/staff";
import { DomainError } from "@redcord/booking/domain/errors";
import { env } from "@redcord/booking/lib/env";
import { body, clientIp, json, route } from "@redcord/booking/lib/http";
import { enforce } from "@redcord/booking/lib/rate-limit";

const mfaBody = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status") }),
  z.object({ action: z.literal("enroll") }),
  z.object({ action: z.literal("verify"), factorId: z.string().min(1).max(100), code: z.string().regex(/^\d{6}$/) }),
]);

/**
 * POST /api/admin/auth/mfa — TOTP enrolment and step-up to AAL2 via Supabase Auth.
 * Only meaningful with AUTH_PROVIDER=supabase (MFA is required for staff before production).
 */
export const POST = route(async (req, db) => {
  if (env().AUTH_PROVIDER !== "supabase") throw new DomainError("policy", "MFA je dostupné jen se Supabase Auth.");
  await enforce(db, [{ bucket: `staff-mfa:ip:${clientIp(req)}`, max: 20, windowSeconds: 900 }]);
  const input = await body(req, mfaBody);
  const supabase = await supabaseServerClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new DomainError("unauthenticated", "Přihlaste se prosím.");

  if (input.action === "status") {
    const { data } = await supabase.auth.mfa.listFactors();
    return json({ factors: (data?.totp ?? []).map((f) => ({ id: f.id, status: f.status })) });
  }
  if (input.action === "enroll") {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `booking-${Date.now()}` });
    if (error || !data) throw new DomainError("policy", "Registraci MFA se nepodařilo zahájit.");
    return json({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  }
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: input.factorId, code: input.code });
  if (error) throw new DomainError("validation", "Kód není platný.");
  return json({ ok: true });
});
