import type { Metadata } from "next";
import { company, referenceClinic } from "@redcord/content";
import { ENQUIRY_DEPARTMENTS, type EnquiryDepartment } from "@redcord/integrations";
import { ExternalMark, Section } from "@redcord/ui";
import { ContactRouting, PageIntro, ReviewOnly, SourceBadge } from "@/components/blocks";
import { EnquiryForm } from "@/components/EnquiryForm";
import { repo } from "@/lib/content";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Obchod a instalace, vzdělávání a servis Redcord pro ČR a SR. Telefony, e-maily a poptávkový formulář.",
  alternates: { canonical: "/kontakt/" },
};

type SP = Record<string, string | string[] | undefined>;

export default async function ContactPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const dep = typeof sp.oddeleni === "string" && (ENQUIRY_DEPARTMENTS as readonly string[]).includes(sp.oddeleni) ? (sp.oddeleni as EnquiryDepartment) : "obchod";
  const ref = typeof sp.ref === "string" ? sp.ref.slice(0, 120) : "";
  const management = repo.listDepartments().find((d) => d.id === "vedeni");

  return (
    <>
      <PageIntro
        crumbs={[{ label: "Kontakt" }]}
        title="Kontakt"
        intro="Výhradní zastoupení Redcord® pro Českou a Slovenskou republiku. Vyberte oddělení podle tématu dotazu."
      />
      <Section tone="muted" labelledBy="deps-title">
        <h2 id="deps-title" className="sr-only">
          Oddělení
        </h2>
        <ContactRouting />
      </Section>

      <Section labelledBy="form-title" id="poptavka">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 id="form-title" className="text-section font-bold">
              Napište nám
            </h2>
            <p className="mt-4 text-lg text-muted">
              Poptávka vybavení, instalace, dotaz ke kurzu nebo servis. Neuvádějte prosím zdravotní údaje — pro léčbu kontaktujte{" "}
              <a href={referenceClinic.url} rel="noopener" className="font-semibold text-ink underline">
                {referenceClinic.name}
              </a>
              .
            </p>
            <div className="mt-6">
              <ReviewOnly>
                Testovací adaptér: formulář validuje na serveru (délky, oddělení, e-mail, honeypot, omezení počtu pokusů), ale data nikam
                neukládá ani neposílá. Produkční směrování a doručení je položkou backlogu.
              </ReviewOnly>
            </div>
          </div>
          <div className="rounded-card bg-gradient-to-b from-surface-muted to-white p-6 md:p-10">
            <EnquiryForm key={`${dep}-${ref}`} defaultDepartment={dep} defaultReference={ref} />
          </div>
        </div>
      </Section>

      <Section tone="muted" labelledBy="company-title">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 id="company-title" className="text-2xl font-bold">
              Provozovatel
            </h2>
            <address className="mt-4 not-italic leading-relaxed">
              <strong>{company.legalName}</strong>
              <br />
              {company.address.street}, {company.address.postalCode} {company.address.city}
              <br />
              IČ: {company.ico} · DIČ: {company.dic}
              <br />
              <span className="text-muted">{company.register}</span>
              <br />
              <span className="text-muted">{company.sukl}</span>
            </address>
            <div className="mt-3">
              <SourceBadge source={company.source} />
            </div>
          </div>
          <div>
            {management && (
              <>
                <h2 className="text-2xl font-bold">{management.name}</h2>
                <p className="mt-4">{management.contactPerson}</p>
                <p>
                  <a href={`tel:${management.phones[0]?.number.replace(/\s/g, "")}`} className="font-semibold hover:text-brand">
                    {management.phones[0]?.number}
                  </a>{" "}
                  ·{" "}
                  <a href={`mailto:${management.email}`} className="font-semibold hover:text-brand">
                    {management.email}
                  </a>
                </p>
              </>
            )}
            <h2 className="mt-8 text-2xl font-bold">Referenční pracoviště</h2>
            <p className="mt-4">{referenceClinic.description}</p>
            <a href={referenceClinic.url} rel="noopener" className="mt-2 inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4">
              {referenceClinic.name} <ExternalMark />
            </a>
          </div>
        </div>
      </Section>
    </>
  );
}
