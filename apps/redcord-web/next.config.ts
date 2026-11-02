import type { NextConfig } from "next";
import { redirectRules } from "./src/config/redirects";

const isPreview = (process.env.SITE_ENV ?? "preview") !== "production";

// Booking pages and API (packages/booking): the booking app's own strict policy — no third-party
// scripts, no framing. Scoped to booking paths so the rest of the site is unaffected.
const bookingCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'" + (process.env.NEXT_PUBLIC_SUPABASE_URL ? ` ${process.env.NEXT_PUBLIC_SUPABASE_URL}` : ""),
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
].join("; ");
const bookingSecurity = [
  { key: "Content-Security-Policy", value: bookingCsp },
  { key: "X-Frame-Options", value: "DENY" },
];
const noindex = { key: "X-Robots-Tag", value: "noindex, nofollow" };

const nextConfig: NextConfig = {
  transpilePackages: ["@redcord/ui", "@redcord/content", "@redcord/integrations", "@redcord/booking"],
  serverExternalPackages: ["postgres", "nodemailer"],
  trailingSlash: true,
  poweredByHeader: false,
  async redirects() {
    return redirectRules
      .filter((r) => r.status === "decided" || (isPreview && r.status === "proposed"))
      .map((r) => ({
        source: r.from,
        destination: r.to,
        // Only owner-decided equivalents become permanent. Proposed ones stay temporary.
        permanent: r.status === "decided",
      }));
  },
  async headers() {
    const headers = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    if (isPreview) headers.push(noindex);
    return [
      { source: "/:path*", headers },
      { source: "/rezervace/:path*", headers: bookingSecurity },
      { source: "/api/rezervace/:path*", headers: [...bookingSecurity, noindex] },
      { source: "/rezervace/admin/:path*", headers: [noindex] },
      { source: "/rezervace/dev/:path*", headers: [noindex] },
      // Management links carry a token in the fragment: never leak a referrer, never index.
      { source: "/rezervace/sprava/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }, noindex] },
    ];
  },
};

export default nextConfig;
