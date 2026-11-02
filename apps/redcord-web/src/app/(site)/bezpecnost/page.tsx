import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Section } from "@redcord/ui";
import { ContactRouting, PageIntro, ReviewOnly, SourceBadge } from "@/components/blocks";
import { repo } from "@/lib/content";

export const metadata: Metadata = {
  title: "Servis a bezpečnost",
  description: "Bezpečnost používání vybavení Redcord, technické kontroly, péče a údržba a školení bezpečnosti.",
  alternates: { canonical: "/bezpecnost/" },
};

export default function SafetyHubPage() {
  const topics = repo.listSafetyTopics();
  return (
    <>
      <PageIntro
        crumbs={[{ label: "Servis a bezpečnost" }]}
        title="Bezpečnost používání vybavení Redcord"
        intro="Bezpečnost a dlouhodobá životnost vybavení Redcord a všech jeho součástí vyžaduje přiměřenou pozornost a péči. Zaškolení v bezpečném používání probíhá vždy s montáží nového vybavení."
      >
        <ButtonLink href="/bezpecnost/technicke-kontroly/">Objednat technickou kontrolu</ButtonLink>
        <ButtonLink href="/kontakt/?oddeleni=servis#poptavka" variant="outline-dark">
          Servisní dotaz
        </ButtonLink>
      </PageIntro>
      <Section labelledBy="topics-title">
        <h2 id="topics-title" className="text-section font-bold">
          Témata
        </h2>
        <ul className="mt-8 grid gap-5 md:grid-cols-2">
          {topics.map((t) => (
            <li key={t.slug} className="relative rounded-card border border-line p-6 hover:border-ink md:p-8">
              <h3 className="text-2xl font-bold">
                <Link href={`/bezpecnost/${t.slug}/`} className="after:absolute after:inset-0">
                  {t.title}
                </Link>
              </h3>
              <p className="mt-2 text-muted">{t.summary}</p>
              <p className="mt-4 text-sm font-semibold">
                {t.body.length > 0 ? "Číst" : "Dokumenty připravujeme"} <span aria-hidden="true" className="text-brand">→</span>
              </p>
              <div className="relative mt-3">
                <SourceBadge source={t.source} />
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <ReviewOnly>
            Obsah bezpečnostních podstránek a dokumenty (oznámení o výměnných akcích, péče, školení) musí dodat vlastník. Prototyp
            nevytváří bezpečnostní pokyny ani limity.
          </ReviewOnly>
        </div>
      </Section>
      <Section tone="muted" labelledBy="support-title">
        <h2 id="support-title" className="text-section font-bold">
          Podpora pro stávající zákazníky
        </h2>
        <div className="mt-8">
          <ContactRouting />
        </div>
      </Section>
    </>
  );
}
