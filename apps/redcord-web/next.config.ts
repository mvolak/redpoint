import type { NextConfig } from "next";
import { redirectRules } from "./src/config/redirects";

const isPreview = (process.env.SITE_ENV ?? "preview") !== "production";

const nextConfig: NextConfig = {
  transpilePackages: ["@redcord/ui", "@redcord/content", "@redcord/integrations"],
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
    if (isPreview) headers.push({ key: "X-Robots-Tag", value: "noindex, nofollow" });
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
