"use client"

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { user, session, loading, isRemembered } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Kullanıcı giriş yapmış ve remember me aktif
      if (user && session && isRemembered) {
        router.push("/dashboard");
      } else {
        // Kullanıcı giriş yapmamış VEYA remember me yok
        router.push("/login");
      }
    }
  }, [user, session, loading, isRemembered, router]);

  // Loading state
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-lg">Loading...</span>
      </div>
    </div>
  );
}
