"use client"

import { useState, Suspense, useEffect } from "react"
import { signIn, useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
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
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Shield, Lock, AlertTriangle, Info, Loader2 } from "lucide-react"

const formSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
})

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
  
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Initialize form hook early to avoid conditional hook usage
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  })

  // Redirect to dashboard if already logged in (client-side check)
  useEffect(() => {
    if (status === "loading") return // Wait for session to load
    
    if (session?.user) {
      // User is already logged in, redirect to dashboard
      router.push(callbackUrl)
      router.refresh()
    }
  }, [session, status, router, callbackUrl])

  // Show loading state while checking session
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Checking session...</p>
        </div>
      </div>
    )
  }

  // Don't show login form if already logged in (redirect is in progress)
  if (session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    )
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setError(null)

    try {
      const result = await signIn("credentials", {
        username: values.username,
        password: values.password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
      } else if (result?.ok) {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (error: unknown) {
      console.error("Login error:", error)
      setError(error instanceof Error ? error.message : "An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Subtle gradient mesh background */}
      <div className="fixed inset-0 gradient-mesh pointer-events-none" aria-hidden="true"></div>
      
      {/* Login Card */}
      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <Card variant="depth" className="backdrop-blur-xl border-primary/20 shadow-2xl shadow-primary/20">
          <CardHeader className="space-y-3 text-center pb-6">
            {/* Logo/Icon */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/20 backdrop-blur-sm flex items-center justify-center border border-primary/30 shadow-lg shadow-primary/20">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold text-primary">
                ANZAC 2nd Commandos
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground/80">
                Management System Login
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/90">Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="your.username"
                          type="text"
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/90">Password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="••••••••"
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
                
                <Button 
                  type="submit" 
                  variant="default" 
                  size="lg" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>
            </Form>
            
            <div className="pt-4 border-t border-border/30">
              <div className="text-center text-sm space-y-2">
                <div className="glass-subtle p-3 rounded-lg border border-border/30">
                  <p className="text-muted-foreground mb-1.5 flex items-center justify-center gap-2">
                    <Info className="w-4 h-4" />
                    <span>Accounts are created by administrators</span>
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Contact your administrator for access
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
