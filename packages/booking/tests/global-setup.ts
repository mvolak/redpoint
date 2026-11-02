// Real disposable PostgreSQL (spec §15): recreate the test schema and apply migrations.
import postgres from "postgres";
import { migrate } from "../scripts/migrate";

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgres://booking:booking_dev_only@localhost:54340/booking_test";
  if (!/booking_test/.test(url)) throw new Error("Refusing to run tests against a non-test database: " + url);
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  await sql.end();
  await migrate(url, false);
}
