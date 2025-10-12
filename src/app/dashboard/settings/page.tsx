"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useAction } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { User, Lock, Shield, AlertTriangle, CheckCircle } from "lucide-react"

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, {
    message: "Current password is required.",
  }),
  newPassword: z.string()
    .min(8, {
      message: "Password must be at least 8 characters.",
    })
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter.",
    })
    .regex(/[a-z]/, {
      message: "Password must contain at least one lowercase letter.",
    })
    .regex(/[0-9]/, {
      message: "Password must contain at least one number.",
    }),
  confirmPassword: z.string().min(1, {
    message: "Please confirm your password.",
  }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

export default function SettingsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const changePassword = useAction(api.userActions.changePassword)
  
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(values: z.infer<typeof passwordFormSchema>) {
    if (!session?.user?.name) {
      setError("Session expired. Please log in again.")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await changePassword({
        username: session.user.name,
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      
      setSuccess("Password changed successfully!")
      form.reset()
      
      // Optionally redirect after a delay
      setTimeout(() => {
        router.push("/dashboard")
      }, 2000)
    } catch (error: unknown) {
      console.error("Password change error:", error)
      setError(error instanceof Error ? error.message : "Failed to change password")
    } finally {
      setIsLoading(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    router.push("/login")
    return null
  }

  return (
    <div className="space-y-8 relative pb-8">
      {/* Floating User Badge */}
      <div className="absolute -top-4 right-4 glass-strong px-4 py-2 rounded-full border border-accent/30 shadow-lg shadow-accent/20 animate-float z-20 animate-fade-in opacity-0 animate-delay-200">
        <div className="flex items-center gap-2">
          <Shield className="w-3 h-3 text-accent" />
          <span className="text-xs text-muted-foreground">Role:</span>
          <span className="text-sm font-bold text-accent capitalize">{session.user.role?.replace(/_/g, ' ')}</span>
        </div>
      </div>

      <div className="space-y-1 relative animate-fade-in-down">
        <h2 className="text-4xl font-bold tracking-tight text-primary">
          Settings
        </h2>
        <p className="text-muted-foreground text-lg">
          Manage your account settings and preferences
        </p>
        {/* Decorative accent bar */}
        <div className="absolute -bottom-2 left-0 w-24 h-0.5 bg-primary rounded-full"></div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information */}
        <Card variant="depth" className="animate-scale-in opacity-0 animate-delay-100">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20 backdrop-blur-sm">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl text-primary">
                  Profile Information
                </CardTitle>
                <CardDescription className="mt-1">
                  Your account details
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="p-4 rounded-lg bg-secondary/20 border border-border/50">
              <p className="text-sm font-medium text-muted-foreground mb-1">Username</p>
              <p className="text-lg font-semibold text-foreground">{session.user.name}</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/20 border border-border/50">
              <p className="text-sm font-medium text-muted-foreground mb-1">Role</p>
              <p className="text-lg font-semibold text-primary capitalize">{session.user.role?.replace(/_/g, ' ')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card variant="depth" className="animate-scale-in opacity-0 animate-delay-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20 backdrop-blur-sm">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl text-primary">
                  Change Password
                </CardTitle>
                <CardDescription className="mt-1">
                  Update your password to keep your account secure
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/90">Current Password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your current password"
                          type="password"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/90">New Password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your new password"
                          type="password"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-muted-foreground/80">
                        Must be at least 8 characters with uppercase, lowercase, and number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/90">Confirm New Password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Confirm your new password"
                          type="password"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {error && (
                  <div className="glass-subtle border-destructive/30 text-destructive text-sm p-4 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{error}</span>
                    </div>
                  </div>
                )}
                {success && (
                  <div className="glass-subtle border-green-500/30 text-green-600 dark:text-green-400 text-sm p-4 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>{success}</span>
                    </div>
                  </div>
                )}
                <Button type="submit" variant="default" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Lock className="w-4 h-4 animate-spin" />
                      Changing Password...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Change Password
                    </span>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

