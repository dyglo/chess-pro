"use client";

import { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  sublabel,
  icon,
  highlight,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border px-6 py-5 shadow-sm transition-all ${
        highlight
          ? "border-transparent bg-[var(--foreground)] text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)]"
          : "border-[var(--line)] bg-white text-[var(--foreground)] hover:shadow-[var(--shadow)]"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${highlight ? "text-white/60" : "text-[var(--muted)]"}`}>
            {label}
          </p>
          <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>
          {sublabel && (
            <div className={`mt-1 text-xs font-semibold ${highlight ? "text-white/60" : "text-[var(--muted)]"}`}>
              {sublabel}
            </div>
          )}
        </div>
        {icon && <div className={`${highlight ? "text-white/60" : "text-[var(--muted)]"}`}>{icon}</div>}
      </div>
      {highlight && (
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      )}
    </div>
  );
}
