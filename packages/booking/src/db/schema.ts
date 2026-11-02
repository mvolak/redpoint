// Typed mirror of migrations/*.sql. The SQL migrations are authoritative for constraints
// (exclusion constraints, checks); keep this file in sync when adding migrations.
import {
  pgTable, uuid, text, integer, boolean, timestamp, smallint, date, time, jsonb, primaryKey, customType,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").notNull().defaultNow();
const updatedAt = () => ts("updated_at").notNull().defaultNow();

/** tstzrange stored as text literal, e.g. '["2026-11-02 08:00:00+00","2026-11-02 09:00:00+00")' */
export const tstzrange = customType<{ data: string }>({ dataType: () => "tstzrange" });

export const location = pgTable("location", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  timezone: text("timezone").notNull().default("Europe/Prague"),
  phone: text("phone"),
  email: text("email"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const clinicSettings = pgTable("clinic_settings", {
  id: smallint("id").primaryKey(),
  publicMode: text("public_mode").$type<PublicMode>().notNull().default("request_only"),
  pausedMessage: text("paused_message"),
  receptionPhone: text("reception_phone"),
  receptionEmail: text("reception_email"),
  version: integer("version").notNull().default(1),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const bookingPolicy = pgTable("booking_policy", {
  id: uuid("id").primaryKey().defaultRandom(),
  version: integer("version").notNull().default(1),
  cancellationCutoffHours: integer("cancellation_cutoff_hours").notNull(),
  termsText: text("terms_text").notNull(),
  active: boolean("active").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const therapist = pgTable("therapist", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  locationId: uuid("location_id").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const resource = pgTable("resource", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").$type<"therapist" | "room" | "equipment">().notNull(),
  name: text("name").notNull(),
  therapistId: uuid("therapist_id"),
  locationId: uuid("location_id").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const service = pgTable("service", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  firstVisitInfo: text("first_visit_info"),
  locationId: uuid("location_id").notNull(),
  active: boolean("active").notNull().default(true),
  durationMin: integer("duration_min").notNull(),
  bufferBeforeMin: integer("buffer_before_min").notNull().default(0),
  bufferAfterMin: integer("buffer_after_min").notNull().default(0),
  priceMinMinor: integer("price_min_minor"),
  priceMaxMinor: integer("price_max_minor"),
  currency: text("currency").notNull().default("CZK"),
  bookingMode: text("booking_mode").$type<"automatic" | "request_only">().notNull().default("automatic"),
  newPatients: text("new_patients").$type<"allowed" | "not_allowed" | "only">().notNull().default("allowed"),
  requiresReview: boolean("requires_review").notNull().default(false),
  minLeadMinutes: integer("min_lead_minutes").notNull().default(720),
  horizonDays: integer("horizon_days").notNull().default(60),
  slotStepMin: integer("slot_step_min").notNull().default(15),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const serviceRequiredResource = pgTable("service_required_resource", {
  serviceId: uuid("service_id").notNull(),
  resourceId: uuid("resource_id").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [primaryKey({ columns: [t.serviceId, t.resourceId] })]);

export const therapistService = pgTable("therapist_service", {
  therapistId: uuid("therapist_id").notNull(),
  serviceId: uuid("service_id").notNull(),
  active: boolean("active").notNull().default(true),
  durationMinOverride: integer("duration_min_override"),
  priceMinOverride: integer("price_min_override"),
  priceMaxOverride: integer("price_max_override"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [primaryKey({ columns: [t.therapistId, t.serviceId] })]);

export const staffProfile = pgTable("staff_profile", {
  id: uuid("id").primaryKey().defaultRandom(),
  authSubject: text("auth_subject"),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").$type<StaffRole>().notNull(),
  therapistId: uuid("therapist_id"),
  active: boolean("active").notNull().default(true),
  version: integer("version").notNull().default(1),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const workingHours = pgTable("working_hours", {
  id: uuid("id").primaryKey().defaultRandom(),
  therapistId: uuid("therapist_id").notNull(),
  weekday: smallint("weekday").notNull(),
  startLocal: time("start_local").notNull(),
  endLocal: time("end_local").notNull(),
  validFrom: date("valid_from", { mode: "string" }),
  validTo: date("valid_to", { mode: "string" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const scheduleException = pgTable("schedule_exception", {
  id: uuid("id").primaryKey().defaultRandom(),
  therapistId: uuid("therapist_id"),
  date: date("date", { mode: "string" }).notNull(),
  kind: text("kind").$type<"closed" | "custom_hours">().notNull(),
  startLocal: time("start_local"),
  endLocal: time("end_local"),
  note: text("note"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const patientContact = pgTable("patient_contact", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  phone: text("phone").notNull(),
  isNewPatient: boolean("is_new_patient").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const appointmentRequest = pgTable("appointment_request", {
  id: uuid("id").primaryKey().defaultRandom(),
  reference: text("reference").notNull(),
  patientContactId: uuid("patient_contact_id").notNull(),
  serviceId: uuid("service_id").notNull(),
  therapistId: uuid("therapist_id"),
  preferredFrom: date("preferred_from", { mode: "string" }).notNull(),
  preferredTo: date("preferred_to", { mode: "string" }).notNull(),
  preferredTimeOfDay: text("preferred_time_of_day").$type<"any" | "morning" | "afternoon">().notNull().default("any"),
  preferredStart: ts("preferred_start"),
  state: text("state").$type<"pending" | "resolved" | "declined">().notNull().default("pending"),
  resolvedAppointmentId: uuid("resolved_appointment_id"),
  declineMessage: text("decline_message"),
  version: integer("version").notNull().default(1),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const appointment = pgTable("appointment", {
  id: uuid("id").primaryKey().defaultRandom(),
  reference: text("reference").notNull(),
  patientContactId: uuid("patient_contact_id").notNull(),
  serviceId: uuid("service_id").notNull(),
  therapistId: uuid("therapist_id").notNull(),
  locationId: uuid("location_id").notNull(),
  startsAt: ts("starts_at").notNull(),
  endsAt: ts("ends_at").notNull(),
  serviceName: text("service_name").notNull(),
  durationMin: integer("duration_min").notNull(),
  bufferBeforeMin: integer("buffer_before_min").notNull(),
  bufferAfterMin: integer("buffer_after_min").notNull(),
  priceMinMinor: integer("price_min_minor"),
  priceMaxMinor: integer("price_max_minor"),
  currency: text("currency").notNull(),
  policyVersion: integer("policy_version").notNull(),
  cancellationCutoffHours: integer("cancellation_cutoff_hours").notNull(),
  state: text("state").$type<AppointmentState>().notNull().default("confirmed"),
  version: integer("version").notNull().default(1),
  source: text("source").$type<"online" | "reception" | "request" | "import">().notNull(),
  requestId: uuid("request_id"),
  cancelledAt: ts("cancelled_at"),
  cancelledBy: text("cancelled_by").$type<"patient" | "staff">(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const timeBlock = pgTable("time_block", {
  id: uuid("id").primaryKey().defaultRandom(),
  resourceId: uuid("resource_id").notNull(),
  startsAt: ts("starts_at").notNull(),
  endsAt: ts("ends_at").notNull(),
  kind: text("kind").$type<"block" | "break" | "leave">().notNull().default("block"),
  note: text("note"),
  createdBy: uuid("created_by"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const occupancy = pgTable("occupancy", {
  id: uuid("id").primaryKey().defaultRandom(),
  resourceId: uuid("resource_id").notNull(),
  during: tstzrange("during").notNull(),
  appointmentId: uuid("appointment_id"),
  timeBlockId: uuid("time_block_id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const idempotencyRecord = pgTable("idempotency_record", {
  scope: text("scope").notNull(),
  key: text("key").notNull(),
  fingerprint: text("fingerprint").notNull(),
  response: jsonb("response"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [primaryKey({ columns: [t.scope, t.key] })]);

export const guestSession = pgTable("guest_session", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull(),
  purpose: text("purpose").$type<"booking" | "manage">().notNull(),
  email: text("email"),
  appointmentId: uuid("appointment_id"),
  verified: boolean("verified").notNull().default(false),
  bookingsMade: integer("bookings_made").notNull().default(0),
  expiresAt: ts("expires_at").notNull(),
  revokedAt: ts("revoked_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const verificationChallenge = pgTable("verification_challenge", {
  id: uuid("id").primaryKey().defaultRandom(),
  purpose: text("purpose").$type<"booking" | "manage">().notNull(),
  email: text("email").notNull(),
  guestSessionId: uuid("guest_session_id"),
  codeHash: text("code_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(5),
  expiresAt: ts("expires_at").notNull(),
  consumedAt: ts("consumed_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const managementCredential = pgTable("management_credential", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull(),
  appointmentId: uuid("appointment_id").notNull(),
  expiresAt: ts("expires_at").notNull(),
  revokedAt: ts("revoked_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const notificationOutbox = pgTable("notification_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  event: text("event").$type<NotificationEvent>().notNull(),
  channel: text("channel").$type<"email" | "sms">().notNull().default("email"),
  appointmentId: uuid("appointment_id"),
  appointmentVersion: integer("appointment_version"),
  requestId: uuid("request_id"),
  dedupeKey: text("dedupe_key").notNull(),
  status: text("status").$type<"pending" | "sending" | "sent" | "failed" | "skipped">().notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(8),
  nextAttemptAt: ts("next_attempt_at").notNull().defaultNow(),
  lockedUntil: ts("locked_until"),
  lastError: text("last_error"),
  sentAt: ts("sent_at"),
  providerMessageId: text("provider_message_id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const auditEvent = pgTable("audit_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorType: text("actor_type").$type<"staff" | "patient" | "system">().notNull(),
  actorId: text("actor_id"),
  operation: text("operation").notNull(),
  recordType: text("record_type").notNull(),
  recordId: uuid("record_id"),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
});

export const capturedEmail = pgTable("captured_email", {
  id: uuid("id").primaryKey().defaultRandom(),
  toAddress: text("to_address").notNull(),
  subject: text("subject").notNull(),
  textBody: text("text_body").notNull(),
  htmlBody: text("html_body"),
  hasIcs: boolean("has_ics").notNull().default(false),
  createdAt: createdAt(),
});

export type PublicMode = "automatic" | "request_only" | "paused";
export type StaffRole = "therapist" | "reception" | "admin";
export type AppointmentState = "confirmed" | "completed" | "no_show" | "cancelled";
export type NotificationEvent =
  | "appointment_confirmed" | "appointment_rescheduled" | "appointment_cancelled"
  | "appointment_reminder" | "request_received" | "request_declined";
