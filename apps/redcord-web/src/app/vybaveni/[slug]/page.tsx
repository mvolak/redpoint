import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AUDIENCE_LABELS } from "@redcord/content";
import { isSafeExternalUrl } from "@redcord/integrations";
import { ArrowLink, Breadcrumbs, ButtonLink, Card, Container, EmptyState, Pill, Section } from "@redcord/ui";
import { ReviewOnly, SourceBadge } from "@/components/blocks";
import { EnquiryForm } from "@/components/EnquiryForm";
import { Media } from "@/components/Media";
import { HandoffLink, TrackView } from "@/components/Tracked";
import { repo } from "@/lib/content";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return repo.listProducts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = repo.getProduct((await params).slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.summary,
    alternates: { canonical: `/vybaveni/${product.slug}/` },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = repo.getProduct((await params).slug);
  if (!product) notFound();
  const courses = product.relatedCourseSlugs.map((s) => repo.getCourse(s)).filter((c) => c !== undefined);
  const shop = product.purchasePath === "shop" && isSafeExternalUrl(product.shopUrl);

  return (
    <>
      <TrackView event="equipment_viewed" props={{ product: product.slug }} />
      <Container className="pt-8">
        <Breadcrumbs items={[{ href: "/", label: "Úvod" }, { href: "/vybaveni/", label: "Vybavení" }, { label: product.name }]} />
      </Container>

      <Section className="pt-8 lg:pt-10">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="flex flex-wrap gap-2">
              {product.audiences.map((a) => (
                <Pill key={a}>{AUDIENCE_LABELS[a]}</Pill>
              ))}
            </div>
            <h1 className="mt-6 text-display font-bold">{product.name}</h1>
            <p className="mt-6 text-lg leading-relaxed text-muted md:text-xl">{product.summary}</p>
            <p className="mt-6 text-lg font-semibold">
              {shop ? "Aktuální cenu a dostupnost najdete v e-shopu." : "Cena a konfigurace na dotaz"}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {shop ? (
                <>
                  <HandoffLink href={product.shopUrl!} event="shop_handoff" props={{ product: product.slug }}>
                    Přejít do e-shopu
                  </HandoffLink>
                  <ButtonLink href="#dotaz" variant="outline-dark">
                    Poradit s výběrem
                  </ButtonLink>
                </>
              ) : (
                <ButtonLink href="#dotaz">Poptat konzultaci</ButtonLink>
              )}
            </div>
            <div className="mt-6">
              <SourceBadge source={product.source} />
            </div>
          </div>
          <div className="overflow-hidden rounded-card">
            <Media slot={`product-${product.slug}`} priority />
          </div>
        </div>
      </Section>

      <Section tone="muted" labelledBy="use-title">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 id="use-title" className="text-section font-bold">
              Použití
            </h2>
            {product.uses.length > 0 ? (
              <ul className="mt-6 space-y-3">
                {product.uses.map((u) => (
                  <li key={u} className="border-l-4 border-brand pl-4">
                    {u}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-6">
                <EmptyState title="Popis použití připravujeme">
                  Podrobné informace o této řadě vám rádi sdělíme osobně. Technické parametry a bezpečnostní limity uvádíme pouze podle
                  dokumentace výrobce.
                </EmptyState>
              </div>
            )}
          </div>
          <div>
            <h2 className="text-section font-bold">Související vzdělávání</h2>
            {courses.length > 0 ? (
              <ul className="mt-6 space-y-3">
                {courses.map((c) => (
                  <li key={c.slug}>
                    <Card className="p-5 md:p-6">
                      <p className="text-sm text-muted">{c.level}</p>
                      <ArrowLink href={`/vzdelavani/kurzy/${c.slug}/`} className="text-lg">
                        {c.title}
                      </ArrowLink>
                    </Card>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-muted">
                Pro tuto řadu nemáme navázaný kurz. Přehled najdete ve{" "}
                <Link href="/vzdelavani/" className="font-semibold text-ink underline">
                  vzdělávání
                </Link>
                .
              </p>
            )}
          </div>
        </div>
      </Section>

      <Section labelledBy="dotaz-title" id="dotaz">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 id="dotaz-title" className="text-section font-bold">
              {shop ? "Potřebujete poradit?" : "Poptávka a konzultace"}
            </h2>
            <p className="mt-4 text-lg text-muted">Odpovídá obchodní oddělení. Zdravotní údaje prosím neuvádějte.</p>
            <div className="mt-6">
              <ReviewOnly>Formulář je v testovacím režimu — data se neukládají ani neodesílají.</ReviewOnly>
            </div>
          </div>
          <EnquiryForm defaultDepartment="obchod" defaultReference={product.name} idPrefix="produkt" />
        </div>
      </Section>
    </>
  );
}
