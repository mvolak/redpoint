import type { MetadataRoute } from "next";
import { APP_ROUTES } from "@/config/redirects";
import { site } from "@/config/site";
import { repo } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  // Search results and policy placeholders are excluded.
  const exclude = new Set(["/hledat/", "/ochrana-osobnich-udaju/", "/cookies/"]);
  const paths = [
    ...APP_ROUTES.filter((p) => !exclude.has(p)),
    ...repo.listProducts().map((p) => `/vybaveni/${p.slug}/`),
    ...repo.listCourses().map((c) => `/vzdelavani/kurzy/${c.slug}/`),
    ...repo
      .listSafetyTopics()
      .filter((t) => t.slug !== "technicke-kontroly")
      .map((t) => `/bezpecnost/${t.slug}/`),
  ];
  return paths.map((p) => ({ url: new URL(p, site.origin).toString() }));
}
