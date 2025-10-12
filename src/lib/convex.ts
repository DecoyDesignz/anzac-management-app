import { ConvexReactClient } from "convex/react";

// Get the Convex URL from environment variables
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error(
    "NEXT_PUBLIC_CONVEX_URL is not set. Run `npx convex dev` to set it up."
  );
}

export const convex = new ConvexReactClient(convexUrl);

