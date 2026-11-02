// Durable transactional outbox worker (spec §3, §11). Appointments are committed first; email is
// delivered afterwards with retries/backoff. An email failure never touches the reservation.
import { eq, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { appointment, appointmentRequest, location, notificationOutbox, patientContact, service, therapist } from "../db/schema";
import { getSettings } from "../domain/catalogue";
import { formatPrague } from "../domain/time";
import { issueManagementCredential, revokeManagementCredential } from "../domain/verification";
import { env } from "../lib/env";
import type { EmailProvider } from "./provider";
import { appointmentEmail, appointmentIcs, requestDeclinedEmail, requestReceivedEmail } from "./templates";

export const REMINDER_HOURS_BEFORE = 24;
const LOCK_MINUTES = 5;

export function backoffMs(attempt: number): number {
  // 1, 2, 4, 8 … minutes, capped at 6 hours
  return Math.min(60_000 * 2 ** Math.max(0, attempt - 1), 6 * 3_600_000);
}

/** Strip anything that looks like an email or token from provider error text before storing. */
export function sanitizeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.replace(/[^\s@<>]+@[^\s@<>]+/g, "[email]").replace(/[A-Za-z0-9_-]{32,}/g, "[redacted]").slice(0, 300);
}

/** Enqueue one reminder per appointment version for confirmed appointments ~24 h ahead. */
export async function enqueueReminders(db: Db, now = new Date()): Promise<number> {
  const nowIso = now.toISOString();
  const rows = await db.execute(sql`
    INSERT INTO notification_outbox (event, channel, appointment_id, appointment_version, dedupe_key, next_attempt_at)
    SELECT 'appointment_reminder', 'email', a.id, a.version,
           'appointment_reminder:' || a.id || ':v' || a.version || ':email', ${nowIso}::timestamptz
    FROM appointment a
    WHERE a.state = 'confirmed'
      AND a.starts_at > ${nowIso}::timestamptz + interval '2 hours'
      AND a.starts_at <= ${nowIso}::timestamptz + make_interval(hours => ${REMINDER_HOURS_BEFORE})
      -- skip appointments booked/changed so recently that the confirmation is already a reminder
      AND a.updated_at < a.starts_at - make_interval(hours => ${REMINDER_HOURS_BEFORE + 6})
    ON CONFLICT (dedupe_key) DO NOTHING
    RETURNING id`);
  return rows.length;
}

type Claimed = { id: string; event: string; appointment_id: string | null; appointment_version: number | null; request_id: string | null; attempts: number; max_attempts: number };

async function claim(db: Db, now: Date, batch: number): Promise<Claimed[]> {
  const nowIso = now.toISOString();
  const rows = await db.execute<Claimed>(sql`
    UPDATE notification_outbox SET status = 'sending', attempts = attempts + 1,
           locked_until = ${nowIso}::timestamptz + make_interval(mins => ${LOCK_MINUTES})
    WHERE id IN (
      SELECT id FROM notification_outbox
      WHERE (status = 'pending' AND next_attempt_at <= ${nowIso}::timestamptz)
         OR (status = 'sending' AND locked_until < ${nowIso}::timestamptz)
      ORDER BY next_attempt_at
      LIMIT ${batch}
      FOR UPDATE SKIP LOCKED)
    RETURNING id, event, appointment_id, appointment_version, request_id, attempts, max_attempts`);
  return [...rows];
}

type Outcome = { status: "sent"; messageId: string } | { status: "skipped"; reason: string };

async function deliver(db: Db, mail: EmailProvider, ev: Claimed): Promise<Outcome> {
  const settings = await getSettings(db);
  if (ev.appointment_id) {
    const [r] = await db.select({ a: appointment, c: patientContact, t: therapist.displayName, l: location })
      .from(appointment)
      .innerJoin(patientContact, eq(patientContact.id, appointment.patientContactId))
      .innerJoin(therapist, eq(therapist.id, appointment.therapistId))
      .innerJoin(location, eq(location.id, appointment.locationId))
      .where(eq(appointment.id, ev.appointment_id));
    if (!r) return { status: "skipped", reason: "appointment missing" };
    const kind = ev.event as "appointment_confirmed" | "appointment_rescheduled" | "appointment_cancelled" | "appointment_reminder";

    // Never send stale messages: reminders/confirmations only for the current confirmed version.
    if (kind !== "appointment_cancelled" && (r.a.state !== "confirmed" || r.a.version !== ev.appointment_version)) {
      return { status: "skipped", reason: `superseded (state=${r.a.state}, v${r.a.version})` };
    }

    let credentialId: string | null = null;
    let manageUrl: string | null = null;
    if (kind !== "appointment_cancelled") {
      const cred = await issueManagementCredential(db, r.a.id, r.a.endsAt);
      credentialId = cred.credentialId;
      // Token in the fragment: never sent to the server in a GET, never in access logs or Referer.
      manageUrl = `${env().APP_URL.replace(/\/$/, "")}/rezervace/sprava/#t=${cred.token}`;
    }
    const loc = { name: r.l.name, address: r.l.address, phone: settings.receptionPhone ?? r.l.phone, email: settings.receptionEmail ?? r.l.email };
    const rendered = appointmentEmail(kind, {
      reference: r.a.reference, serviceName: r.a.serviceName, therapistName: r.t, startsAt: r.a.startsAt, endsAt: r.a.endsAt,
      location: loc, priceMinMinor: r.a.priceMinMinor, priceMaxMinor: r.a.priceMaxMinor,
      cancellationCutoffHours: r.a.cancellationCutoffHours, manageUrl,
    });
    const ics = kind === "appointment_reminder" ? undefined : appointmentIcs({
      uid: r.a.id, startsAt: r.a.startsAt, endsAt: r.a.endsAt, locationText: `${r.l.name}, ${r.l.address}`,
      sequence: r.a.version, cancelled: kind === "appointment_cancelled",
    });
    try {
      const res = await mail.send({ to: r.c.email, ...rendered, ics });
      return { status: "sent", messageId: res.messageId };
    } catch (e) {
      if (credentialId) await revokeManagementCredential(db, credentialId);
      throw e;
    }
  }

  if (ev.request_id) {
    const [r] = await db.select({ q: appointmentRequest, c: patientContact, s: service.name })
      .from(appointmentRequest)
      .innerJoin(patientContact, eq(patientContact.id, appointmentRequest.patientContactId))
      .innerJoin(service, eq(service.id, appointmentRequest.serviceId))
      .where(eq(appointmentRequest.id, ev.request_id));
    if (!r) return { status: "skipped", reason: "request missing" };
    const receptionContact = [settings.receptionPhone && `tel. ${settings.receptionPhone}`, settings.receptionEmail].filter(Boolean).join(", ");
    const rendered = ev.event === "request_declined"
      ? requestDeclinedEmail({ reference: r.q.reference, message: r.q.declineMessage ?? "", receptionContact })
      : requestReceivedEmail({
          reference: r.q.reference, serviceName: r.s, receptionContact,
          preferred: r.q.preferredStart
            ? formatPrague(r.q.preferredStart)
            : `${r.q.preferredFrom} – ${r.q.preferredTo} (${{ any: "kdykoli", morning: "dopoledne", afternoon: "odpoledne" }[r.q.preferredTimeOfDay]})`,
        });
    const res = await mail.send({ to: r.c.email, ...rendered });
    return { status: "sent", messageId: res.messageId };
  }
  return { status: "skipped", reason: "no target" };
}

export async function processOutbox(db: Db, mail: EmailProvider, opts: { now?: Date; batch?: number } = {}) {
  const now = opts.now ?? new Date();
  const claimed = await claim(db, now, opts.batch ?? 25);
  const summary = { sent: 0, skipped: 0, retry: 0, failed: 0 };
  for (const ev of claimed) {
    try {
      const out = await deliver(db, mail, ev);
      if (out.status === "sent") {
        await db.update(notificationOutbox).set({ status: "sent", sentAt: now, providerMessageId: out.messageId, lockedUntil: null, lastError: null }).where(eq(notificationOutbox.id, ev.id));
        summary.sent++;
      } else {
        await db.update(notificationOutbox).set({ status: "skipped", lockedUntil: null, lastError: out.reason }).where(eq(notificationOutbox.id, ev.id));
        summary.skipped++;
      }
    } catch (e) {
      const exhausted = ev.attempts >= ev.max_attempts;
      await db.update(notificationOutbox).set({
        status: exhausted ? "failed" : "pending",
        nextAttemptAt: new Date(now.getTime() + backoffMs(ev.attempts)),
        lockedUntil: null,
        lastError: sanitizeError(e),
      }).where(eq(notificationOutbox.id, ev.id));
      if (exhausted) summary.failed++; else summary.retry++;
    }
  }
  return summary;
}

/** Full worker tick: schedule reminders, then deliver due messages. */
export async function runWorkerTick(db: Db, mail: EmailProvider, now = new Date()) {
  const reminders = await enqueueReminders(db, now);
  const result = await processOutbox(db, mail, { now });
  return { reminders, ...result };
}
