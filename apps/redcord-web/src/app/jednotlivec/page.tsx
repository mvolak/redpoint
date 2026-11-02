import type { Metadata } from "next";
import { ArrowLink, ButtonLink, Card, Section, SectionHeading } from "@redcord/ui";
import { Media } from "@/components/Media";
import { PageIntro, ProductCard, ReviewOnly } from "@/components/blocks";
import { site } from "@/config/site";
import { repo } from "@/lib/content";

export const metadata: Metadata = {
  title: "Redcord pro jednotlivce",
  description: "Sestavy Redcord pro samostatný trénink, nákup v e-shopu a navazující kurz Redcord Active Intro.",
  alternates: { canonical: "/jednotlivec/" },
};

export default function IndividualPage() {
  const products = repo.listProducts({ audience: "jednotlivec" });
  const intro = repo.getCourse("active-intro");
  return (
    <>
      <PageIntro
        crumbs={[{ label: "Jednotlivci" }]}
        title="Redcord pro jednotlivce a sportovce"
        intro="Výkonnostní trénink s vybavením Redcord umožňuje 3D cvičení se zaměřením na specifické sportovní situace. Sestavy pro domácí a individuální použití koupíte v e-shopu."
        aside={
          <div className="overflow-hidden rounded-card">
            <Media slot="individual-intro" />
          </div>
        }
      >
        <ButtonLink href={site.external.shopEquipment.url} external>
          Sestavy v e-shopu
        </ButtonLink>
        <ButtonLink href="/kontakt/?oddeleni=obchod#poptavka" variant="outline-dark">
          Poradit s výběrem
        </ButtonLink>
      </PageIntro>

      <Section tone="muted" labelledBy="ind-products">
        <SectionHeading id="ind-products" title="Sestavy pro individuální použití" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </Section>

      <Section labelledBy="ind-next">
        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <h2 id="ind-next" className="text-2xl font-bold">
              Naučte se s vybavením pracovat
            </h2>
            <p className="mt-3 text-muted">
              {intro?.eligibility ?? "Kurz pro účastníky s předchozí zkušeností s tréninkem."}
            </p>
            <ArrowLink href="/vzdelavani/kurzy/active-intro/" className="mt-6">
              Redcord Active Intro
            </ArrowLink>
          </Card>
          <Card>
            <h2 className="text-2xl font-bold">Instalace doma</h2>
            <p className="mt-3 text-muted">Potřebujete pomoci s upevněním? Instalaci zajistíme i u individuálních zákazníků.</p>
            <ArrowLink href="/vybaveni/instalace/" className="mt-6">
              Instalace
            </ArrowLink>
          </Card>
        </div>
        <div className="mt-8">
          <ReviewOnly>
            Stávající stránka tvrdí, že „studie ukazují“ lepší výsledky než tradiční trénink. Tvrzení je bez zdroje — v prototypu
            vynecháno do redakčního schválení.
          </ReviewOnly>
        </div>
      </Section>
    </>
  );
}
