"use client";

import { usePresence } from "@/hooks/use-presence";

export function NotificationShell() {
  usePresence();
  return null;
}
