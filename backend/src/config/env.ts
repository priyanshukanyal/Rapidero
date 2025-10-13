import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.string().default("4000"),
  NODE_ENV: z.string().default("development"),
  DB_HOST: z.string(),
  DB_PORT: z.string().default("3306"),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  JWT_SECRET: z.string().min(16),
});

export const env = schema.parse(process.env);
