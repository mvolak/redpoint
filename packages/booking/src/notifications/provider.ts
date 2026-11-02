// Email behind a provider interface (spec §3). SMS can implement the same shape later.
import type { Db } from "../db/client";
import { capturedEmail } from "../db/schema";
import { env } from "../lib/env";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  ics?: string; // optional calendar attachment (minimum logistics only)
};

export interface EmailProvider {
  readonly name: string;
  send(msg: EmailMessage): Promise<{ messageId: string }>;
}

/** Development/test: stores messages in `captured_email` (visible at /dev/mailbox). */
export class CaptureEmailProvider implements EmailProvider {
  readonly name = "capture";
  constructor(private db: Db) {}
  async send(msg: EmailMessage) {
    const [row] = await this.db.insert(capturedEmail).values({
      toAddress: msg.to, subject: msg.subject, textBody: msg.text, htmlBody: msg.html ?? null, hasIcs: !!msg.ics,
    }).returning({ id: capturedEmail.id });
    return { messageId: row!.id };
  }
}

/** Simulates a provider outage (tests, resilience drills). */
export class FailingEmailProvider implements EmailProvider {
  readonly name = "failing";
  async send(): Promise<{ messageId: string }> {
    throw new Error("Simulated email provider outage");
  }
}

export class SmtpEmailProvider implements EmailProvider {
  readonly name = "smtp";
  private transporter: import("nodemailer").Transporter | undefined;
  private async t() {
    if (!this.transporter) {
      const nodemailer = await import("nodemailer");
      const e = env();
      this.transporter = nodemailer.createTransport({
        host: e.SMTP_HOST, port: e.SMTP_PORT, secure: e.SMTP_SECURE === "true",
        auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD } : undefined,
        logger: false,
      });
    }
    return this.transporter;
  }
  async send(msg: EmailMessage) {
    const info = await (await this.t()).sendMail({
      from: env().EMAIL_FROM, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html,
      icalEvent: msg.ics ? { method: "PUBLISH", content: msg.ics, filename: "termin.ics" } : undefined,
    });
    return { messageId: String(info.messageId) };
  }
}

/** Staging safety net: deliver every message to a single test inbox. */
class RedirectingProvider implements EmailProvider {
  readonly name: string;
  constructor(private inner: EmailProvider, private to: string) { this.name = `${inner.name}+redirect`; }
  send(msg: EmailMessage) {
    return this.inner.send({ ...msg, to: this.to, subject: `[TEST → ${msg.to}] ${msg.subject}` });
  }
}

export function createEmailProvider(db: Db): EmailProvider {
  const e = env();
  const base: EmailProvider =
    e.EMAIL_PROVIDER === "smtp" ? new SmtpEmailProvider()
    : e.EMAIL_PROVIDER === "failing" ? new FailingEmailProvider()
    : new CaptureEmailProvider(db);
  return e.EMAIL_REDIRECT_ALL_TO ? new RedirectingProvider(base, e.EMAIL_REDIRECT_ALL_TO) : base;
}
