import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  if (site.reviewMode) {
    // Preview / review builds must never be indexed.
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/hledat/", "/rezervace/sprava/", "/rezervace/admin/", "/rezervace/dev/", "/api/"] }],
    sitemap: new URL("/sitemap.xml", site.origin).toString(),
  };
}
