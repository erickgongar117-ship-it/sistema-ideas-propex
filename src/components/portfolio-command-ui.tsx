"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";

const toneClasses = {
  dark: "bg-slate-950 text-white",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-rose-50 text-rose-700",
  amber: "bg-amber-50 text-amber-800",
  blue: "bg-blue-50 text-blue-700"
};

export function PortfolioMetric({
  label,
  value,
  detail,
  icon: Icon,
  tone = "dark",
  change
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone?: keyof typeof toneClasses;
  change?: number | null;
}) {
  const positive = (change ?? 0) >= 0;
  return (
    <article className="surface min-h-[150px] rounded-lg p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-extrabold uppercase text-slate-500">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-3xl font-extrabold leading-none text-ink">{value}</p>
        {change !== null && change !== undefined ? (
          <span className={`inline-flex items-center gap-1 text-xs font-extrabold ${positive ? "text-emerald-700" : "text-rose-700"}`}>
            {positive ? <TrendingUp className="h-3.5 w-3.5" aria-hidden /> : <TrendingDown className="h-3.5 w-3.5" aria-hidden />}
            {Math.abs(change)}%
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  );
}

export function PortfolioChartPanel({
  eyebrow,
  title,
  description,
  children,
  action
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <article className="surface overflow-hidden rounded-lg">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase text-brand-700">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-extrabold text-ink">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </article>
  );
}

export type PortfolioAttentionItem = {
  label: string;
  value: number;
  href: string;
  icon: LucideIcon;
  tone: string;
};

export function PortfolioAttention({
  eyebrow,
  title,
  description,
  items
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: PortfolioAttentionItem[];
}) {
  return (
    <section className="overflow-hidden rounded-lg bg-slate-950 text-white">
      <div className="grid lg:grid-cols-[285px_1fr]">
        <div className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r lg:p-6">
          <p className="text-xs font-extrabold uppercase text-red-300">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-extrabold">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link className="group flex min-h-28 items-center gap-3 border-b border-white/10 p-4 transition hover:bg-white/5 sm:border-r xl:border-b-0" href={item.href} key={item.label}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10"><Icon className={`h-5 w-5 ${item.tone}`} aria-hidden /></span>
                <span className="min-w-0 flex-1"><span className="block text-2xl font-extrabold">{item.value}</span><span className="mt-1 block text-xs font-bold leading-4 text-slate-300">{item.label}</span></span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white" aria-hidden />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function EmptyChart({ message }: { message: string }) {
  return <div className="flex h-72 items-center justify-center px-6 text-center text-sm font-bold text-slate-400">{message}</div>;
}
