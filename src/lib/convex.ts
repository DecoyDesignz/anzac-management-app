import { ConvexReactClient } from "convex/react";
import { getEnvVar } from "./env";

// Validate and get the Convex URL from environment variables at module load time
const convexUrl = getEnvVar("NEXT_PUBLIC_CONVEX_URL");

export const convex = new ConvexReactClient(convexUrl);

