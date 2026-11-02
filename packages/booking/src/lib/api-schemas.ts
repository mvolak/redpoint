// Request schemas for every server boundary (spec §3, §10). Clients never supply price,
// duration, role, ownership or confirmation state — those fields simply do not exist here.
import { z } from "zod";

export const uuid = z.string().uuid();
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum ve formátu RRRR-MM-DD");
export const instant = z.string().datetime({ offset: true }).transform((s) => new Date(s));
export const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Čas ve formátu HH:MM");
export const idempotencyKey = z.string().min(16).max(100).regex(/^[A-Za-z0-9_-]+$/);

const name = z.string().trim().min(2, "Zadejte jméno a příjmení").max(120);
const phone = z.string().trim().regex(/^\+?[0-9 ()-]{9,20}$/, "Zadejte platné telefonní číslo");
const email = z.string().trim().toLowerCase().email("Zadejte platný e-mail").max(254);

export const contactSchema = z.object({ name, phone, isNewPatient: z.boolean() }).strict();

export const availabilityQuery = z.object({
  serviceId: uuid,
  therapistId: uuid.optional(),
  from: isoDate,
  to: isoDate,
});

export const verificationRequestBody = z.object({ email }).strict();
export const verificationVerifyBody = z.object({ challengeId: uuid, code: z.string().trim().regex(/^\d{6}$/, "Kód má 6 číslic") }).strict();

export const createAppointmentBody = z.object({
  serviceId: uuid,
  therapistId: uuid.nullable(),
  start: instant,
  termsVersion: z.number().int().positive(),
  termsAccepted: z.literal(true, { message: "Potvrďte prosím podmínky rezervace" }),
  contact: contactSchema,
  idempotencyKey,
}).strict();

export const createRequestBody = z.object({
  serviceId: uuid,
  therapistId: uuid.nullable(),
  preferredFrom: isoDate,
  preferredTo: isoDate,
  preferredTimeOfDay: z.enum(["any", "morning", "afternoon"]),
  preferredStart: instant.nullable(),
  termsVersion: z.number().int().positive(),
  termsAccepted: z.literal(true, { message: "Potvrďte prosím podmínky" }),
  contact: contactSchema,
  idempotencyKey,
}).strict().refine((b) => b.preferredTo >= b.preferredFrom, { message: "Konec rozmezí musí být po začátku", path: ["preferredTo"] });

export const manageSessionBody = z.object({ token: z.string().min(20).max(200).regex(/^[A-Za-z0-9_-]+$/) }).strict();
export const manageVerifyBody = verificationVerifyBody;
export const manageCancelBody = z.object({ expectedVersion: z.number().int().positive() }).strict();
export const manageRescheduleBody = z.object({ expectedVersion: z.number().int().positive(), start: instant }).strict();

// ------------------------------------------------------------------ staff

export const staffLoginBody = z.object({ email, password: z.string().min(1).max(200) }).strict();
export const staffListQuery = z.object({
  from: instant, to: instant, therapistId: uuid.optional(),
  states: z.string().optional().transform((s) => (s ? s.split(",").filter(Boolean) : undefined)),
});
export const staffCreateAppointmentBody = z.object({
  serviceId: uuid, therapistId: uuid.nullable(), start: instant,
  contact: z.object({ name, phone, email, isNewPatient: z.boolean() }).strict(),
  idempotencyKey,
}).strict();
export const staffRescheduleBody = z.object({ expectedVersion: z.number().int().positive(), start: instant, therapistId: uuid.nullable().optional() }).strict();
export const staffCancelBody = manageCancelBody;
export const staffOutcomeBody = z.object({ expectedVersion: z.number().int().positive(), outcome: z.enum(["completed", "no_show"]) }).strict();
export const staffAvailabilityQuery = availabilityQuery;
export const resolveRequestBody = z.object({ expectedVersion: z.number().int().positive(), therapistId: uuid, start: instant }).strict();
export const declineRequestBody = z.object({ expectedVersion: z.number().int().positive(), message: z.string().trim().min(5).max(1000) }).strict();
export const hoursBody = z.object({
  rules: z.array(z.object({ weekday: z.number().int().min(1).max(7), start: hhmm, end: hhmm, validFrom: isoDate.nullable().optional(), validTo: isoDate.nullable().optional() }).strict()
    .refine((r) => r.end > r.start, { message: "Konec musí být po začátku" })).max(50),
}).strict();
export const exceptionBody = z.object({
  therapistId: uuid.nullable(), date: isoDate, kind: z.enum(["closed", "custom_hours"]),
  start: hhmm.nullable().optional(), end: hhmm.nullable().optional(), note: z.string().max(200).nullable().optional(),
}).strict();
export const blockBody = z.object({
  therapistId: uuid, start: instant, end: instant, kind: z.enum(["block", "break", "leave"]), note: z.string().max(200).nullable().optional(),
}).strict().refine((b) => b.end > b.start && b.end.getTime() - b.start.getTime() <= 31 * 86_400_000, { message: "Neplatný rozsah", path: ["end"] });
export const settingsBody = z.object({
  expectedVersion: z.number().int().positive(),
  publicMode: z.enum(["automatic", "request_only", "paused"]),
  pausedMessage: z.string().max(500).nullable(),
  receptionPhone: z.string().max(40).nullable(),
  receptionEmail: z.string().email().max(254).nullable(),
}).strict();
export const policyBody = z.object({ cancellationCutoffHours: z.number().int().min(0).max(14 * 24), termsText: z.string().trim().min(10).max(5000) }).strict();
export const staffBody = z.object({
  expectedVersion: z.number().int().positive().optional(),
  email, displayName: z.string().trim().min(2).max(120), role: z.enum(["therapist", "reception", "admin"]),
  therapistId: uuid.nullable(), active: z.boolean(), authSubject: z.string().max(200).nullable().optional(),
}).strict();
export const serviceUpdateBody = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  firstVisitInfo: z.string().max(2000).nullable().optional(),
  active: z.boolean().optional(),
  durationMin: z.number().int().min(5).max(480).optional(),
  bufferBeforeMin: z.number().int().min(0).max(120).optional(),
  bufferAfterMin: z.number().int().min(0).max(120).optional(),
  priceMinMinor: z.number().int().min(0).nullable().optional(),
  priceMaxMinor: z.number().int().min(0).nullable().optional(),
  bookingMode: z.enum(["automatic", "request_only"]).optional(),
  newPatients: z.enum(["allowed", "not_allowed", "only"]).optional(),
  requiresReview: z.boolean().optional(),
  minLeadMinutes: z.number().int().min(0).max(60 * 24 * 30).optional(),
  horizonDays: z.number().int().min(1).max(365).optional(),
  slotStepMin: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20), z.literal(30), z.literal(60)]).optional(),
}).strict();
export const therapistServiceBody = z.object({
  therapistId: uuid, serviceId: uuid, active: z.boolean(),
  durationMinOverride: z.number().int().min(5).max(480).nullable(),
  priceMinOverride: z.number().int().min(0).nullable(),
  priceMaxOverride: z.number().int().min(0).nullable(),
}).strict();
