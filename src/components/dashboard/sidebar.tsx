"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/providers/sidebar-provider"
import { useTheme } from "@/providers/theme-provider"
import { useToast } from "@/hooks/use-toast"
import { LayoutDashboard, Users, Settings2, ChevronLeft, ChevronRight, MoreVertical, LogOut, ChevronDown, HelpCircle, Calendar, GraduationCap, Award, Shield, Sun, Moon } from "lucide-react"

const navigation = [
  { 
    name: "DASHBOARD", 
    href: "/dashboard",
    icon: LayoutDashboard,
    badge: null,
    hasDropdown: false,
    adminOnly: false
  },
  { 
    name: "PERSONNEL", 
    href: "/dashboard/personnel",
    icon: Users,
    badge: null,
    hasDropdown: false,
    adminOnly: false
  },
  { 
    name: "SCHOOLS", 
    href: "/dashboard/schools",
    icon: GraduationCap,
    badge: null,
    hasDropdown: false,
    adminOnly: false
  },
  { 
    name: "QUALIFICATIONS", 
    href: "/dashboard/qualifications",
    icon: Award,
    badge: null,
    hasDropdown: false,
    adminOnly: false
  },
  { 
    name: "CALENDAR", 
    href: "/dashboard/calendar",
    icon: Calendar,
    badge: null,
    hasDropdown: false,
    adminOnly: false
  },
  { 
    name: "SYSTEM", 
    href: "/dashboard/system",
    icon: Shield,
    badge: null,
    hasDropdown: false,
    adminOnly: true
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar()
  const { theme, setTheme, mounted } = useTheme()
  const { toast } = useToast()

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push("/login")
    router.refresh()
  }

  const handleGetHelp = () => {
    toast({
      title: "Need Help?",
      description: "Please DM the developer or ask for help in Discord for assistance.",
      variant: "info",
      duration: 3000,
    })
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40" 
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 z-50 h-screen glass-strong border-r border-border/50 transition-all duration-300 flex flex-col",
          isCollapsed ? "w-20" : "w-72",
          // Mobile: slide in/out from left
          "lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="p-6 border-b border-border/30">
          <div className="flex items-center justify-between mb-6">
            {!isCollapsed && (
              <div className="flex-1">
                <h1 className="text-lg font-bold text-primary">
                  ANZAC Management
                </h1>
                <p className="text-xs text-muted-foreground">2nd Commando Regiment</p>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-lg hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {navigation
              .filter((item) => {
                // Show admin-only items only to administrators and super_admins
                if (item.adminOnly) {
                  const userRole = session?.user?.role
                  return userRole === "administrator" || userRole === "super_admin"
                }
                return true
              })
              .map((item) => {
                const isActive = pathname === item.href
                return (
                  <div key={item.name} className="group">
                    <Link
                      href={item.href}
                      className={cn(
                        "relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 group/item overflow-hidden",
                        isActive 
                          ? "bg-primary/10 border border-primary/30" 
                          : "hover:bg-primary/5 border border-transparent hover:border-primary/20",
                        isCollapsed && "justify-center px-2"
                      )}
                    >
                      {/* Icon */}
                      <item.icon className={cn(
                        "transition-all duration-300",
                        isCollapsed ? "w-5 h-5" : "w-4 h-4",
                        isActive ? "text-primary" : "text-muted-foreground group-hover/item:text-primary"
                      )} />

                      {/* Label */}
                      {!isCollapsed && (
                        <div className="flex-1 flex items-center justify-between">
                          <span className={cn(
                            "text-sm font-medium transition-colors duration-300",
                            isActive ? "text-primary" : "text-foreground group-hover/item:text-primary"
                          )}>
                            {item.name}
                          </span>
                          {item.hasDropdown && (
                            <ChevronDown className="w-3 h-3 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" />
                          )}
                        </div>
                      )}
                    </Link>
                  </div>
                )
              })}
          </div>

          {/* Quick Actions Section */}
          {!isCollapsed && (
            <div className="mt-6">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Quick Actions
              </h3>
              <div className="space-y-1">
                <Link
                  href="/dashboard/calendar"
                  className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-lg transition-all duration-300"
                >
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Book Training
                </Link>
              </div>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border/30 space-y-3">
          {/* Theme Toggle - Only render after mounting to avoid hydration mismatch */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/5 transition-all duration-300",
                isCollapsed && "justify-center"
              )}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
              ) : (
                <Moon className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
              )}
              {!isCollapsed && (
                <span className="text-sm font-medium text-muted-foreground">
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </span>
              )}
            </button>
          )}

          {/* User Profile */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/5 transition-all duration-300",
                isCollapsed && "justify-center"
              )}>
                <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 border border-primary/30">
                  <span className="text-xs font-bold text-primary">
                    {session?.user?.name?.charAt(0).toUpperCase() || 'CN'}
                  </span>
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-medium text-foreground truncate">
                      {session?.user?.name || 'username'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      System User
                    </p>
                  </div>
                )}
                {!isCollapsed && (
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-48 p-1" 
              side="top"
              align="start"
              sideOffset={8}
            >
              <div className="space-y-0.5">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <Link href="/dashboard/settings">
                    <Settings2 className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm text-muted-foreground hover:text-military-blue"
                  onClick={handleGetHelp}
                >
                  <HelpCircle className="w-4 h-4 mr-2 text-military-cyan" />
                  Get Help
                </Button>
                <div className="border-t border-border/30 my-1" />
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm text-muted-foreground hover:text-foreground"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </aside>
    </>
  )
}

