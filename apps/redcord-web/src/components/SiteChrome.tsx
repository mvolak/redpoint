import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { PrototypeBanner } from "@/components/PrototypeBanner";
import { site } from "@/config/site";

/** Public site chrome: skip link, review banner, header, main, footer. Staff booking pages don't use it. */
export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#obsah"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-white"
      >
        Přeskočit na obsah
      </a>
      {site.reviewMode && <PrototypeBanner />}
      <Header nav={site.nav} shopUrl={site.external.shop.url} cta={site.primaryCta} bookingCta={site.bookingCta} />
      <main id="obsah" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <Footer />
    </>
  );
}
