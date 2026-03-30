/**
 * Environment Variables Validation
 * Centralizes all env var checks with Zod schema validation
 * Fail-fast at module load time with clear error messages
 */

import { z } from "zod";

// Define the environment schema with Zod
const envSchema = z.object({
  // Supabase (required)
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL")
    .describe("Supabase project URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required")
    .describe("Supabase anonymous key for browser client"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required for admin operations")
    .describe("Supabase service role key (server-only, bypasses RLS)"),

  // Upstash Redis (optional - used for rate limiting in production)
  UPSTASH_REDIS_REST_URL: z
    .string()
    .url("UPSTASH_REDIS_REST_URL must be a valid URL")
    .optional()
    .describe("Upstash Redis REST API URL (optional, for production rate limiting)"),
  UPSTASH_REDIS_REST_TOKEN: z
    .string()
    .optional()
    .describe("Upstash Redis REST API token (required if URL is set)"),

  // Admin Configuration (optional)
  ADMIN_EMAILS: z
    .string()
    .optional()
    .default("")
    .describe("Comma-separated list of admin emails"),
  ADMIN_USER_IDS: z
    .string()
    .optional()
    .default("")
    .describe("Comma-separated list of admin user IDs"),

  // Node environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development")
    .describe("Node environment"),
});

type Environment = z.infer<typeof envSchema>;

let validatedEnv: Environment | null = null;

/**
 * Validate environment variables at module load time
 * Throws descriptive error if validation fails
 */
function validateEnvironment(): Environment {
  if (validatedEnv) return validatedEnv;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map(
        (issue) =>
          `  • ${issue.path.join(".")} - ${issue.message}${
            issue.description ? ` (${issue.description})` : ""
          }`
      )
      .join("\n");

    const errorMessage = `
╭─ Environment Validation Failed ─────────────────────────────────────╮
│                                                                      │
│ One or more environment variables are missing or invalid.           │
│ Please check your .env.local file:                                  │
│                                                                      │
${errors
  .split("\n")
  .map((line) => `│ ${line.padEnd(62)} │`)
  .join("\n")}
│                                                                      │
│ Example .env.local:                                                │
│   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co                │
│   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...                        │
│   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...                             │
│                                                                      │
╰──────────────────────────────────────────────────────────────────────╯
    `;

    throw new Error(errorMessage);
  }

  validatedEnv = result.data;
  return validatedEnv;
}

/**
 * Get validated environment variables
 * Safe to call multiple times (cached after first validation)
 */
export function getEnv(): Environment {
  return validateEnvironment();
}

// Validate on module load (fails fast at startup)
validateEnvironment();

/**
 * Type-safe environment access helpers
 */
export const env = {
  // Supabase
  get supabase() {
    const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } =
      validateEnvironment();
    return {
      url: NEXT_PUBLIC_SUPABASE_URL,
      anonKey: NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
    };
  },

  // Upstash Redis
  get redis() {
    const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = validateEnvironment();
    return {
      url: UPSTASH_REDIS_REST_URL || null,
      token: UPSTASH_REDIS_REST_TOKEN || null,
      isConfigured: !!(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN),
    };
  },

  // Admin configuration
  get admin() {
    const { ADMIN_EMAILS, ADMIN_USER_IDS } = validateEnvironment();
    return {
      emails: ADMIN_EMAILS.split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
      userIds: ADMIN_USER_IDS.split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    };
  },

  // Environment
  get isProduction() {
    return validateEnvironment().NODE_ENV === "production";
  },

  get isDevelopment() {
    return validateEnvironment().NODE_ENV === "development";
  },

  get nodeEnv() {
    return validateEnvironment().NODE_ENV;
  },
};

export type { Environment };
