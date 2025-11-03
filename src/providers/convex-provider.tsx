"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProvider } from "convex/react";
import { ReactNode, useMemo } from "react";
import { SessionProvider } from "next-auth/react";
import { MaintenanceCheck } from "@/components/common/maintenance-check";
import { ConvexErrorHandler } from "@/components/common/convex-error-handler";

interface ConvexClientProviderProps {
  children: ReactNode;
}

/**
 * Environment setup error component
 */
function EnvSetupError({ error }: { error: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-2xl w-full glass-strong border border-destructive/30 rounded-lg p-6 space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-destructive">Configuration Required</h1>
          <p className="text-muted-foreground whitespace-pre-line font-mono text-sm">
            {error}
          </p>
        </div>
        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            After setting up the environment variables, refresh this page.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  const { convex, error } = useMemo(() => {
    // Get environment variable - handle gracefully on client side
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    
    if (!convexUrl || convexUrl.trim() === "") {
      const errorMessage = 
        "❌ Required environment variable NEXT_PUBLIC_CONVEX_URL is not set.\n\n" +
        "NEXT_PUBLIC_CONVEX_URL is not set. This is required for Convex database connection.\n\n" +
        "To fix this:\n" +
        "  1. Run 'npx convex dev' in a separate terminal (this will set up Convex and the URL)\n" +
        "  2. Or manually add NEXT_PUBLIC_CONVEX_URL to your .env.local file\n" +
        "  3. Restart your Next.js dev server after setting the environment variable";
      
      return { convex: null, error: errorMessage };
    }
    
    try {
      return { 
        convex: new ConvexReactClient(convexUrl),
        error: null 
      };
    } catch (err) {
      return { 
        convex: null, 
        error: `Failed to initialize Convex client: ${err instanceof Error ? err.message : String(err)}` 
      };
    }
  }, []);
  
  // Show error UI if environment is not configured
  if (error || !convex) {
    return <EnvSetupError error={error || "Unknown configuration error"} />;
  }

  return (
    <SessionProvider>
      <ConvexProvider client={convex}>
        <ConvexErrorHandler />
        <MaintenanceCheck />
        {children}
      </ConvexProvider>
    </SessionProvider>
  );
}

