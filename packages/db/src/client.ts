import { config } from "@polarhq/config"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema/index"

const queryClient = postgres(config.databaseUrl, { max: 10 })

/** Drizzle database instance, typed against the full suite schema. */
export const db = drizzle(queryClient, { schema })

export const sqlClient = queryClient

export type Database = typeof db
