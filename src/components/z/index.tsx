/**
 * Zelar Design System — primitives layer (Phase 1: dense + premium).
 * Focused on Linear/Stripe/Notion density: short panels, compact KPIs,
 * timeline, quick-cards. Wraps shadcn/Radix with the Zelar visual language.
 */
import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/* ────────────────────────────────────────────────────────────
 * Layout
 * ──────────────────────────────────────────────────────────── */

export function ZPage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1600px] space-y-5", className)}>
      {children}
    </div>
  );
}

export function ZPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {eyebrow}
          </p>
        )}
        <h1 className="truncate text-[22px] font-bold leading-tight tracking-tight text-slate-900">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 truncate text-xs text-slate-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

export function ZSection({
  title,
  hint,
  action,
  children,
  className,
}: {
  title?: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2.5", className)}>
      {(title || hint || action) && (
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-baseline gap-2">
            {title && (
              <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {title}
              </h2>
            )}
            {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function ZGrid({
  children,
  cols = 4,
  className,
}: {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}) {
  const map = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 xl:grid-cols-4",
    5: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
    6: "sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6",
  } as const;
  return <div className={cn("grid gap-3", map[cols], className)}>{children}</div>;
}

/* ────────────────────────────────────────────────────────────
 * Surfaces
 * ──────────────────────────────────────────────────────────── */

export function ZCard({
  children,
  className,
  interactive,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-xl border border-slate-200/80 bg-white",
        interactive && "transition-all hover:-translate-y-0.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ZPanel({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
  padding = true,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  padding?: boolean;
}) {
  return (
    <ZCard className={cn("flex flex-col", className)}>
      {(title || action) && (
        <div className="flex h-10 items-center justify-between gap-3 border-b border-slate-100 px-4">
          <div className="flex min-w-0 items-center gap-2">
            {Icon && (
              <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            )}
            <div className="min-w-0">
              {title && (
                <p className="truncate text-[12.5px] font-semibold text-slate-800">
                  {title}
                </p>
              )}
              {subtitle && (
                <p className="truncate text-[10.5px] text-slate-500">{subtitle}</p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn(padding && "p-3.5", bodyClassName)}>{children}</div>
    </ZCard>
  );
}

/* ────────────────────────────────────────────────────────────
 * KPIs — compact (≤100px high, ≤220px wide)
 * ──────────────────────────────────────────────────────────── */

const TONES = {
  navy: { icon: "bg-[var(--navy-light)] text-[var(--navy)]", stroke: "var(--navy)" },
  emerald: { icon: "bg-emerald-50 text-emerald-600", stroke: "#059669" },
  rose: { icon: "bg-rose-50 text-rose-600", stroke: "#e11d48" },
  gold: { icon: "bg-[var(--gold-light)] text-[var(--gold-dark)]", stroke: "#C49A2A" },
  slate: { icon: "bg-slate-100 text-slate-600", stroke: "#64748B" },
} as const;

export type ZKpiTone = keyof typeof TONES;

export function ZKpi({
  label,
  value,
  icon: Icon,
  tone = "navy",
  delta,
  deltaLabel,
  spark,
  href,
  loading,
}: {
  label: string;
  value: string | number | null;
  icon: LucideIcon;
  tone?: ZKpiTone;
  delta?: number | null;
  deltaLabel?: string;
  spark?: number[];
  href?: string;
  loading?: boolean;
}) {
  const t = TONES[tone];
  const inner = (
    <ZCard interactive={!!href} className="h-full">
      <div className="flex h-[88px] items-center gap-3 px-3.5">
        <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", t.icon)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            {label}
          </p>
          <div className="mt-0.5 flex items-baseline gap-2">
            {loading || value === null ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <p className="truncate text-[18px] font-bold leading-none tracking-tight text-slate-900 tabular-nums">
                {value}
              </p>
            )}
            {delta != null && !loading && <ZDelta value={delta} label={deltaLabel} />}
          </div>
        </div>
        {spark && spark.length > 1 && (
          <ZSparkline data={spark} stroke={t.stroke} className="h-8 w-14 shrink-0" />
        )}
      </div>
    </ZCard>
  );
  return href ? (
    <Link to={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function ZDelta({ value, label }: { value: number; label?: string }) {
  const positive = value >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[10.5px] font-semibold tabular-nums",
        positive ? "text-emerald-600" : "text-rose-600",
      )}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(value).toFixed(value % 1 === 0 ? 0 : 1)}%
      {label && <span className="ml-1 font-medium text-slate-400">{label}</span>}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────
 * Quick-card — compact operational tile
 * ──────────────────────────────────────────────────────────── */

export function ZQuickCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "slate",
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: ZKpiTone;
  href?: string;
}) {
  const t = TONES[tone];
  const inner = (
    <ZCard interactive={!!href} className="h-full">
      <div className="flex items-center gap-3 px-3.5 py-3">
        <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", t.icon)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium text-slate-500">{label}</p>
          <p className="text-[17px] font-bold leading-tight tracking-tight text-slate-900 tabular-nums">
            {value}
          </p>
          {hint && <p className="truncate text-[10.5px] text-slate-400">{hint}</p>}
        </div>
        {href && <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />}
      </div>
    </ZCard>
  );
  return href ? <Link to={href} className="block">{inner}</Link> : inner;
}

/* ────────────────────────────────────────────────────────────
 * Sparkline (pure SVG)
 * ──────────────────────────────────────────────────────────── */

export function ZSparkline({
  data,
  stroke = "#1B3A6B",
  fill = true,
  className,
}: {
  data: number[];
  stroke?: string;
  fill?: boolean;
  className?: string;
}) {
  if (!data.length) return null;
  const w = 80;
  const h = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = data.length > 1 ? w / (data.length - 1) : 0;
  const points = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return [x, y] as const;
  });
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const id = React.useId();
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none">
      {fill && (
        <>
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${id})`} />
        </>
      )}
      <path d={line} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────
 * Timeline — dense activity feed
 * ──────────────────────────────────────────────────────────── */

export type ZTimelineItem = {
  id: string;
  icon: LucideIcon;
  tone?: ZKpiTone;
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  timestamp: string;
};

export function ZTimeline({ items }: { items: ZTimelineItem[] }) {
  if (!items.length) return null;
  return (
    <ol className="relative">
      <span className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200" aria-hidden />
      {items.map((it) => {
        const Icon = it.icon;
        const t = TONES[it.tone ?? "slate"];
        return (
          <li key={it.id} className="relative grid grid-cols-[32px_minmax(0,1fr)_auto] items-start gap-3 py-2">
            <div className={cn("relative z-10 grid h-8 w-8 place-items-center rounded-full ring-4 ring-white", t.icon)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-slate-900">{it.title}</p>
              {it.description && (
                <p className="truncate text-[11.5px] text-slate-500">{it.description}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              {it.meta && <div>{it.meta}</div>}
              <span className="text-[10.5px] text-slate-400 tabular-nums">{it.timestamp}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ────────────────────────────────────────────────────────────
 * Empty state
 * ──────────────────────────────────────────────────────────── */

export function ZEmpty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-400">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2.5 text-[12.5px] font-semibold text-slate-700">{title}</p>
      {description && (
        <p className="mt-0.5 max-w-xs text-[11px] text-slate-500">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * Status badge
 * ──────────────────────────────────────────────────────────── */

const STATUS = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
  warning: "bg-amber-50 text-amber-700 ring-amber-200/60",
  danger: "bg-rose-50 text-rose-700 ring-rose-200/60",
  info: "bg-sky-50 text-sky-700 ring-sky-200/60",
  neutral: "bg-slate-100 text-slate-700 ring-slate-200/60",
  gold: "bg-[var(--gold-light)] text-[var(--gold-dark)] ring-amber-200/60",
} as const;

export function ZStatus({
  tone = "neutral",
  children,
  dot,
}: {
  tone?: keyof typeof STATUS;
  children: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1",
        STATUS[tone],
      )}
    >
      {dot && <span className="h-1 w-1 rounded-full bg-current" />}
      {children}
    </span>
  );
}
