import Link from "next/link";

type PageShellProps = {
  title: string;
  description: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  children?: React.ReactNode;
};

export function AppPageShell({
  title,
  description,
  primaryAction,
  secondaryAction,
  children,
}: PageShellProps) {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-[var(--line)] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {secondaryAction && (
              <Link
                href={secondaryAction.href}
                className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-xs font-semibold text-[var(--accent-3)]"
              >
                {secondaryAction.label}
              </Link>
            )}
            {primaryAction && (
              <Link
                href={primaryAction.href}
                className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white"
              >
                {primaryAction.label}
              </Link>
            )}
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}
