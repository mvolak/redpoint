// Booking scripts share the web app's environment: apps/redcord-web/.env.local (then .env).
import { config } from "dotenv";
import path from "node:path";

const app = path.resolve(import.meta.dirname, "../../../apps/redcord-web");
config({ path: path.join(app, ".env.local"), quiet: true });
config({ path: path.join(app, ".env"), quiet: true });
