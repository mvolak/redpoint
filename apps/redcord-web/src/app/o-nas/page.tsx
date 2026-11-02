import type { Metadata } from "next";
import { company, referenceClinic } from "@redcord/content";
import { ButtonLink, Card, Container, Section, SectionHeading } from "@redcord/ui";
import { Media } from "@/components/Media";
import { PageIntro, ReviewOnly } from "@/components/blocks";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "O nás",
  description: "AHAMA s.r.o. — výhradní zastoupení Redcord® pro Českou a Slovenskou republiku.",
  alternates: { canonical: "/o-nas/" },
};

const timeline = [
  { year: "1997", text: "Zahájení dovozu systémů Redcord (dříve TerapiMaster)." },
  { year: "2000", text: "Zavedení systematického vzdělávání fyzioterapeutů v metodě Neurac v ČR a SR." },
  { year: "2013", text: "Otevření Redpoint Clinic CZ v Praze." },
  { year: "2017", text: "Nová pobočka v Praze na Černém Mostě." },
];

export default function AboutPage() {
  return (
    <>
      <PageIntro
        crumbs={[{ label: "O nás" }]}
        title="O nás"
        intro={`Společnost ${company.legalName} je oficiálním výhradním zástupcem společnosti Redcord AS Norway pro Českou republiku a Slovenskou republiku.`}
        aside={
          <div className="overflow-hidden rounded-card">
            <Media slot="about-team" />
          </div>
        }
      />
      <Section labelledBy="services-title">
        <SectionHeading id="services-title" title="Co zajišťujeme" />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "Dodávky a instalace zařízení Redcord®",
            "Prodej Redcord® Mini",
            "Vzdělávání fyzioterapeutů a lékařů (Neurac®)",
            "Vzdělávání trenérů",
            "Technické kontroly zařízení",
          ].map((s) => (
            <li key={s}>
              <Card className="h-full p-5 md:p-6">
                <p className="text-lg font-semibold">{s}</p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>
      <Section tone="ink" labelledBy="history-title">
        <h2 id="history-title" className="text-section font-bold">
          Historie
        </h2>
        <ol className="mt-10 grid gap-px overflow-hidden rounded-card bg-line-on-ink md:grid-cols-4">
          {timeline.map((t) => (
            <li key={t.year} className="bg-ink p-6">
              <p className="text-4xl font-bold text-brand">{t.year}</p>
              <p className="mt-3 text-white/85">{t.text}</p>
            </li>
          ))}
        </ol>
      </Section>
      <Section tone="muted" labelledBy="ref-title">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <h2 id="ref-title" className="text-section font-bold">
              {referenceClinic.name}
            </h2>
            <p className="mt-4 text-lg text-muted">{referenceClinic.description}</p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <ButtonLink href={referenceClinic.url} external variant="dark">
              Web kliniky
            </ButtonLink>
            {site.external.clinicBookingUrl && (
              <ButtonLink href={site.external.clinicBookingUrl} external variant="outline-dark">
                Objednat se
              </ButtonLink>
            )}
          </div>
        </div>
      </Section>

      {site.reviewMode && (
        <Section labelledBy="prototyp-title" id="prototyp">
          <Container className="max-w-3xl px-0 md:px-0 lg:px-0">
            <h2 id="prototyp-title" className="text-section font-bold">
              O tomto prototypu
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed">
              <p>Toto je koncept nového webu k revizi vlastníkem, nikoli spuštěná služba.</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  <strong>Skutečná data (k ověření):</strong> kontakty, firemní údaje, názvy produktových řad, struktura kurzů a podmínky
                  účasti — převzato ze stávajícího redcord.cz dne 1. 11. 2026.
                </li>
                <li>
                  <strong>Návrhy textů:</strong> titulky a úvodní texty označené štítkem „Návrh textu“.
                </li>
                <li>
                  <strong>Ilustrační data:</strong> nadcházející termíny kurzů označené „Ilustrační termín“ — vymyšlené pro ukázku rozhraní.
                </li>
                <li>
                  <strong>Nenapojeno:</strong> formuláře (testovací režim, nic neodesílají), e-shop a registrace (pouze odkazy ven),
                  rezervace kliniky (URL nedodána), analytika (nic se neměří), vyhledávání (jen lokální obsah prototypu).
                </li>
                <li>
                  <strong>Fotografie a logo:</strong> nahrazeny označenými zástupnými plochami a textovým logotypem.
                </li>
              </ul>
            </div>
            <div className="mt-6">
              <ReviewOnly>
                Historie: na webu se uvádí rok 2000 v časové ose a „od roku 2002“ v profilu; počty absolventů 200 vs. 250 ročně. Prosíme
                o potvrzení.
              </ReviewOnly>
            </div>
          </Container>
        </Section>
      )}
    </>
  );
}
