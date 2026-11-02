import { DEV_STAFF_COOKIE, supabaseServerClient } from "@redcord/booking/auth/staff";
import { env } from "@redcord/booking/lib/env";
import { json, route } from "@redcord/booking/lib/http";

/** POST /api/admin/auth/logout */
export const POST = route(async () => {
  if (env().AUTH_PROVIDER === "supabase") await (await supabaseServerClient()).auth.signOut();
  const res = json({ ok: true });
  res.cookies.delete(DEV_STAFF_COOKIE);
  return res;
});
