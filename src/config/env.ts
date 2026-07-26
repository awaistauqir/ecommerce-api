import dotenv from "dotenv";
import { z } from "zod";

// 1. Load the .env file
dotenv.config();

// 2. Define the schema for your environment variables
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  JWT_SECRET: z
    .string()
    .min(16, "JWT_SECRET must be at least 16 characters long"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, "JWT_REFRESH_SECRET must be at least 16 characters"),
  ACCESS_TOKEN_EXPIRY: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRY: z.string().default("7d"),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
});

// 3. Parse and validate process.env
const parsedEnv = envSchema.safeParse(process.env);

// 4. Fail Fast: If validation fails, log the exact errors and crash the app
if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:");
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

// 5. Export the validated, fully-typed environment object
export const env = parsedEnv.data;
