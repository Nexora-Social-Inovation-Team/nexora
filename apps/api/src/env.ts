import { z } from "zod";

/**
 * Process env for the API. Parsed once at import so a misconfigured process
 * dies at boot instead of at the first request.
 *
 * The .env file lives at the REPO ROOT, not here: package.json scripts pass
 * `bun --env-file=../../.env`. Bun does not walk up to find it, and neither
 * does the Prisma CLI (it only checks ./ , the --schema dir and ./prisma).
 */
/**
 * Optional secret. `bun --env-file` turns a bare `HF_TOKEN=` line — exactly the
 * shape of .env.example — into an empty string, which `.min(1).optional()`
 * reads as present-and-invalid: the API then refused to boot instead of
 * falling back. Empty means unset (docs/building-blocks/04: the jury demo runs
 * with HF_TOKEN unset).
 */
const optionalEnv = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const envSchema = z.object({
  // Neon pooled URL. Prisma reads it itself via env("DATABASE_URL"); parsed
  // here only so a missing value fails at boot.
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (Neon pooled connection string)"),
  // Neon direct URL. Used by `prisma migrate`, never by the runtime client.
  DIRECT_URL: optionalEnv,
  PORT: z.coerce.number().int().positive().default(3000),
  WEB_ORIGIN: z
    .string()
    .default("http://localhost:5173,http://localhost:8081")
    .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean)),
  SESSION_SECRET: z.string().min(1, "SESSION_SECRET is required to sign sessions"),
  // API-process only. Never shipped to web, mobile or extension.
  HF_TOKEN: optionalEnv,
  HF_MODEL_ID: optionalEnv,
  /**
   * Base URL of the OpenAI-compatible chat API. Default is the HF router; a
   * self-served vLLM (docs/colab/trendyol-coach.ipynb) is the other measured
   * host. Same empty-means-unset preprocess as optionalEnv: a bare
   * `HF_BASE_URL=` line would otherwise reach `.url()` as "" and kill boot.
   */
  HF_BASE_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.url().default("https://router.huggingface.co/v1"),
  ),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Only the names of the offending vars — never their values.
  const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid environment: ${missing}. Copy .env.example to .env at the repo root.`);
}

export const env = parsed.data;
