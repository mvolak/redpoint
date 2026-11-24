import { z } from "zod";

const schema = z.object({
  APP_URL: z.string().url().default("http://localhost:3000"),
  APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  CLINIC_SITE_URL: z.string().url().default("https://redpoint-clinic.cz/"),
  DATABASE_URL: z.string().min(1),
  DATABASE_PREPARE: z.enum(["true", "false"]).default("true"),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  APP_SECRET: z.string().min(32, "APP_SECRET must be at least 32 characters"),
  AUTH_PROVIDER: z.enum(["dev", "supabase"]).default("dev"),
  DEV_STAFF_PASSWORD: z.string().optional(),
  STAFF_REQUIRE_MFA: z.enum(["true", "false"]).default("false"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  EMAIL_PROVIDER: z.enum(["capture", "smtp", "failing"]).default("capture"),
  EMAIL_FROM: z.string().default("Redpoint Clinic <rezervace@example.invalid>"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_SECURE: z.enum(["true", "false"]).default("false"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_REDIRECT_ALL_TO: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  ROBOTS_NOINDEX: z.enum(["true", "false"]).default("true"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error("Invalid environment configuration: " + parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  const e = parsed.data;
  const isDeployed = e.APP_ENV === "staging" || e.APP_ENV === "production";
  if (isDeployed && e.AUTH_PROVIDER === "dev") throw new Error("AUTH_PROVIDER=dev is not allowed in staging/production");
  if (isDeployed && e.EMAIL_PROVIDER !== "smtp") throw new Error("EMAIL_PROVIDER must be smtp in staging/production");
  if (e.APP_ENV === "production" && e.STAFF_REQUIRE_MFA !== "true") throw new Error("STAFF_REQUIRE_MFA must be true in production");
  assertLocalIfDevelopment(e.APP_ENV, e.APP_URL, process.env);
  cached = e;
  return e;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Development/test mode enables dev staff login, the captured-mail inbox (/rezervace/dev/mailbox,
 * which shows OTP codes) and dev hints. That must never be reachable from the internet, so it is
 * only allowed when APP_URL is a loopback host and the process isn't running on a known host
 * (Vercel). A deployment that forgets APP_ENV fails closed instead of exposing the inbox.
 */
export function assertLocalIfDevelopment(appEnv: Env["APP_ENV"], appUrl: string, processEnv: NodeJS.ProcessEnv): void {
  if (appEnv !== "development" && appEnv !== "test") return;
  const host = new URL(appUrl).hostname;
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(`APP_ENV=${appEnv} requires APP_URL on localhost (got ${host}); set APP_ENV=staging or production`);
  }
  if (processEnv.VERCEL) {
    throw new Error(`APP_ENV=${appEnv} is not allowed on Vercel; set APP_ENV=staging or production`);
  }
}

/**
 * Booking needs its database and secret. The Redcord site must still build and run without them
 * (review deployments, `pnpm review`), so pages and API routes check this before calling env().
 */
export function bookingConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.APP_SECRET);
}

export function isDevelopment() {
  const e = env().APP_ENV;
  return e === "development" || e === "test";
}

/** Test helper: reset cached env after mutating process.env. */
export function resetEnvCache() {
  cached = undefined;
}
