import "dotenv/config";
import { z } from "zod";

/**
 * Centralized environment schema.
 * - Coerces numbers (PORT, DB_PORT, SMTP_PORT)
 * - Provides sensible defaults (API_PREFIX, PORT)
 * - Requires SMTP vars so invite emails work
 */
const schema = z.object({
  // Server
  NODE_ENV: z.string().default("development"),
  HOST: z.string().optional(), // e.g. "0.0.0.0"
  PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().default("/api/v1"),
  CORS_ORIGIN: z.string().optional(), // comma-separated list if multiple

  // Database
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),

  // Azure Blob
  AZURE_STORAGE_CONNECTION_STRING: z.string().optional(),
  AZURE_BLOB_CONTAINER: z.string().optional(),

  // Auth
  JWT_SECRET: z.string().min(16),

  // Frontend / portal URL (used in emails)
  APP_ORIGIN: z.string().url().default("http://localhost:5173"),

  // SMTP (mailer) – required so admin can invite users / auto-email clients
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number().default(587),
  // Accept "true"/"false"/"1"/"0" and convert to boolean
  SMTP_SECURE: z
    .preprocess((v) => v ?? "false", z.string())
    .transform((v) => v === "true" || v === "1"),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  SMTP_FROM: z.string(), // e.g. `"Rapidero Logistics" <no-reply@rapidero.com>`
  SMTP_ALLOW_SELF_SIGNED: z
    .preprocess((v) => v ?? "false", z.string())
    .transform((v) => v === "true" || v === "1")
    .default(false),
  // Rivigo API
  RIVIGO_BASE_URL: z.string().url(),
  RIVIGO_APP_UUID: z.string().uuid(),
  RIVIGO_AUTH_BASIC: z.string(),
  RIVIGO_CLIENT_CODE: z.string(),
});

export const env = schema.parse(process.env);
// (optional) export type Env = z.infer<typeof schema>;
