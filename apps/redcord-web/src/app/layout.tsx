import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/inter";
import "./globals.css";
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

/**
 * Root shell only. Public pages get the site chrome from (site)/layout.tsx;
 * staff booking pages under (booking)/ have their own reception layout.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs">
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
