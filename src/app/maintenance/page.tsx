"use client"

import { useQuery } from "convex/react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { api } from "../../../convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wrench, ArrowRight, Shield } from "lucide-react"

export default function MaintenancePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const maintenanceMode = useQuery(api.systemSettings.getMaintenanceMode, {})

  // If maintenance mode is disabled, redirect to dashboard/login
  useEffect(() => {
    if (maintenanceMode && !maintenanceMode.enabled) {
      if (session?.user) {
        router.push("/dashboard")
      } else {
        router.push("/login")
      }
    }
  }, [maintenanceMode, session, router])

  // Show loading while checking maintenance mode
  if (!maintenanceMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const isAdmin = session?.user?.role === "administrator" || session?.user?.role === "super_admin"

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2 animate-fade-in-down">
          <div className="flex justify-center mb-4">
            <div className="p-6 rounded-full bg-amber-500/10 border-2 border-amber-500/30 animate-pulse">
              <Wrench className="w-16 h-16 text-amber-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-primary">
            System Maintenance
          </h1>
          <p className="text-xl text-muted-foreground">
            We'll be back shortly
          </p>
        </div>

        <Card variant="depth" className="animate-scale-in opacity-0 animate-delay-100">
          <CardHeader>
            <CardTitle className="text-center">Scheduled Maintenance</CardTitle>
            <CardDescription className="text-center">
              Our system is currently undergoing maintenance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-center text-foreground">
                {maintenanceMode.message}
              </p>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="text-center">
                We apologize for any inconvenience. Our team is working to complete this maintenance as quickly as possible.
              </p>
              <p className="text-center font-medium">
                Thank you for your patience!
              </p>
            </div>

            {isAdmin && (
              <div className="mt-6 pt-6 border-t">
                <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Shield className="w-5 h-5" />
                    <p className="font-semibold">Administrator Access</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    As an administrator, you can still access the system during maintenance.
                  </p>
                  <Button 
                    className="w-full" 
                    onClick={() => router.push("/dashboard")}
                  >
                    Continue to Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {!session?.user && (
              <div className="mt-6 pt-6 border-t text-center">
                <Button 
                  variant="outline" 
                  onClick={() => router.push("/login")}
                >
                  Administrator Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground animate-fade-in opacity-0 animate-delay-200">
          <p>ANZAC Management System</p>
        </div>
      </div>
    </div>
  )
}

