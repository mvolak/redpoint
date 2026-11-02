import type { Metadata } from "next";
import { referenceClinic } from "@redcord/content";
import { ArrowLink, Card, ExternalMark, RuleQuote, Section, SectionHeading } from "@redcord/ui";
import { PageIntro, ReviewOnly } from "@/components/blocks";

export const metadata: Metadata = {
  title: "Metoda Neurac",
  description: "Jak souvisí vybavení Redcord a terapeutický přístup Neurac, kde se mu naučit a kde najít certifikované terapeuty.",
  alternates: { canonical: "/neurac/" },
};

export default function NeuracPage() {
  return (
    <>
      <PageIntro
        crumbs={[{ label: "Neurac" }]}
        title="Metoda Neurac®"
        intro="Neurac® je terapeutický přístup, který pracuje s vybavením Redcord. Tato stránka vysvětluje rozdíl mezi vybavením a metodou a vede dál podle toho, kdo jste."
      />
      <Section tone="ink" labelledBy="rel-title">
        <div className="grid gap-12 lg:grid-cols-2">
          <SectionHeading id="rel-title" title="Vybavení a metoda" tone="dark" />
          <div className="grid gap-5 sm:grid-cols-2">
            <Card tone="ink">
              <p className="text-sm font-semibold uppercase tracking-wider text-white/60">Vybavení</p>
              <h3 className="mt-2 text-2xl font-bold">Redcord®</h3>
              <p className="mt-3 text-white/80">Závěsný systém využívaný ve fyzioterapii i v tréninku.</p>
            </Card>
            <Card tone="ink">
              <p className="text-sm font-semibold uppercase tracking-wider text-white/60">Metoda</p>
              <h3 className="mt-2 text-2xl font-bold">Neurac®</h3>
              <p className="mt-3 text-white/80">Terapeutický přístup, který se fyzioterapeuti a lékaři učí v kurzech Neurac 1–3.</p>
            </Card>
          </div>
        </div>
        <div className="mt-10 max-w-3xl">
          <ReviewOnly title="Odborný text čeká na schválení">
            Popis principů metody a jakákoli tvrzení o účinnosti vyžadují odborné a redakční schválení. Globální tvrzení z redcord.com
            nepřebíráme bez schválení.
          </ReviewOnly>
        </div>
      </Section>

      <Section labelledBy="routes-title">
        <SectionHeading id="routes-title" title="Kam dál" />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <Card>
            <h3 className="text-xl font-bold">Jsem fyzioterapeut nebo lékař</h3>
            <p className="mt-2 text-muted">Naučte se metodu v certifikovaných kurzech.</p>
            <ArrowLink href="/vzdelavani/neurac/" className="mt-5">
              Kurzy Neurac
            </ArrowLink>
          </Card>
          <Card>
            <h3 className="text-xl font-bold">Hledám terapeuta</h3>
            <p className="mt-2 text-muted">Seznam certifikovaných terapeutů podle města.</p>
            <ArrowLink href="/neurac/kdo-jsou-certified-neurac-practitioners/" className="mt-5">
              Certified Neurac Practitioners
            </ArrowLink>
          </Card>
          <Card>
            <h3 className="text-xl font-bold">Hledám léčbu</h3>
            <p className="mt-2 text-muted">Pacienty přijímá referenční pracoviště {referenceClinic.name}.</p>
            <a href={referenceClinic.url} rel="noopener" className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4">
              {referenceClinic.name} <ExternalMark />
            </a>
          </Card>
        </div>
      </Section>

      <Section tone="muted" labelledBy="certifikace-title" id="certifikace">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <h2 id="certifikace-title" className="text-section font-bold">
            Co znamená Certified Neurac® Practitioner
          </h2>
          <div className="space-y-6">
            <RuleQuote>Označení náleží terapeutům, kteří absolvovali certifikační cestu Neurac.</RuleQuote>
            <ReviewOnly>
              Přesná definice a podmínky certifikace pocházejí ze stránky /neurac/certified-neurac-practitioner/, která nebyla pro
              prototyp ověřena. Text výše je návrh k odbornému schválení.
            </ReviewOnly>
          </div>
        </div>
      </Section>
    </>
  );
}
