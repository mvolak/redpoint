"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { ENQUIRY_LIMITS, type EnquiryDepartment } from "@redcord/integrations";
import { buttonClass, cx } from "@redcord/ui";
import { submitEnquiryAction, type EnquiryState } from "@/app/actions/enquiry";
import { track } from "@/lib/analytics";

const DEPARTMENTS: { id: EnquiryDepartment; label: string }[] = [
  { id: "obchod", label: "Obchod a instalace — poptávka vybavení, konzultace" },
  { id: "vzdelavani", label: "Vzdělávání — kurzy a workshopy" },
  { id: "servis", label: "Servis — technické kontroly a podpora vybavení" },
];

const FIELD_ORDER = ["name", "email", "phone", "company", "department", "reference", "message", "acknowledged"] as const;
const LABELS: Record<(typeof FIELD_ORDER)[number], string> = {
  name: "Jméno a příjmení",
  email: "E-mail",
  phone: "Telefon",
  company: "Organizace",
  department: "Oddělení",
  reference: "Produkt nebo kurz",
  message: "Zpráva",
  acknowledged: "Souhlas se zpracováním",
};

const input =
  "mt-2 block w-full rounded-xl border border-[#c9c9c9] bg-white px-4 py-3 text-base text-ink placeholder:text-[#8a8a8a] focus:border-ink focus:outline-3 focus:outline-offset-1 focus:outline-brand aria-[invalid=true]:border-brand";

export function EnquiryForm({
  defaultDepartment = "obchod",
  defaultReference = "",
  idPrefix = "poptavka",
}: {
  defaultDepartment?: EnquiryDepartment;
  defaultReference?: string;
  idPrefix?: string;
}) {
  const [state, action, pending] = useActionState<EnquiryState, FormData>(submitEnquiryAction, { status: "idle" });
  const summaryRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const uid = useId();
  const id = (f: string) => `${idPrefix}-${f}-${uid}`;

  const errors = state.status === "invalid" ? state.errors : {};
  const values = "values" in state ? state.values : {};

  useEffect(() => {
    if (state.status === "invalid") summaryRef.current?.focus();
    if (state.status === "test-discarded" || state.status === "failed" || state.status === "rate-limited" || state.status === "accepted")
      resultRef.current?.focus();
    if (state.status === "accepted") {
      track(values.department === "servis" ? "support_enquiry_accepted" : "enquiry_accepted");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (state.status === "test-discarded") {
    return (
      <div ref={resultRef} tabIndex={-1} role="status" className="rounded-card border-2 border-dashed border-warn bg-warn-bg p-8 text-[#4d3500]">
        <p className="text-sm font-semibold uppercase tracking-wider">Testovací režim</p>
        <h3 className="mt-2 text-2xl font-bold">Formulář prošel kontrolou, ale nic nebylo odesláno.</h3>
        <p className="mt-3 leading-relaxed">
          Toto je koncept webu k revizi. Údaje nebyly uloženy ani doručeny žádnému oddělení. Pro skutečný dotaz
          použijte telefon nebo e-mail uvedený v kontaktech.
        </p>
        <a href="?" className={buttonClass("outline-dark", "mt-6")}>
          Vyplnit znovu
        </a>
      </div>
    );
  }

  if (state.status === "accepted") {
    return (
      <div ref={resultRef} tabIndex={-1} role="status" className="rounded-card border border-line bg-white p-8">
        <h3 className="text-2xl font-bold">Děkujeme, dotaz jsme přijali.</h3>
        <p className="mt-3 text-muted">Číslo dotazu: {state.reference}</p>
      </div>
    );
  }

  const errorList = FIELD_ORDER.filter((f) => errors[f]);

  return (
    <form
      action={action}
      noValidate
      className="space-y-6"
      onFocus={() => {
        if (!started.current) {
          started.current = true;
          track("quote_started");
        }
      }}
    >
      <p className="rounded-xl bg-warn-bg px-4 py-3 text-sm text-[#4d3500]">
        <strong>Testovací režim:</strong> formulář ověří údaje, ale nic neuloží ani neodešle.
      </p>

      {errorList.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} role="alert" aria-labelledby={id("summary")} className="rounded-xl border-2 border-brand bg-white p-5">
          <h3 id={id("summary")} className="font-bold text-brand">
            Formulář obsahuje {errorList.length === 1 ? "1 chybu" : errorList.length < 5 ? `${errorList.length} chyby` : `${errorList.length} chyb`}
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errorList.map((f) => (
              <li key={f}>
                <a href={`#${id(f)}`} className="underline underline-offset-2">
                  {LABELS[f]}: {errors[f]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(state.status === "failed" || state.status === "rate-limited") && (
        <div ref={resultRef} tabIndex={-1} role="alert" className="rounded-xl border-2 border-brand bg-white p-5">
          <p className="font-bold text-brand">
            {state.status === "failed" ? "Dotaz se nepodařilo zpracovat." : "Příliš mnoho pokusů v krátké době."}
          </p>
          <p className="mt-1 text-muted">Nic nebylo odesláno. Zkuste to prosím později nebo nás kontaktujte telefonicky či e-mailem.</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Field id={id("name")} label="Jméno a příjmení" error={errors.name} required>
          <input id={id("name")} name="name" autoComplete="name" required maxLength={ENQUIRY_LIMITS.name.max} defaultValue={values.name} aria-invalid={!!errors.name} aria-describedby={errors.name ? `${id("name")}-err` : undefined} className={input} />
        </Field>
        <Field id={id("email")} label="E-mail" error={errors.email} required>
          <input id={id("email")} name="email" type="email" autoComplete="email" required maxLength={ENQUIRY_LIMITS.email.max} defaultValue={values.email} aria-invalid={!!errors.email} aria-describedby={errors.email ? `${id("email")}-err` : undefined} className={input} />
        </Field>
        <Field id={id("phone")} label="Telefon" error={errors.phone} hint="nepovinné">
          <input id={id("phone")} name="phone" type="tel" autoComplete="tel" maxLength={ENQUIRY_LIMITS.phone.max} defaultValue={values.phone} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? `${id("phone")}-err` : undefined} className={input} />
        </Field>
        <Field id={id("company")} label="Organizace / pracoviště" error={errors.company} hint="nepovinné">
          <input id={id("company")} name="company" autoComplete="organization" maxLength={ENQUIRY_LIMITS.company.max} defaultValue={values.company} aria-invalid={!!errors.company} className={input} />
        </Field>
      </div>

      <Field id={id("department")} label="Komu je dotaz určen" error={errors.department} required>
        <select id={id("department")} name="department" defaultValue={values.department ?? defaultDepartment} aria-invalid={!!errors.department} aria-describedby={errors.department ? `${id("department")}-err` : undefined} className={input}>
          {DEPARTMENTS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </Field>

      <Field id={id("reference")} label="Produkt nebo kurz" error={errors.reference} hint="nepovinné">
        <input id={id("reference")} name="reference" maxLength={ENQUIRY_LIMITS.reference.max} defaultValue={values.reference ?? defaultReference} aria-invalid={!!errors.reference} className={input} />
      </Field>

      <Field id={id("message")} label="Zpráva" error={errors.message} required hint={`max. ${ENQUIRY_LIMITS.message.max} znaků · neuvádějte prosím zdravotní údaje`}>
        <textarea id={id("message")} name="message" rows={5} required maxLength={ENQUIRY_LIMITS.message.max} defaultValue={values.message} aria-invalid={!!errors.message} aria-describedby={`${id("message")}-hint${errors.message ? ` ${id("message")}-err` : ""}`} className={input} />
      </Field>

      {/* Honeypot: hidden from people and assistive tech. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={id("website")}>Nevyplňujte</label>
        <input id={id("website")} name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <div className="flex items-start gap-3">
          <input
            id={id("acknowledged")}
            name="acknowledged"
            type="checkbox"
            defaultChecked={values.acknowledged === "on"}
            aria-invalid={!!errors.acknowledged}
            aria-describedby={errors.acknowledged ? `${id("acknowledged")}-err` : undefined}
            className="mt-1 h-6 w-6 shrink-0 accent-brand"
          />
          <label htmlFor={id("acknowledged")} className="leading-relaxed">
            Beru na vědomí, že údaje budou použity k vyřízení dotazu podle{" "}
            <a href="/ochrana-osobnich-udaju/" className="underline underline-offset-2">
              zásad ochrany osobních údajů
            </a>
            .
          </label>
        </div>
        {errors.acknowledged && (
          <p id={`${id("acknowledged")}-err`} className="mt-2 font-medium text-brand">
            {errors.acknowledged}
          </p>
        )}
      </div>

      <button type="submit" disabled={pending} className={buttonClass("primary", "w-full disabled:opacity-60 sm:w-auto")}>
        {pending ? "Ověřuji…" : "Ověřit dotaz (test)"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  required,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="font-semibold">
        {label}
        {required && <span className="text-brand"> *</span>}
        {hint && (
          <span id={`${id}-hint`} className="ml-2 text-sm font-normal text-muted">
            {hint}
          </span>
        )}
      </label>
      {children}
      {error && (
        <p id={`${id}-err`} className={cx("mt-2 font-medium text-brand")}>
          {error}
        </p>
      )}
    </div>
  );
}
