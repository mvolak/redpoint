import { devAuthAllowed } from "@redcord/booking/auth/staff";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  let dev = false;
  try { dev = devAuthAllowed(); } catch { dev = false; }
  return <LoginForm devHint={dev} />;
}
