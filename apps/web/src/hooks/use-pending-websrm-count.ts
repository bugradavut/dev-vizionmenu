"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";

/**
 * Hook to fetch pending WEB-SRM transaction count
 * Polls every 30 seconds to keep count updated
 * SW-78 FO-105 requirement
 */
export function usePendingWebSrmCount() {
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const { session } = useAuth();

  const fetchCount = async () => {
    if (!session?.user?.id) {
      setCount(0);
      setIsLoading(false);
      return;
    }

    try {
      const { count: pendingCount, error } = await supabase
        .from("websrm_transaction_queue")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      if (error) {
        console.error("[usePendingWebSrmCount] Error fetching count:", error);
        setCount(0);
      } else {
        setCount(pendingCount || 0);
      }
    } catch (error) {
      console.error("[usePendingWebSrmCount] Exception:", error);
      setCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchCount();
  }, [session?.user?.id]);

  // Poll every 30 seconds
  useEffect(() => {
    if (!session?.user?.id) return;

    const interval = setInterval(() => {
      fetchCount();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [session?.user?.id]);

  return {
    count,
    isLoading,
    refetch: fetchCount,
  };
}
