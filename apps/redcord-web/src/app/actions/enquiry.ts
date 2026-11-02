"use server";

import { headers } from "next/headers";
import {
  createRateLimiter,
  getEnquiryAdapter,
  submitEnquiry,
  validateEnquiry,
  type FieldErrors,
} from "@redcord/integrations";
import { site } from "@/config/site";

export type EnquiryState =
  | { status: "idle" }
  | { status: "invalid"; errors: FieldErrors; values: Record<string, string> }
  | { status: "test-discarded"; department: string }
  | { status: "accepted"; reference: string }
  | { status: "failed"; values: Record<string, string> }
  | { status: "rate-limited"; values: Record<string, string> };

// Prototype-grade, per-instance limiter: 5 submissions / 10 minutes / client address.
const allow = createRateLimiter(5, 10 * 60 * 1000);

const KEEP = ["name", "email", "phone", "company", "department", "reference", "message", "acknowledged"] as const;

function echo(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of KEEP) {
    const v = fd.get(k);
    if (typeof v === "string") out[k] = v.slice(0, 2000);
  }
  return out;
}

export async function submitEnquiryAction(_prev: EnquiryState, fd: FormData): Promise<EnquiryState> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  if (!allow(ip)) return { status: "rate-limited", values: echo(fd) };

  const result = validateEnquiry(fd);
  if (!result.ok) {
    // Honeypot hit: respond like a normal test submission without processing anything.
    if (result.spam) return { status: "test-discarded", department: "" };
    return { status: "invalid", errors: result.errors, values: echo(fd) };
  }

  let adapter;
  try {
    adapter = getEnquiryAdapter(site.features.enquiryAdapter);
  } catch {
    return { status: "failed", values: echo(fd) };
  }

  const outcome = await submitEnquiry(adapter, result.value);
  switch (outcome.status) {
    case "test-discarded":
      return { status: "test-discarded", department: result.value.department };
    case "accepted":
      return { status: "accepted", reference: outcome.reference };
    case "failed":
      return { status: "failed", values: echo(fd) };
  }
}
