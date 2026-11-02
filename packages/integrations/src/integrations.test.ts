import { describe, expect, it } from "vitest";
import {
  createRateLimiter,
  getClinicBookingUrl,
  getEnquiryAdapter,
  sanitiseProps,
  submitEnquiry,
  testEnquiryAdapter,
  validateEnquiry,
  type EnquiryAdapter,
} from "./index";

const valid = {
  name: "Jana Nováková",
  email: "jana@example.cz",
  department: "obchod",
  message: "Dobrý den, zajímá nás instalace pro naši kliniku.",
  acknowledged: "on",
};

describe("enquiry validation", () => {
  it("accepts a valid enquiry and drops empty optionals", () => {
    const r = validateEnquiry({ ...valid, phone: "" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).not.toHaveProperty("phone");
  });

  it("rejects an unknown or tampered department", () => {
    for (const department of ["", "vedeni", "admin", "<script>"]) {
      const r = validateEnquiry({ ...valid, department });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.department).toBeDefined();
    }
  });

  it("enforces length limits and acknowledgement", () => {
    const r = validateEnquiry({ ...valid, message: "x".repeat(2001), acknowledged: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.message).toBeDefined();
      expect(r.errors.acknowledged).toBeDefined();
    }
  });

  it("flags the honeypot as spam without field errors", () => {
    const r = validateEnquiry({ ...valid, website: "http://spam" });
    expect(r).toEqual({ ok: false, errors: {}, spam: true });
  });

  it("works with FormData", () => {
    const fd = new FormData();
    Object.entries(valid).forEach(([k, v]) => fd.set(k, v));
    expect(validateEnquiry(fd).ok).toBe(true);
  });
});

describe("enquiry submission", () => {
  const enquiry = (() => {
    const r = validateEnquiry(valid);
    if (!r.ok) throw new Error("fixture invalid");
    return r.value;
  })();

  it("test adapter discards and never claims acceptance", async () => {
    expect(await submitEnquiry(testEnquiryAdapter, enquiry)).toEqual({ status: "test-discarded" });
  });

  it("reports failed persistence/delivery instead of success", async () => {
    const broken: EnquiryAdapter = {
      kind: "production",
      submit: async () => {
        throw new Error("database unavailable");
      },
    };
    expect(await submitEnquiry(broken, enquiry)).toEqual({ status: "failed", reason: "database unavailable" });
  });

  it("refuses an 'accepted' outcome from a non-production adapter", async () => {
    const liar: EnquiryAdapter = { kind: "test", submit: async () => ({ status: "accepted", reference: "x" }) };
    expect((await submitEnquiry(liar, enquiry)).status).toBe("failed");
  });

  it("has no production adapter configured in the prototype", () => {
    expect(getEnquiryAdapter(undefined).kind).toBe("test");
    expect(() => getEnquiryAdapter("smtp")).toThrow(/not implemented/);
  });

  it("rate limits per key", () => {
    const allow = createRateLimiter(2, 1000);
    expect([allow("ip", 0), allow("ip", 1), allow("ip", 2)]).toEqual([true, true, false]);
    expect(allow("ip", 1001)).toBe(true);
  });
});

describe("handoffs and analytics", () => {
  it("never guesses a clinic booking URL", () => {
    expect(getClinicBookingUrl(undefined)).toBeUndefined();
    expect(getClinicBookingUrl("")).toBeUndefined();
    expect(getClinicBookingUrl("javascript:alert(1)")).toBeUndefined();
    expect(getClinicBookingUrl("https://booking.example")).toBe("https://booking.example/");
  });

  it("strips personal fields from analytics props", () => {
    expect(sanitiseProps({ product: "mini", email: "a@b.cz", phone: "1" })).toEqual({ product: "mini" });
  });
});
