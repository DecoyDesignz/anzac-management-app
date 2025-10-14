"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProvider } from "convex/react";
import { ReactNode, useMemo } from "react";
import { SessionProvider } from "next-auth/react";
import { MaintenanceCheck } from "@/components/common/maintenance-check";

interface ConvexClientProviderProps {
  children: ReactNode;
}

export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  const convex = useMemo(() => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    
    if (!convexUrl) {
      throw new Error(
        "NEXT_PUBLIC_CONVEX_URL is not set. Run `npx convex dev` to set it up."
      );
    }
    
    return new ConvexReactClient(convexUrl);
  }, []);

  return (
    <SessionProvider>
      <ConvexProvider client={convex}>
        <MaintenanceCheck />
        {children}
      </ConvexProvider>
    </SessionProvider>
  );
}

