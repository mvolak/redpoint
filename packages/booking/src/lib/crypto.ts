import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { env } from "./env";

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Keyed hash for tokens/OTP codes at rest. Raw values are never stored. */
export function secretHash(value: string, purpose: string): string {
  return createHmac("sha256", env().APP_SECRET).update(purpose).update("\0").update(value).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function otpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function reference(prefix: "RP" | "RQ"): string {
  let s = "";
  for (let i = 0; i < 7; i++) s += REF_ALPHABET[randomInt(0, REF_ALPHABET.length)];
  return `${prefix}-${s}`;
}

function stable(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, stable((v as Record<string, unknown>)[k])]));
  }
  return v;
}

export function fingerprint(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(stable(payload))).digest("hex");
}

export function maskEmail(email: string): string {
  const [user = "", domain = ""] = email.split("@");
  const u = user.length <= 2 ? user[0] + "*" : user[0] + "*".repeat(Math.min(user.length - 2, 5)) + user[user.length - 1];
  return `${u}@${domain}`;
}
