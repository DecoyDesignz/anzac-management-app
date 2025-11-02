/**
 * Environment variable validation utility
 * Ensures all required environment variables are set at startup
 * Throws clear errors if any are missing
 */

type RequiredEnvVars = {
  NEXT_PUBLIC_CONVEX_URL: string;
  NEXTAUTH_SECRET: string;
};

type OptionalEnvVars = {
  NODE_ENV?: string;
};

/**
 * Check if we're running on the server side
 */
function isServer(): boolean {
  return typeof window === "undefined";
}

/**
 * Validate required server-side environment variables
 * This function throws immediately if any required env vars are missing
 * Call this at the top of entry points (server-side modules)
 */
export function validateServerEnv(): RequiredEnvVars {
  const errors: string[] = [];

  // Validate NEXT_PUBLIC_CONVEX_URL (available on both client and server)
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl || convexUrl.trim() === "") {
    errors.push(
      "NEXT_PUBLIC_CONVEX_URL is not set. This is required for Convex database connection."
    );
  }

  // Validate NEXTAUTH_SECRET (server-side only)
  // Only validate on server side - this env var is not exposed to client
  if (isServer()) {
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;
    if (!nextAuthSecret || nextAuthSecret.trim() === "") {
      errors.push(
        "NEXTAUTH_SECRET is not set. This is required for NextAuth session encryption.\n" +
        "  Without it, users will be logged out on every server restart.\n" +
        "  Generate one with: openssl rand -base64 32"
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      "❌ Missing required environment variables:\n\n" +
      errors.map((e) => `  • ${e}`).join("\n") +
      "\n\nPlease set these in your .env.local file or deployment environment."
    );
  }

  return {
    NEXT_PUBLIC_CONVEX_URL: convexUrl!,
    NEXTAUTH_SECRET: isServer() ? process.env.NEXTAUTH_SECRET! : "",
  };
}

/**
 * Get validated environment variables
 * Use this instead of directly accessing process.env for required variables
 * Note: NEXTAUTH_SECRET is only available on the server
 */
type GlobalWithEnv = typeof globalThis & {
  __validatedEnv?: RequiredEnvVars & OptionalEnvVars;
};

export function getEnv(): RequiredEnvVars & OptionalEnvVars {
  // In development, validate on each access (for helpful errors)
  // In production, validate once and cache
  if (process.env.NODE_ENV === "production" && isServer()) {
    // Cache validated env vars in production (server-side only)
    const globalEnv = globalThis as GlobalWithEnv;
    if (!globalEnv.__validatedEnv) {
      globalEnv.__validatedEnv = validateServerEnv();
    }
    return globalEnv.__validatedEnv;
  }

  return validateServerEnv();
}

/**
 * Get a specific environment variable with validation
 * Throws if the variable is required but not set
 * 
 * @param key - Environment variable name
 * @param defaultValue - Optional default value if env var is not set
 * @param serverOnly - If true, only validates on server side (default: false)
 */
export function getEnvVar(
  key: keyof RequiredEnvVars,
  defaultValue?: string,
  serverOnly: boolean = false
): string {
  // If serverOnly is true and we're on client, skip validation for that key
  if (serverOnly && !isServer()) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(
      `Environment variable ${key} is only available on the server side`
    );
  }

  const value = process.env[key];
  
  if (!value || value.trim() === "") {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    
    // Provide helpful error messages based on the variable
    const errorMessages: Record<keyof RequiredEnvVars, string> = {
      NEXT_PUBLIC_CONVEX_URL: 
        "NEXT_PUBLIC_CONVEX_URL is not set. This is required for Convex database connection.\n\n" +
        "To fix this:\n" +
        "  1. Run 'npx convex dev' in a separate terminal (this will set up Convex and the URL)\n" +
        "  2. Or manually add NEXT_PUBLIC_CONVEX_URL to your .env.local file\n" +
        "  3. Restart your Next.js dev server after setting the environment variable",
      NEXTAUTH_SECRET:
        "NEXTAUTH_SECRET is not set. This is required for NextAuth session encryption.\n" +
        "  Without it, users will be logged out on every server restart.\n\n" +
        "To fix this:\n" +
        "  1. Generate a secret: openssl rand -base64 32\n" +
        "  2. Add NEXTAUTH_SECRET=<generated-secret> to your .env.local file\n" +
        "  3. Restart your Next.js dev server",
    };
    
    throw new Error(
      `❌ Required environment variable ${key} is not set.\n\n${errorMessages[key] || ""}`
    );
  }
  
  return value;
}

