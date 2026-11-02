import { desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@redcord/booking/db/client";
import { capturedEmail } from "@redcord/booking/db/schema";
import { env, isDevelopment } from "@redcord/booking/lib/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dev mailbox", robots: { index: false, follow: false } };

/** DEVELOPMENT ONLY: view emails captured by EMAIL_PROVIDER=capture (OTP codes, confirmations). */
export default async function Mailbox() {
  if (!isDevelopment() || env().EMAIL_PROVIDER !== "capture") notFound();
  const mails = await getDb().select().from(capturedEmail).orderBy(desc(capturedEmail.createdAt)).limit(50);
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <h1 className="text-xl font-bold">Dev mailbox <span className="text-sm font-normal text-muted">(posledních 50, pouze vývoj)</span></h1>
      {mails.length === 0 && <p className="text-sm text-muted">Zatím žádné e-maily.</p>}
      {mails.map((m) => (
        <article key={m.id} className="rounded-xl border border-line bg-white p-4">
          <p className="text-xs text-muted">{m.createdAt.toLocaleString("cs-CZ", { timeZone: "Europe/Prague" })} → {m.toAddress}{m.hasIcs ? " · 📎 termin.ics" : ""}</p>
          <h2 className="mt-1 font-semibold">{m.subject}</h2>
          <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm">{linkify(m.textBody)}</pre>
        </article>
      ))}
    </main>
  );
}

function linkify(text: string) {
  return text.split(/(https?:\/\/\S+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? <a key={i} href={part} className="text-brand underline break-all">{part}</a> : part,
  );
}
