"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";

type ProfileLite = {
  id: string;
  avatar_url?: string | null;
  full_name?: string | null;
  username?: string | null;
};

export function AuthHeaderActions({ variant = "light" }: { variant?: "light" | "dark" }) {
  const { user, signOut, isLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileLite | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      return;
    }
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, avatar_url, full_name, username")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setProfile(data ?? null);
      });
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (isLoading) {
    return <div className="h-10 w-24 animate-pulse rounded-full bg-white/20" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className={
          variant === "dark"
            ? "rounded-full border border-white/20 bg-white/10 px-6 py-2 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/40"
            : "rounded-full border border-[var(--line)] bg-white px-4 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:-translate-y-0.5"
        }
      >
        Sign In
      </Link>
    );
  }

  const avatar = profile?.avatar_url || "/avatars/user-placeholder.jpg";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`h-10 w-10 overflow-hidden rounded-full border transition-all ${
          variant === "dark"
            ? "border-white/30 hover:border-white"
            : "border-[var(--line)] hover:border-[var(--accent)]"
        }`}
        aria-label="Open profile menu"
      >
        <Image src={avatar} alt="User avatar" width={40} height={40} className="h-full w-full object-cover" />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-56 rounded-2xl border shadow-xl ${
            variant === "dark"
              ? "border-white/10 bg-[#151515] text-white"
              : "border-[var(--line)] bg-white text-[var(--foreground)]"
          }`}
        >
          <div className="px-4 py-3 border-b border-white/10">
            <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${variant === "dark" ? "text-white/50" : "text-[var(--muted)]"}`}>
              Account
            </p>
            <p className="text-sm font-semibold truncate">{user.email}</p>
          </div>
          <Link
            href="/analytics"
            onClick={() => setIsOpen(false)}
            className={`block px-4 py-3 text-sm font-semibold transition ${
              variant === "dark" ? "hover:bg-white/10" : "hover:bg-[var(--surface-2)]"
            }`}
          >
            Analytics
          </Link>
          <Link
            href="/friends"
            onClick={() => setIsOpen(false)}
            className={`block px-4 py-3 text-sm font-semibold transition ${
              variant === "dark" ? "hover:bg-white/10" : "hover:bg-[var(--surface-2)]"
            }`}
          >
            Friends
          </Link>
          <button
            onClick={() => {
              setIsOpen(false);
              signOut();
            }}
            className={`w-full text-left px-4 py-3 text-sm font-semibold transition ${
              variant === "dark" ? "hover:bg-white/10" : "hover:bg-[var(--surface-2)]"
            }`}
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}
