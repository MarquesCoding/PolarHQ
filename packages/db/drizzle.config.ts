import { config } from "@workspace/config"
import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: config.databaseUrl,
  },
  schemaFilter: ["public", "core", "photos"],
  verbose: true,
  strict: true,
})
