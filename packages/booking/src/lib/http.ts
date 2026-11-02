import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type z } from "zod";
import { getDb, type Db } from "../db/client";
import { getStaffActor } from "../auth/staff";
import type { StaffActor } from "../domain/actor";
import { DomainError, httpStatus } from "../domain/errors";
import { bookingConfigured, env } from "./env";

export const NO_STORE = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" };

export function json(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return NextResponse.json(body, { status: init.status ?? 200, headers: { ...NO_STORE, ...init.headers } });
}

export function errorResponse(e: unknown) {
  if (e instanceof DomainError) {
    return json({ error: { code: e.code, message: e.message, details: e.details ?? null } }, { status: httpStatus[e.code] });
  }
  if (e instanceof ZodError) {
    return json({
      error: { code: "validation", message: "Zkontrolujte prosím zadané údaje.", details: { issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })) } },
    }, { status: 400 });
  }
  // Never log request bodies, contact data or tokens (spec §12). Log type + message only.
  const err = e as Error;
  console.error(`[api] unhandled ${err?.name ?? "Error"}: ${String(err?.message ?? e).slice(0, 200).replace(/[^\s@]+@[^\s@]+/g, "[email]")}`);
  return json({ error: { code: "internal", message: "Něco se nepovedlo. Zkuste to prosím znovu, případně kontaktujte recepci." } }, { status: 500 });
}

/**
 * CSRF/origin protection for state-changing requests: browsers always send Origin on
 * cross-site POST/PUT/PATCH/DELETE; reject anything not from our own origin.
 */
export function assertSameOrigin(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD") return;
  const origin = req.headers.get("origin");
  const allowed = new URL(env().APP_URL).origin;
  const self = req.nextUrl.origin;
  if (!origin || (origin !== allowed && origin !== self)) {
    throw new DomainError("forbidden", "Neplatný původ požadavku.");
  }
}

export function clientIp(req: NextRequest): string {
  // Behind the hosting proxy, the left-most X-Forwarded-For entry is the client.
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function body<S extends z.ZodType>(req: NextRequest, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new DomainError("validation", "Neplatný formát požadavku.");
  }
  return schema.parse(raw);
}

export function query<S extends z.ZodType>(req: NextRequest, schema: S): z.infer<S> {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
}

type Ctx<P> = { params: Promise<P> };

/** Public route wrapper. */
export function route<P = Record<string, string>>(fn: (req: NextRequest, db: Db, params: P) => Promise<Response>) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    if (!bookingConfigured()) {
      return json({ error: { code: "unavailable", message: "Online rezervace nejsou v tomto prostředí připojené." } }, { status: 503 });
    }
    try {
      assertSameOrigin(req);
      return await fn(req, getDb(), (await ctx?.params) ?? ({} as P));
    } catch (e) {
      return errorResponse(e);
    }
  };
}

/** Staff route wrapper: resolves the authenticated actor; domain functions enforce role/scope. */
export function staffRoute<P = Record<string, string>>(fn: (req: NextRequest, db: Db, actor: StaffActor, params: P) => Promise<Response>) {
  return route<P>(async (req, db, params) => {
    const actor = await getStaffActor(db);
    if (!actor) throw new DomainError("unauthenticated", "Přihlaste se prosím.");
    return fn(req, db, actor, params);
  });
}

export const GUEST_BOOKING_COOKIE = "rp_bs";
export const GUEST_MANAGE_COOKIE = "rp_ms";

export function guestCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: env().APP_URL.startsWith("https://"),
    sameSite: "strict" as const,
    path: "/",
    expires,
  };
}
