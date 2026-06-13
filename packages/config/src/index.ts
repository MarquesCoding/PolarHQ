import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { config as loadDotenv } from "dotenv"
import { z } from "zod"

const findEnvFile = (start: string): string | undefined => {
  let dir = start
  for (let depth = 0; depth < 8; depth++) {
    const candidate = join(dir, ".env")
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return undefined
}

const envFile = findEnvFile(process.cwd())
if (envFile) loadDotenv({ path: envFile, override: false })

const boolish = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((value) => (value === undefined ? fallback : value === "true" || value === "1"))

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_NAME: z.string().min(1).default("PolarHQ"),
    API_PORT: z.coerce.number().int().positive().default(3001),
    API_URL: z.string().min(1).default("http://localhost:3001"),
    WEB_URL: z.string().min(1).default("http://localhost:3000"),
    AUTH_SECRET: z.string().min(16),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
    STORAGE_DRIVER: z.enum(["s3", "fs"]).default("fs"),
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().default("us-east-1"),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_BUCKET: z.string().default("vault-media"),
    S3_FORCE_PATH_STYLE: boolish(true),
    STORAGE_FS_ROOT: z.string().default("./.data/storage"),
    APP_VERSION: z.string().default("0.0.0"),
    APP_BUILD: z.string().default("dev"),
    GITHUB_REPO: z.string().default("MarquesCoding/PolarHQ"),
    UPDATE_CHECK: boolish(true),
    RUN_WORKERS: boolish(true),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.STORAGE_DRIVER === "s3") {
      if (!env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
        ctx.addIssue({
          code: "custom",
          message: "S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required when STORAGE_DRIVER=s3",
        })
      }
    }
  })

const parsed = EnvSchema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n")
  throw new Error(`Invalid environment configuration:\n${issues}`)
}

const env = parsed.data

/**
 * Validated, typed application configuration. Import this instead of reading
 * `process.env` directly anywhere in the codebase.
 */
export const config = {
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",
  appName: env.APP_NAME,
  version: env.APP_VERSION,
  build: env.APP_BUILD,
  githubRepo: env.GITHUB_REPO,
  updateCheck: env.UPDATE_CHECK,
  runWorkers: env.RUN_WORKERS,
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  },
  api: {
    port: env.API_PORT,
    url: env.API_URL,
  },
  web: {
    url: env.WEB_URL.split(",")[0]!.trim(),
    origins: Array.from(
      new Set([env.API_URL, ...env.WEB_URL.split(",")].map((o) => o.trim()).filter(Boolean)),
    ),
  },
  auth: {
    secret: env.AUTH_SECRET,
  },
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
  storage: {
    driver: env.STORAGE_DRIVER,
    s3: {
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      bucket: env.S3_BUCKET,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    },
    fsRoot: resolve(env.STORAGE_FS_ROOT),
  },
} as const

export type Config = typeof config

export { encryptSecret, decryptSecret } from "./secrets"
