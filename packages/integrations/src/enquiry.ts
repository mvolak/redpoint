/**
 * Enquiry contract. The prototype ships ONLY a test adapter that validates and discards.
 * A production adapter must persist durably and hand off for delivery before reporting "accepted".
 */

export const ENQUIRY_DEPARTMENTS = ["obchod", "servis", "vzdelavani"] as const;
export type EnquiryDepartment = (typeof ENQUIRY_DEPARTMENTS)[number];

export const ENQUIRY_LIMITS = {
  name: { min: 2, max: 120 },
  email: { max: 200 },
  phone: { max: 30 },
  company: { max: 160 },
  reference: { max: 120 },
  message: { min: 10, max: 2000 },
} as const;

export interface Enquiry {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  department: EnquiryDepartment;
  reference?: string;
  message: string;
  acknowledged: true;
}

export type EnquiryField = keyof Enquiry;
export type FieldErrors = Partial<Record<EnquiryField, string>>;

export type ValidationResult =
  | { ok: true; value: Enquiry }
  | { ok: false; errors: FieldErrors; spam?: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9 ()-]{6,}$/;

function str(input: FormData | Record<string, unknown>, key: string): string {
  const v = input instanceof FormData ? input.get(key) : input[key];
  return typeof v === "string" ? v.trim() : "";
}

/** Server-side validation. Never trust client constraints. Messages are Czech, user-facing. */
export function validateEnquiry(input: FormData | Record<string, unknown>): ValidationResult {
  // Honeypot: a hidden field real users never fill.
  if (str(input, "website") !== "") return { ok: false, errors: {}, spam: true };

  const errors: FieldErrors = {};
  const name = str(input, "name");
  const email = str(input, "email");
  const phone = str(input, "phone");
  const company = str(input, "company");
  const department = str(input, "department");
  const reference = str(input, "reference");
  const message = str(input, "message");
  const ack = str(input, "acknowledged");
  const L = ENQUIRY_LIMITS;

  if (name.length < L.name.min) errors.name = "Vyplňte prosím jméno a příjmení.";
  else if (name.length > L.name.max) errors.name = `Jméno může mít nejvýše ${L.name.max} znaků.`;

  if (!email) errors.email = "Vyplňte prosím e-mail.";
  else if (email.length > L.email.max || !EMAIL_RE.test(email)) errors.email = "Zadejte e-mail ve tvaru jmeno@domena.cz.";

  if (phone && (phone.length > L.phone.max || !PHONE_RE.test(phone)))
    errors.phone = "Telefon může obsahovat číslice, mezery a předvolbu, např. +420 600 000 000.";

  if (company.length > L.company.max) errors.company = `Název může mít nejvýše ${L.company.max} znaků.`;

  if (!(ENQUIRY_DEPARTMENTS as readonly string[]).includes(department))
    errors.department = "Vyberte prosím oddělení, kterému je dotaz určen.";

  if (reference.length > L.reference.max) errors.reference = `Odkaz může mít nejvýše ${L.reference.max} znaků.`;

  if (message.length < L.message.min) errors.message = `Napište prosím zprávu (alespoň ${L.message.min} znaků).`;
  else if (message.length > L.message.max) errors.message = `Zpráva může mít nejvýše ${L.message.max} znaků.`;

  if (ack !== "on" && ack !== "true") errors.acknowledged = "Potvrďte prosím seznámení se zpracováním údajů.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name,
      email,
      department: department as EnquiryDepartment,
      message,
      acknowledged: true,
      ...(phone ? { phone } : {}),
      ...(company ? { company } : {}),
      ...(reference ? { reference } : {}),
    },
  };
}

/** Outcome of handing an enquiry to an adapter. */
export type SubmitOutcome =
  /** Production only: persisted durably and handed off for delivery. */
  | { status: "accepted"; reference: string }
  /** Test adapter: validated, NOT stored, NOT delivered. */
  | { status: "test-discarded" }
  | { status: "failed"; reason: string };

export interface EnquiryAdapter {
  readonly kind: "test" | "production";
  submit(enquiry: Enquiry): Promise<SubmitOutcome>;
}

/** Prototype adapter: explicitly does nothing with the data. */
export const testEnquiryAdapter: EnquiryAdapter = {
  kind: "test",
  async submit() {
    return { status: "test-discarded" };
  },
};

/** Wraps an adapter so thrown errors become an honest failure outcome instead of a false success. */
export async function submitEnquiry(adapter: EnquiryAdapter, enquiry: Enquiry): Promise<SubmitOutcome> {
  try {
    const outcome = await adapter.submit(enquiry);
    if (outcome.status === "accepted" && adapter.kind !== "production") {
      return { status: "failed", reason: "Non-production adapter reported acceptance." };
    }
    return outcome;
  } catch (err) {
    return { status: "failed", reason: err instanceof Error ? err.message : "unknown error" };
  }
}

export function getEnquiryAdapter(name: string | undefined): EnquiryAdapter {
  if (!name || name === "test") return testEnquiryAdapter;
  throw new Error(
    `Enquiry adapter "${name}" is not implemented. Only "test" exists in the review prototype.`,
  );
}

/** Very small fixed-window rate limiter. In-memory: prototype only (per server instance). */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; reset: number }>();
  return (key: string, now = Date.now()): boolean => {
    const entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      hits.set(key, { count: 1, reset: now + windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  };
}
