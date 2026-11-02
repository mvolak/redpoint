import { getActivePolicy, getSettings, listPublicServices, listPublicTherapists } from "@redcord/booking/domain/catalogue";
import { location } from "@redcord/booking/db/schema";
import { json, route } from "@redcord/booking/lib/http";

/** GET /api/catalogue — public active catalogue, booking mode and current terms. */
export const GET = route(async (_req, db) => {
  const [services, therapists, settings, policy, locations] = await Promise.all([
    listPublicServices(db), listPublicTherapists(db), getSettings(db), getActivePolicy(db), db.select().from(location),
  ]);
  const loc = locations[0];
  return json({
    services,
    therapists,
    mode: settings.publicMode,
    pausedMessage: settings.publicMode === "paused" ? settings.pausedMessage : null,
    reception: { phone: settings.receptionPhone, email: settings.receptionEmail },
    terms: { version: policy.version, cancellationCutoffHours: policy.cancellationCutoffHours, text: policy.termsText },
    location: loc ? { name: loc.name, address: loc.address, timezone: loc.timezone } : null,
  }, { headers: { "Cache-Control": "public, max-age=30, must-revalidate" } });
});
