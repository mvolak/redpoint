import { createFixtureRepository } from "@redcord/content";
import { site } from "@/config/site";

/** Single repository instance. Swap for a CMS-backed implementation in production. */
export const repo = createFixtureRepository({
  mode: site.env,
  includeIllustrative: site.features.showIllustrativeSessions,
});
