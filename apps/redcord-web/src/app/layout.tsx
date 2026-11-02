import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/inter";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { PrototypeBanner } from "@/components/PrototypeBanner";
import { site } from "@/config/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.origin),
  title: {
    default: "Redcord — vybavení, metoda Neurac a vzdělávání | ČR a SR",
    template: "%s | Redcord ČR a SR",
  },
  description:
    "Výhradní zastoupení Redcord® pro Českou a Slovenskou republiku: vybavení pro fyzioterapii a trénink, instalace, servis a kurzy Neurac a Redcord Active.",
  applicationName: "Redcord ČR",
  openGraph: { type: "website", locale: "cs_CZ", siteName: "Redcord ČR a SR" },
  robots: site.reviewMode ? { index: false, follow: false } : undefined,
};

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs">
      <body className="flex min-h-dvh flex-col">
        <a
          href="#obsah"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-white"
        >
          Přeskočit na obsah
        </a>
        {site.reviewMode && <PrototypeBanner />}
        <Header nav={site.nav} shopUrl={site.external.shop.url} cta={site.primaryCta} />
        <main id="obsah" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
