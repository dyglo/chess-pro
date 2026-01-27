"use client";

import { usePresence } from "@/hooks/use-presence";
import { MatchNotifications } from "@/components/notifications/match-notifications";

export function NotificationShell() {
  usePresence();
  return <MatchNotifications />;
}
