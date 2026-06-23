"use client";

import type { CSSProperties, ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-pixel text-base leading-snug text-slate-100 [overflow-wrap:anywhere] sm:text-xl">
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`card p-5 ${className}`} style={style}>
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
      {children}
    </h2>
  );
}

/** Loading state shown until localStorage hydrates (avoids SSR mismatch). */
export function HydrationGate({ hydrated, children }: { hydrated: boolean; children: ReactNode }) {
  if (!hydrated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
          <p className="font-pixel text-[10px]">LOADING SAVE…</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

const STAT_COLORS: Record<string, string> = {
  body: "#f87171",
  mind: "#a78bfa",
  wealth: "#34d399",
  social: "#fb923c",
  discipline: "#38bdf8",
};

export function statColor(key: string, fallback = "#38bdf8"): string {
  return STAT_COLORS[key] ?? fallback;
}
