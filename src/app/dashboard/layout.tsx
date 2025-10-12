"use client"

import { Sidebar } from "@/components/dashboard/sidebar"
import { SidebarProvider, useSidebar } from "@/providers/sidebar-provider"
import { Toaster } from "@/components/ui/toaster"
import { cn } from "@/lib/utils"
import { Menu } from "lucide-react"

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed, toggleMobile } = useSidebar()

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated gradient mesh background */}
      <div className="fixed inset-0 gradient-mesh pointer-events-none" aria-hidden="true"></div>
      <div className="fixed inset-0 bg-background/30 backdrop-blur-[1px] pointer-events-none" aria-hidden="true"></div>
      
      {/* Mobile Header with Hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={toggleMobile}
            className="p-2 rounded-lg hover:bg-primary/10 transition-colors text-foreground"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-primary">ANZAC Management</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>
      
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content - Adjusts based on sidebar state */}
      <div className={cn(
        "relative z-10 transition-all duration-300",
        "pt-16 lg:pt-0", // Add padding-top on mobile for fixed header
        isCollapsed ? "lg:pl-20" : "lg:pl-72"
      )}>
        <main className="min-h-screen p-6 lg:p-8">
          <div className="w-full">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
      <Toaster />
    </SidebarProvider>
  )
}

