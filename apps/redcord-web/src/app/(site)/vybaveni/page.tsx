import type { Metadata } from "next";
import Link from "next/link";
import { AUDIENCE_LABELS, type Audience } from "@redcord/content";
import { Accordion, ButtonLink, Container, EmptyState, Section, SectionHeading, cx } from "@redcord/ui";
import { PageIntro, ProductCard, ReviewOnly } from "@/components/blocks";
import { site } from "@/config/site";
import { repo } from "@/lib/content";

export const metadata: Metadata = {
  title: "Vybavení Redcord",
  description: "Řady vybavení Redcord pro fyzioterapeutická pracoviště, trenéry a jednotlivce. Konzultace, instalace a nákup.",
  alternates: { canonical: "/vybaveni/" },
};

const FILTERS: { value?: Audience; label: string }[] = [
  { label: "Vše" },
  { value: "klinika", label: "Fyzioterapeuti a kliniky" },
  { value: "trener", label: "Trenéři a sport" },
  { value: "jednotlivec", label: "Jednotlivci" },
];

function parseAudience(v: unknown): Audience | undefined {
  return v === "klinika" || v === "trener" || v === "jednotlivec" ? v : undefined;
}

export default async function EquipmentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const audience = parseAudience(sp.pro);
  const products = repo.listProducts({ audience });
  const consult = products.filter((p) => p.purchasePath === "consult");
  const shop = products.filter((p) => p.purchasePath === "shop");

  return (
    <>
      <PageIntro
        crumbs={[{ label: "Vybavení" }]}
        title="Vybavení Redcord"
        intro="Redcord® je značka vybavení pro fyzioterapeuty a trenéry. Pracoviště a tréninková zařízení konfigurujeme na míru a instalujeme; sestavy pro jednotlivce koupíte v e-shopu."
      >
        <ButtonLink href="/kontakt/?oddeleni=obchod#poptavka">Poptat konzultaci</ButtonLink>
        <ButtonLink href={site.external.shopEquipment.url} external variant="outline-dark">
          E-shop
        </ButtonLink>
      </PageIntro>

      <Section tone="muted" labelledBy="catalogue-title" className="lg:py-16">
        <h2 id="catalogue-title" className="sr-only">
          Produktové řady
        </h2>
        <nav aria-label="Filtr podle použití">
          <ul className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = f.value === audience;
              return (
                <li key={f.label}>
                  <Link
                    href={f.value ? `/vybaveni/?pro=${f.value}` : "/vybaveni/"}
                    aria-current={active ? "true" : undefined}
                    scroll={false}
                    className={cx(
                      "inline-flex min-h-11 items-center rounded-full border px-5 font-semibold",
                      active ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink",
                    )}
                  >
                    {f.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <p className="mt-4 text-muted" aria-live="polite">
          {audience ? `${AUDIENCE_LABELS[audience]}: ` : ""}
          {products.length} {products.length === 1 ? "řada" : products.length < 5 ? "řady" : "řad"}
        </p>

        {products.length === 0 && (
          <div className="mt-8">
            <EmptyState title="Pro tento filtr zatím nemáme schválené produkty" action={<ButtonLink href="/kontakt/?oddeleni=obchod#poptavka">Poradit s výběrem</ButtonLink>}>
              Napište nám, co potřebujete, a doporučíme vhodné řešení.
            </EmptyState>
          </div>
        )}

        {consult.length > 0 && (
          <div className="mt-10">
            <h3 className="text-2xl font-bold">Pro pracoviště a tréninková zařízení</h3>
            <p className="mt-2 text-muted">Cena a konfigurace na dotaz · instalace a zaškolení</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {consult.map((p) => (
                <ProductCard key={p.slug} product={p} headingLevel="h3" />
              ))}
            </div>
          </div>
        )}

        {shop.length > 0 && (
          <div className="mt-14">
            <h3 className="text-2xl font-bold">Pro jednotlivce</h3>
            <p className="mt-2 text-muted">Dostupnost a ceny v e-shopu obchod.redcord.cz</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {shop.map((p) => (
                <ProductCard key={p.slug} product={p} headingLevel="h3" />
              ))}
            </div>
          </div>
        )}

        <div className="mt-10">
          <ReviewOnly>
            Názvy řad pocházejí z navigace stávajícího webu; produktové stránky, popisy použití, fotografie a aktuální sortiment musí
            potvrdit vlastník. Ceny se nezobrazují, dokud nebude k dispozici důvěryhodné napojení na e-shop.
          </ReviewOnly>
        </div>
      </Section>

      <Section labelledBy="faq-title">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr]">
          <SectionHeading id="faq-title" title="Časté dotazy k nákupu" intro="Odpovědi doplní obchodní oddělení." />
          <Accordion
            items={[
              {
                q: "Jak probíhá výběr vybavení pro pracoviště?",
                a: "Po úvodní konzultaci navrhneme řešení podle vašeho prostoru, zaměření a rozpočtu. Řešení vždy přizpůsobíme vašim potřebám a možnostem.",
              },
              {
                q: "Zajišťujete instalaci?",
                a: (
                  <>
                    Ano, veškeré dodávané vybavení na přání klienta instalujeme. Podrobnosti na stránce{" "}
                    <Link href="/vybaveni/instalace/" className="font-semibold text-ink underline">
                      Instalace
                    </Link>
                    .
                  </>
                ),
              },
              {
                q: "Kde zjistím cenu?",
                a: "Ceny vybavení pro pracoviště sdělujeme na dotaz podle konfigurace. Sestavy pro jednotlivce najdete s aktuální cenou v e-shopu.",
              },
            ]}
          />
        </div>
        <Container className="mt-6 px-0 md:px-0 lg:px-0">
          <ReviewOnly>Odpovědi jsou návrh z obsahu stávajícího webu; technické a bezpečnostní údaje záměrně neuvádíme.</ReviewOnly>
        </Container>
      </Section>
    </>
  );
}
