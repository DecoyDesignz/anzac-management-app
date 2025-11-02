import { handlers } from "@/auth"
import type { NextRequest } from "next/server"

// Export handlers with IP address extraction for rate limiting
export const { GET, POST } = {
  GET: async (req: NextRequest) => {
    return handlers.GET(req)
  },
  POST: async (req: NextRequest) => {
    return handlers.POST(req)
  },
}

