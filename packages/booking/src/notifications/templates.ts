// Czech transactional templates. Subjects never contain service names, diagnoses or visit
// detail (spec §11); bodies carry essential logistics and reception contact only.
import { formatPrague } from "../domain/time";
import { formatPrice } from "../lib/format";

type Rendered = { subject: string; text: string; html: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function wrap(title: string, paragraphs: string[], footer: string): string {
  return `<!doctype html><html lang="cs"><body style="font-family:Arial,sans-serif;color:#1f2933;max-width:560px;margin:0 auto;padding:16px">
<div style="border-bottom:3px solid #c8102e;padding-bottom:8px;margin-bottom:16px"><strong style="color:#c8102e;font-size:18px">Redpoint Clinic</strong></div>
<h1 style="font-size:20px">${esc(title)}</h1>
${paragraphs.join("\n")}
<p style="color:#52606d;font-size:13px;margin-top:24px;border-top:1px solid #e4e7eb;padding-top:12px">${footer}</p>
</body></html>`;
}

const p = (s: string) => `<p>${s}</p>`;

export function otpEmail(code: string, ttlMin: number, purpose: "booking" | "manage"): Rendered {
  const why = purpose === "booking" ? "pro dokončení rezervace" : "pro zobrazení a správu vaší rezervace";
  const text = `Váš ověřovací kód ${why}: ${code}\n\nKód platí ${ttlMin} minut. Pokud jste o kód nežádali, tento e-mail ignorujte.\n\nOvěření e-mailu nerezervuje termín.`;
  return {
    subject: "Ověřovací kód – Redpoint Clinic",
    text,
    html: wrap("Ověřovací kód", [
      p(`Váš ověřovací kód ${esc(why)}:`),
      `<p style="font-size:28px;letter-spacing:6px;font-weight:bold">${esc(code)}</p>`,
      p(`Kód platí ${ttlMin} minut. Pokud jste o kód nežádali, tento e-mail ignorujte.`),
      p("Ověření e-mailu samo o sobě nerezervuje termín."),
    ], "Tento e-mail byl odeslán automaticky."),
  };
}

export type AppointmentEmailData = {
  reference: string;
  serviceName: string;
  therapistName: string;
  startsAt: Date;
  endsAt: Date;
  location: { name: string; address: string; phone: string | null; email: string | null };
  priceMinMinor: number | null;
  priceMaxMinor: number | null;
  cancellationCutoffHours: number;
  manageUrl: string | null;
};

function contactLine(l: AppointmentEmailData["location"]) {
  return [l.phone && `tel. ${l.phone}`, l.email].filter(Boolean).join(", ");
}

const SUBJECTS = {
  appointment_confirmed: "Potvrzení rezervace – Redpoint Clinic",
  appointment_rescheduled: "Změna termínu – Redpoint Clinic",
  appointment_cancelled: "Zrušení rezervace – Redpoint Clinic",
  appointment_reminder: "Připomínka termínu – Redpoint Clinic",
} as const;

const HEADLINES = {
  appointment_confirmed: "Vaše rezervace je potvrzena",
  appointment_rescheduled: "Termín vaší rezervace byl změněn",
  appointment_cancelled: "Vaše rezervace byla zrušena",
  appointment_reminder: "Připomínáme váš termín",
} as const;

export function appointmentEmail(kind: keyof typeof SUBJECTS, d: AppointmentEmailData): Rendered {
  const when = formatPrague(d.startsAt);
  const price = formatPrice(d.priceMinMinor, d.priceMaxMinor);
  const contact = contactLine(d.location);
  const lines: [string, string][] = [
    ["Číslo rezervace", d.reference],
    ["Služba", d.serviceName],
    ["Terapeut", d.therapistName],
    ["Termín", when],
    ["Místo", `${d.location.name}, ${d.location.address}`],
    ...(price && kind !== "appointment_cancelled" ? [["Cena", price] as [string, string]] : []),
  ];
  const policy = kind === "appointment_cancelled"
    ? "Pokud chcete objednat nový termín, můžete tak učinit online nebo přes recepci."
    : `Termín můžete online změnit nebo zrušit nejpozději ${d.cancellationCutoffHours} hodin předem. Pozdější změny prosím řešte s recepcí.`;
  const text = [
    HEADLINES[kind], "",
    ...lines.map(([k, v]) => `${k}: ${v}`), "",
    policy,
    ...(d.manageUrl && kind !== "appointment_cancelled" ? ["", `Správa rezervace: ${d.manageUrl}`, "(Před změnou vás požádáme o ověřovací kód zaslaný e-mailem.)"] : []),
    "", `Recepce: ${contact}`,
  ].join("\n");
  const html = wrap(HEADLINES[kind], [
    `<table style="border-collapse:collapse">${lines.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#52606d">${esc(k)}</td><td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>`).join("")}</table>`,
    p(esc(policy)),
    ...(d.manageUrl && kind !== "appointment_cancelled"
      ? [`<p><a href="${esc(d.manageUrl)}" style="background:#c8102e;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">Spravovat rezervaci</a></p>`,
         p("Před změnou vás požádáme o ověřovací kód zaslaný e-mailem.")]
      : []),
  ], `Recepce: ${esc(contact)}`);
  return { subject: SUBJECTS[kind], text, html };
}

export function requestReceivedEmail(d: { reference: string; serviceName: string; preferred: string; receptionContact: string }): Rendered {
  const text = `Přijali jsme vaši žádost o termín (číslo ${d.reference}).\n\nToto NENÍ potvrzená rezervace. Recepce vás bude kontaktovat s návrhem termínu.\n\nSlužba: ${d.serviceName}\nPreference: ${d.preferred}\n\nRecepce: ${d.receptionContact}`;
  return {
    subject: "Přijali jsme vaši žádost o termín – Redpoint Clinic",
    text,
    html: wrap("Přijali jsme vaši žádost o termín", [
      p(`Číslo žádosti: <strong>${esc(d.reference)}</strong>`),
      p("<strong>Toto není potvrzená rezervace.</strong> Recepce vás bude kontaktovat s návrhem termínu."),
      p(`Služba: ${esc(d.serviceName)}<br>Preference: ${esc(d.preferred)}`),
    ], `Recepce: ${esc(d.receptionContact)}`),
  };
}

export function requestDeclinedEmail(d: { reference: string; message: string; receptionContact: string }): Rendered {
  const text = `K vaší žádosti o termín (číslo ${d.reference}) vám bohužel nemůžeme nabídnout termín.\n\n${d.message}\n\nRecepce: ${d.receptionContact}`;
  return {
    subject: "Vaše žádost o termín – Redpoint Clinic",
    text,
    html: wrap("Vaše žádost o termín", [
      p(`K vaší žádosti (číslo <strong>${esc(d.reference)}</strong>) vám bohužel nemůžeme nabídnout termín.`),
      p(esc(d.message).replace(/\n/g, "<br>")),
    ], `Recepce: ${esc(d.receptionContact)}`),
  };
}

/** Minimal calendar file: logistics only, no service/clinical detail in the description. */
export function appointmentIcs(d: { uid: string; startsAt: Date; endsAt: Date; locationText: string; sequence: number; cancelled?: boolean }): string {
  const f = (x: Date) => x.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escIcs = (s: string) => s.replace(/[\\;,]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Redpoint Clinic//Booking//CS", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${d.uid}@booking.redpoint-clinic.cz`,
    `DTSTAMP:${f(new Date())}`,
    `DTSTART:${f(d.startsAt)}`,
    `DTEND:${f(d.endsAt)}`,
    `SEQUENCE:${d.sequence}`,
    "SUMMARY:Redpoint Clinic – termín",
    `LOCATION:${escIcs(d.locationText)}`,
    ...(d.cancelled ? ["STATUS:CANCELLED"] : ["STATUS:CONFIRMED"]),
    "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
}
