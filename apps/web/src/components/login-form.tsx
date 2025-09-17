"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/auth-context";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const { signIn, signOut, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError("");
    setIsSubmitting(true);

    try {
      const { data: authData, error } = await signIn(data.email, data.password, data.rememberMe);
      
      if (error) {
        setError(error.message);
      } else if (authData?.user) {
        // Check if user is active by calling our API
        try {
          const token = authData.session?.access_token;
          
          if (!token) {
            setError("Authentication failed. Please try again.");
            return;
          }

          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.status === 403) {
            // User is inactive
            await signOut();
            setError("Your account has been deactivated. Please contact an administrator.");
            return;
          }

          if (response.status === 404) {
            // Profile not found - probably inactive
            await signOut();
            setError("Your account has been deactivated. Please contact an administrator.");
            return;
          }
          // User is active, proceed with success
          setShowSuccessAlert(true);
          
          // Redirect after a short delay to show the alert
          setTimeout(() => {
            router.push("/dashboard");
          }, 1500);
        } catch (checkError) {
          console.error('Error checking user status:', checkError);
          // On error, still allow login (network issues, etc.)
          setShowSuccessAlert(true);
          setTimeout(() => {
            router.push("/dashboard");
          }, 1500);
        }
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-hide success alert after 5 seconds
  useEffect(() => {
    if (showSuccessAlert) {
      const timer = setTimeout(() => {
        setShowSuccessAlert(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessAlert]);

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {/* Success Alert - Fixed position top right */}
      {showSuccessAlert && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <Alert className="border-primary/20 bg-primary text-white">
            <CheckCircle className="h-4 w-4" style={{ color: 'white' }} />
            <AlertTitle>Success!</AlertTitle>
            <AlertDescription>
              Login successful. Redirecting to dashboard...
            </AlertDescription>
            <button
              onClick={() => setShowSuccessAlert(false)}
              className="absolute top-2 right-2 opacity-80 hover:opacity-100"
            >
              <X className="h-4 w-4" style={{ color: 'white' }} />
            </button>
          </Alert>
        </div>
      )}

      <Card className="overflow-hidden p-0 w-full max-w-[611px] sm:min-w-[611px] mx-auto">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="p-6 md:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center gap-3">
                  <Image
                    src="https://cdn.prod.website-files.com/67b6f7ecc0b5b185628fc902/67b6fa305fe70f88ef38db30_logo.svg"
                    alt="VizionMenu Logo"
                    width={120}
                    height={40}
                    className="h-10 w-auto"
                  />
                  <p className="text-muted-foreground whitespace-nowrap">
                    Login to your VizionMenu account
                  </p>
                </div>

                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md break-words">
                    {error}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="your@email.com"
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
                      <div className="flex items-center">
                        <FormLabel>Password</FormLabel>
                        <a href="#" className="ml-auto text-sm underline-offset-2 hover:underline">
                          Forgot your password?
                        </a>
                      </div>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Remember Me
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full hover:opacity-90" 
                  disabled={isSubmitting || loading || showSuccessAlert}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : showSuccessAlert ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Success! Redirecting...
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
              </form>
            </Form>
          </div>
          <div className="relative hidden md:block">
            <Image
              src="/login-img.webp"
              alt="VizionMenu Login"
              width={400}
              height={600}
              className="object-cover h-full w-full opacity-70"
            />
          </div>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        By clicking continue, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
} 