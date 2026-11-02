import Link from "next/link";
import { referenceClinic } from "@redcord/content";
import {
  ArrowLink,
  ButtonLink,
  Card,
  Container,
  EmptyState,
  ExternalMark,
  PhotoCard,
  Pill,
  RuleQuote,
  Section,
  SectionHeading,
  Stat,
} from "@redcord/ui";
import { ContactRouting, ReviewOnly, SessionCard, SourceBadge } from "@/components/blocks";
import { Media } from "@/components/Media";
import { homeCopy as c } from "@/content/copy";
import { site } from "@/config/site";
import { repo } from "@/lib/content";

export const revalidate = 3600;

export default function HomePage() {
  const metrics = repo.listMetrics();
  const testimonials = repo.listTestimonials();
  const sessions = repo.listSessions({ now: new Date() }).upcoming.slice(0, 3);
  const consultCount = repo.listProducts().filter((p) => p.purchasePath === "consult").length;
  const shopCount = repo.listProducts().filter((p) => p.purchasePath === "shop").length;

  return (
    <>
      {/* 2 · Hero — inset rounded panel */}
      <div className="px-3 pt-3 md:px-5 md:pt-5">
        <section aria-labelledby="hero-title" className="relative overflow-hidden rounded-hero bg-ink text-white">
          <div className="absolute inset-0">
            <Media slot="home-hero" fill tone="dark" compact priority sizes="100vw" />
            <div className="absolute inset-0 bg-black/45" />
          </div>
          <Container className="relative grid min-h-[34rem] gap-10 py-14 md:py-20 lg:min-h-[40rem] lg:grid-cols-[1.6fr_1fr] lg:items-end">
            <div className="max-w-3xl self-center">
              <h1 id="hero-title" className="text-display font-bold">
                {c.hero.title}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85 md:text-xl">{c.hero.lead}</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <ButtonLink href="/vybaveni/">Prozkoumat vybavení</ButtonLink>
                <ButtonLink href="/vzdelavani/vzdelavaci-program/" variant="outline-light">
                  Najít kurz
                </ButtonLink>
              </div>
            </div>
            <div className="lg:pb-2">
              {metrics.length > 0 ? (
                <div aria-label="Ověřená čísla">
                  {metrics.map((m) => (
                    <Stat key={m.id} value={m.value} label={m.label} />
                  ))}
                </div>
              ) : (
                <ul className="divide-y divide-white/25 border-y border-white/25">
                  {c.hero.services.map((s) => (
                    <li key={s} className="py-4 text-lg font-semibold">
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Container>
          {site.reviewMode && (
            <p className="relative px-6 pb-4 text-xs text-white/60 md:px-12">
              Pozadí: místo pro schválenou fotografii nebo ztlumené video s ovládáním pauzy. Čísla (150+, 200+) ze stávajícího webu jsou skrytá — nejsou ověřená a navzájem si odporují.
            </p>
          )}
        </section>
      </div>

      {/* 3 · Audience cards */}
      <Section labelledBy="audience-title">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading id="audience-title" eyebrow="Komu pomáháme" title={c.audiences.title} />
          <SourceBadge source={c.audiences.source} />
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <PhotoCard
            href="/vybaveni/?pro=klinika"
            kicker="Fyzioterapeuti a lékaři"
            title="Klinická pracoviště"
            description="Vybavení pro terapii a vzdělávání v metodě Neurac."
            media={<Media slot="home-audience-klinika" tone="dark" compact sizes="(min-width: 768px) 33vw, 100vw" />}
          />
          <PhotoCard
            href="/vybaveni/?pro=trener"
            kicker="Osobní trenéři a sport"
            title="Trénink a výkon"
            description="Řady Redcord Active a kurzy pro trenéry."
            media={<Media slot="home-audience-trener" tone="dark" compact sizes="(min-width: 768px) 33vw, 100vw" />}
          />
          <PhotoCard
            href="/jednotlivec/"
            kicker="Domácí a individuální použití"
            title="Jednotlivci"
            description="Sestavy pro samostatný trénink s nákupem v e-shopu."
            media={<Media slot="home-audience-jednotlivec" tone="dark" compact sizes="(min-width: 768px) 33vw, 100vw" />}
          />
        </div>
      </Section>

      {/* Editorial separator */}
      <div aria-hidden="true" className="overflow-hidden border-y border-line bg-surface py-10">
        <p className="px-5 text-center text-editorial font-bold text-balance text-ink">
          Vybavení <span className="text-brand">·</span> Metoda <span className="text-brand">·</span> Vzdělávání
        </p>
      </div>

      {/* 4 · Equipment overview */}
      <Section tone="muted" labelledBy="equipment-title">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="overflow-hidden rounded-card">
            <Media slot="home-equipment" />
          </div>
          <div>
            <SectionHeading id="equipment-title" eyebrow="Vybavení" title={c.equipment.title} intro={c.equipment.lead} />
            <ul className="mt-8 divide-y divide-line border-y border-line">
              <li className="flex items-center justify-between gap-4 py-4">
                <span>
                  <strong className="block">Kliniky a trenéři</strong>
                  <span className="text-muted">{consultCount} produktových řad · cena a konfigurace na dotaz</span>
                </span>
                <ArrowLink href="/vybaveni/">Katalog</ArrowLink>
              </li>
              <li className="flex items-center justify-between gap-4 py-4">
                <span>
                  <strong className="block">Jednotlivci</strong>
                  <span className="text-muted">{shopCount} sestavy · nákup v e-shopu</span>
                </span>
                <ArrowLink href="/jednotlivec/">Pro jednotlivce</ArrowLink>
              </li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/kontakt/?oddeleni=obchod#poptavka">Poptat konzultaci</ButtonLink>
              <ButtonLink href={site.external.shopEquipment.url} external variant="outline-dark">
                E-shop
              </ButtonLink>
            </div>
            <div className="mt-4">
              <SourceBadge source={c.equipment.source} />
            </div>
          </div>
        </div>
      </Section>

      {/* 5 · Method — dark */}
      <Section tone="ink" labelledBy="method-title">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-start">
          <SectionHeading id="method-title" eyebrow="Neurac" title={c.method.title} tone="dark" />
          <div className="space-y-6 text-lg leading-relaxed text-white/85">
            {c.method.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <ArrowLink href="/neurac/" tone="dark">
              Jak spolu souvisí vybavení a metoda
            </ArrowLink>
            <div>
              <SourceBadge source={c.method.source} />
            </div>
          </div>
        </div>
      </Section>

      {/* 6 · Education pathways */}
      <Section labelledBy="edu-title">
        <SectionHeading
          id="edu-title"
          eyebrow="Vzdělávání"
          title="Vzdělávací cesty podle vaší profese"
          intro="Kurzy na sebe navazují. U každé cesty uvádíme, pro koho je určena a jaké jsou podmínky účasti."
        />
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <Card>
            <Pill tone="dark">Fyzioterapeuti a lékaři</Pill>
            <h3 className="mt-5 text-2xl font-bold">Neurac 1 → 2 → 3</h3>
            <p className="mt-3 leading-relaxed text-muted">
              Terapeutická cesta pro profesionály se vzděláním v anatomii, fyziologii a patologii. Doporučená pauza mezi úrovněmi je 6 měsíců.
            </p>
            <ArrowLink href="/vzdelavani/neurac/" className="mt-6">
              Cesta Neurac
            </ArrowLink>
          </Card>
          <Card>
            <Pill tone="dark">Trenéři a instruktoři</Pill>
            <h3 className="mt-5 text-2xl font-bold">Redcord Active</h3>
            <p className="mt-3 leading-relaxed text-muted">
              Intro → Advanced → Pro. Pro účastníky s předchozí zkušeností s tréninkem; vyšší úrovně navazují na předchozí kurz.
            </p>
            <ArrowLink href="/vzdelavani/treneri/" className="mt-6">
              Cesta Active
            </ArrowLink>
          </Card>
          <Card>
            <Pill tone="dark">Absolventi a praxe</Pill>
            <h3 className="mt-5 text-2xl font-bold">Workshopy</h3>
            <p className="mt-3 leading-relaxed text-muted">
              Krátké tematické workshopy. Aktuální nabídku zveřejníme po potvrzení termínů.
            </p>
            <ArrowLink href="/vzdelavani/workshopy/" className="mt-6">
              Workshopy
            </ArrowLink>
          </Card>
        </div>
      </Section>

      {/* 7 · Upcoming sessions — red */}
      <Section tone="red" labelledBy="sessions-title">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading id="sessions-title" title="Nejbližší termíny kurzů" tone="dark" className="[&_p]:text-white/85" />
          <ButtonLink href="/vzdelavani/vzdelavaci-program/" variant="white">
            Všechny termíny
          </ButtonLink>
        </div>
        <div className="mt-10">
          {sessions.length > 0 ? (
            <div className="grid gap-5 text-ink lg:grid-cols-3">
              {sessions.map((v) => (
                <SessionCard key={v.session.id} view={v} />
              ))}
            </div>
          ) : (
            <EmptyState
              tone="dark"
              title="Aktuální termíny připravujeme"
              action={
                <ButtonLink href="/kontakt/?oddeleni=vzdelavani#poptavka" variant="white">
                  Zeptat se na termín
                </ButtonLink>
              }
            >
              Nové termíny kurzů zatím nejsou potvrzené. Napište nám a dáme vám vědět, jakmile budou vypsány.
            </EmptyState>
          )}
        </div>
      </Section>

      {/* 8 · Installation and support */}
      <Section labelledBy="install-title">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="order-2 lg:order-1">
            <SectionHeading id="install-title" eyebrow="Servis a bezpečnost" title={c.installation.title} intro={c.installation.lead} />
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/vybaveni/instalace/" variant="dark">
                Instalace
              </ButtonLink>
              <ButtonLink href="/bezpecnost/technicke-kontroly/" variant="outline-dark">
                Technické kontroly
              </ButtonLink>
            </div>
            <ArrowLink href="/bezpecnost/" className="mt-4">
              Bezpečnost a péče o vybavení
            </ArrowLink>
            <div className="mt-4">
              <SourceBadge source={c.installation.source} />
            </div>
          </div>
          <div className="order-1 overflow-hidden rounded-card lg:order-2">
            <Media slot="home-installation" />
          </div>
        </div>
      </Section>

      {/* 9 · Reference clinic */}
      <Section tone="muted" labelledBy="clinic-title">
        <div className="grid gap-8 rounded-card bg-white p-6 md:grid-cols-[1fr_1.4fr] md:items-center md:p-10">
          <div className="overflow-hidden rounded-2xl">
            <Media slot="home-clinic" sizes="(min-width: 768px) 40vw, 100vw" />
          </div>
          <div>
            <h2 id="clinic-title" className="text-section font-bold">
              {c.clinic.title}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">{c.clinic.lead}</p>
            <p className="mt-2 text-muted">{referenceClinic.locations.join(" · ")}</p>
            <a href={referenceClinic.url} rel="noopener" className="mt-6 inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4">
              Web Redpoint Clinic CZ <ExternalMark />
            </a>
            <div className="mt-3">
              <SourceBadge source={c.clinic.source} />
            </div>
          </div>
        </div>
      </Section>

      {/* 10 · Credibility — only approved testimonials; otherwise block disappears */}
      {testimonials.length > 0 ? (
        <Section tone="ink" labelledBy="proof-title">
          <h2 id="proof-title" className="text-section font-bold">
            Zkušenosti z praxe
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            {testimonials.map((t) => (
              <RuleQuote key={t.id} cite={`${t.author}, ${t.role}`}>
                {t.quote}
              </RuleQuote>
            ))}
          </div>
        </Section>
      ) : (
        site.reviewMode && (
          <Container className="py-8">
            <ReviewOnly title="Blok referencí je skrytý">
              Neexistují schválené reference ani citace. Blok se zobrazí automaticky, jakmile budou dodány schválené záznamy.
              Nevymýšlíme citace, loga klientů ani statistiky.
            </ReviewOnly>
          </Container>
        )
      )}

      {/* 11 · Contact routing */}
      <Section tone="muted" labelledBy="contact-title">
        <SectionHeading
          id="contact-title"
          eyebrow="Kontakt"
          title="S čím vám můžeme pomoci?"
          intro="Vyberte oddělení — dotaz se dostane přímo ke správnému člověku."
        />
        <div className="mt-10">
          <ContactRouting />
        </div>
        <p className="mt-8 text-muted">
          Hledáte léčbu? Pacienty přijímá{" "}
          <a href={referenceClinic.url} rel="noopener" className="font-semibold text-ink underline underline-offset-2">
            Redpoint Clinic CZ
          </a>
          . Hledáte terapeuta ve svém městě?{" "}
          <Link href="/neurac/kdo-jsou-certified-neurac-practitioners/" className="font-semibold text-ink underline underline-offset-2">
            Certified Neurac Practitioners
          </Link>
          .
        </p>
      </Section>
    </>
  );
}
