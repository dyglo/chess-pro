"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const HEARTBEAT_MS = 30000;

export function usePresence() {
  const { user } = useAuth();
  const heartbeatRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    const updatePresence = async (isOnline: boolean) => {
      const payload = {
        user_id: user.id,
        is_online: isOnline,
        last_seen_at: new Date().toISOString(),
      };
      await supabase.from("online_presence").upsert(payload);
    };

    updatePresence(true);

    heartbeatRef.current = window.setInterval(() => {
      updatePresence(true);
    }, HEARTBEAT_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        updatePresence(false);
      } else {
        updatePresence(true);
      }
    };

    const handleUnload = () => {
      updatePresence(false);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleUnload);
      updatePresence(false);
    };
  }, [user]);
}
