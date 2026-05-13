"use client";

import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  Receipt,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

type Tone = "critical" | "primary" | "low";

type Action = {
  title: string;
  hint: string;
  count: number;
  cta: string;
  href: string;
  icon: LucideIcon;
  tone: Tone;
};

const TONE: Record<
  Tone,
  {
    iconBg: string;
    iconText: string;
    accent: string;
    btn: string;
    arrowText: string;
  }
> = {
  critical: {
    iconBg: "bg-status-critical-soft",
    iconText: "text-status-critical",
    accent: "text-status-critical",
    btn: "bg-status-critical text-white hover:brightness-110",
    arrowText: "text-status-critical",
  },
  primary: {
    iconBg: "bg-primary/15",
    iconText: "text-primary",
    accent: "text-primary",
    btn: "bg-primary text-primary-foreground hover:brightness-110",
    arrowText: "text-primary",
  },
  low: {
    iconBg: "bg-status-low-soft",
    iconText: "text-status-low",
    accent: "text-status-low",
    btn: "bg-status-low text-white hover:brightness-110",
    arrowText: "text-status-low",
  },
};

type Props = {
  criticalCount: number;
  procurementPending: number;
  requestsPending: number;
};

export function QuickActions({
  criticalCount,
  procurementPending,
  requestsPending,
}: Props) {
  const actions: Action[] = [
    {
      title: "Reponer ahora",
      hint:
        criticalCount === 0
          ? "Sin items críticos por ahora"
          : `${criticalCount} ${criticalCount === 1 ? "crítico" : "críticos"} en espera`,
      count: criticalCount,
      cta: "Generar orden",
      href: "/inventory?filter=critical",
      icon: ShoppingCart,
      tone: "critical",
    },
    {
      title: "Compras del mes",
      hint: `${procurementPending} ${procurementPending === 1 ? "orden pendiente" : "órdenes pendientes"}`,
      count: procurementPending,
      cta: "Revisar cola",
      href: "/procurement",
      icon: Receipt,
      tone: "primary",
    },
    {
      title: "Pedidos del equipo",
      hint: `${requestsPending} por aprobar`,
      count: requestsPending,
      cta: "Aprobar",
      href: "/requests",
      icon: ClipboardCheck,
      tone: "low",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {actions.map((a, i) => (
        <ActionCard key={a.title} action={a} delay={i * 80} />
      ))}
    </section>
  );
}

function ActionCard({ action, delay }: { action: Action; delay: number }) {
  const t = TONE[action.tone];
  const Icon = action.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000, duration: 0.45 }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-2xl bg-card p-5 ring-1 ring-foreground/10 transition-shadow hover:ring-foreground/20"
    >
      <ArrowRight
        className={cn(
          "absolute right-4 top-4 size-4 opacity-25 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100",
          t.arrowText,
        )}
      />
      <div
        className={cn(
          "grid size-12 place-items-center rounded-xl ring-1 ring-foreground/[0.04]",
          t.iconBg,
        )}
      >
        <Icon className={cn("size-6", t.iconText)} strokeWidth={2} />
      </div>
      <h3 className="mt-4 text-[16px] font-semibold tracking-tight">
        {action.title}
      </h3>
      <p className={cn("mt-1 text-[13px] font-medium", t.accent)}>
        {action.hint}
      </p>
      <Link
        href={action.href}
        className={cn(
          "mt-5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold transition active:scale-[0.98]",
          t.btn,
        )}
      >
        {action.cta}
        <ArrowRight className="size-3.5" />
      </Link>
    </motion.div>
  );
}
