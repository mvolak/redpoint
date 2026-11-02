import Link from "next/link";
import { company, referenceClinic } from "@redcord/content";
import { Container, ExternalMark } from "@redcord/ui";
import { site } from "@/config/site";
import { Wordmark } from "./Wordmark";

const groups = [
  {
    title: "Vybavení",
    links: [
      { label: "Přehled vybavení", href: "/vybaveni/" },
      { label: "Pro jednotlivce", href: "/jednotlivec/" },
      { label: "Instalace", href: "/vybaveni/instalace/" },
    ],
  },
  {
    title: "Vzdělávání",
    links: [
      { label: "Neurac pro fyzioterapeuty", href: "/vzdelavani/neurac/" },
      { label: "Redcord Active pro trenéry", href: "/vzdelavani/treneri/" },
      { label: "Termíny kurzů", href: "/vzdelavani/vzdelavaci-program/" },
      { label: "Certified Neurac Practitioners", href: "/neurac/kdo-jsou-certified-neurac-practitioners/" },
    ],
  },
  {
    title: "Servis a bezpečnost",
    links: [
      { label: "Bezpečnost", href: "/bezpecnost/" },
      { label: "Technické kontroly", href: "/bezpecnost/technicke-kontroly/" },
      { label: "Péče a údržba", href: "/bezpecnost/pece-a-udrzba/" },
    ],
  },
  {
    title: "Společnost",
    links: [
      { label: "O nás", href: "/o-nas/" },
      { label: "Kontakt", href: "/kontakt/" },
      { label: "Ochrana osobních údajů", href: "/ochrana-osobnich-udaju/" },
      { label: "Cookies", href: "/cookies/" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-ink text-white">
      <Container className="py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Wordmark tone="white" />
            <p className="mt-5 max-w-sm leading-relaxed text-muted-on-ink">{company.role}.</p>
            <address className="mt-6 not-italic leading-relaxed text-muted-on-ink">
              {company.legalName}
              <br />
              {company.address.street}
              <br />
              {company.address.postalCode} {company.address.city}
              <br />
              IČ: {company.ico} · DIČ: {company.dic}
            </address>
            <div className="mt-6 flex flex-wrap gap-2">
              <a href={site.external.shop.url} rel="noopener" className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-5 font-semibold text-ink">
                E-shop <ExternalMark />
              </a>
              <a href={referenceClinic.url} rel="noopener" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/40 px-5 font-semibold">
                Redpoint Clinic CZ <ExternalMark />
              </a>
              <a href={site.external.clinicBooking.href} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/40 px-5 font-semibold">
                {site.external.clinicBooking.label}
              </a>
            </div>
          </div>
          <nav aria-label="Patička" className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {groups.map((g) => (
              <div key={g.title}>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">{g.title}</h2>
                <ul className="mt-4 space-y-1">
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="inline-flex min-h-10 items-center text-white/90 hover:text-white hover:underline">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-14 flex flex-col gap-6 border-t border-line-on-ink pt-8 md:flex-row md:items-center md:justify-between">
          <ul className="flex flex-wrap gap-2" aria-label="Sociální sítě">
            {site.social.map((s) => (
              <li key={s.id}>
                <a href={s.url} rel="noopener" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/25 px-4 text-sm hover:border-white">
                  {s.label} <ExternalMark />
                </a>
              </li>
            ))}
          </ul>
          <p className="text-sm text-white/60">
            © {company.legalName} · Výhradní zastoupení Redcord® pro ČR a SR
          </p>
        </div>
      </Container>
    </footer>
  );
}
