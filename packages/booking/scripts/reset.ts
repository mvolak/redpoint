// DEVELOPMENT ONLY: drops and recreates the public schema of DATABASE_URL.
import "./load-env";
import postgres from "postgres";

const url = process.env.DATABASE_URL!;
if (!/localhost|127\.0\.0\.1/.test(url) || (process.env.APP_ENV ?? "development") !== "development") {
  console.error("Refusing to reset a non-local or non-development database.");
  process.exit(1);
}
const sql = postgres(url, { max: 1, onnotice: () => {} });
await sql.unsafe("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
await sql.end();
console.log("schema reset");
