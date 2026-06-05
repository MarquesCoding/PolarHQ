import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { config } from "@workspace/config"
import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"

const here = dirname(fileURLToPath(import.meta.url))
const migrationsFolder = join(here, "..", "drizzle")

const run = async () => {
  const sql = postgres(config.databaseUrl, { max: 1 })
  const migrationDb = drizzle(sql)

  await sql`CREATE EXTENSION IF NOT EXISTS vector`
  await migrate(migrationDb, { migrationsFolder })
  await sql.end()

  console.log("✓ Migrations applied")
}

run().catch((error) => {
  console.error("✗ Migration failed", error)
  process.exit(1)
})
