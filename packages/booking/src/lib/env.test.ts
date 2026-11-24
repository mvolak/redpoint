import { afterEach, describe, expect, it } from "vitest";
import { assertLocalIfDevelopment, env, resetEnvCache } from "./env";

describe("assertLocalIfDevelopment", () => {
  it.each(["http://localhost:3000", "http://127.0.0.1:3100", "http://[::1]:3000"])("allows development on %s", (url) => {
    expect(() => assertLocalIfDevelopment("development", url, {})).not.toThrow();
    expect(() => assertLocalIfDevelopment("test", url, {})).not.toThrow();
  });

  it.each(["https://redpoint-smoky.vercel.app", "https://www.redcord.cz", "http://localhost.evil.example", "http://192.168.1.10:3000"])(
    "refuses development on %s",
    (url) => {
      expect(() => assertLocalIfDevelopment("development", url, {})).toThrow(/requires APP_URL on localhost/);
    },
  );

  it("refuses development on Vercel even with a localhost APP_URL", () => {
    expect(() => assertLocalIfDevelopment("development", "http://localhost:3000", { VERCEL: "1" })).toThrow(/not allowed on Vercel/);
  });

  it("ignores staging and production", () => {
    expect(() => assertLocalIfDevelopment("staging", "https://redpoint-smoky.vercel.app", { VERCEL: "1" })).not.toThrow();
    expect(() => assertLocalIfDevelopment("production", "https://www.redcord.cz", { VERCEL: "1" })).not.toThrow();
  });
});

describe("env() fails closed", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
    resetEnvCache();
  });

  it("throws when a deployment forgets APP_ENV", () => {
    process.env = {
      ...saved,
      DATABASE_URL: "postgres://x@localhost/x",
      APP_SECRET: "x".repeat(32),
      APP_URL: "https://redpoint-smoky.vercel.app",
      APP_ENV: undefined,
      VERCEL: "1",
    };
    resetEnvCache();
    expect(() => env()).toThrow(/APP_ENV=development requires APP_URL on localhost/);
  });
});
