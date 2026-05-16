"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  ScanBarcode,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";

import {
  KIND_LABEL,
  KIND_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  type ScanSessionSummary,
} from "../lib/scan";
import { NewSessionDialog } from "./new-session-dialog";

type Props = {
  sessions: ScanSessionSummary[];
};

export function ScanSessionsList({ sessions }: Props) {
  const [open, setOpen] = useState(false);
  const { active, history } = useMemo(() => {
    const active: ScanSessionSummary[] = [];
    const history: ScanSessionSummary[] = [];
    for (const s of sessions) {
      if (s.status === "open") active.push(s);
      else history.push(s);
    }
    return { active, history };
  }, [sessions]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <ScanBarcode className="size-3.5 text-primary/70" />
          Sesiones de escaneo
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-3.5" />
          Nueva sesión
        </Button>
      </div>

      {active.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            En curso
          </h3>
          <ul className="flex flex-col gap-2">
            {active.map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </ul>
        </section>
      )}

      {history.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Historial
          </h3>
          <ul className="flex flex-col gap-2">
            {history.map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </ul>
        </section>
      )}

      {sessions.length === 0 && (
        <div className="grid place-items-center rounded-xl bg-card px-6 py-16 text-center ring-1 ring-foreground/10">
          <div className="flex flex-col items-center gap-3">
            <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/30">
              <ScanBarcode className="size-5" />
            </span>
            <p className="text-[14px] font-semibold">Sin sesiones todavía</p>
            <p className="max-w-[40ch] text-[12.5px] text-muted-foreground">
              Empezá una nueva sesión cuando recibas mercadería o entregues
              equipos. La pistola va a leer cada código y armar la lista en
              vivo.
            </p>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="size-3.5" />
              Crear primera sesión
            </Button>
          </div>
        </div>
      )}

      <NewSessionDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function SessionRow({ session }: { session: ScanSessionSummary }) {
  const kindTone = KIND_TONE[session.kind];
  const statusTone = STATUS_TONE[session.status];
  const KindIcon = session.kind === "in" ? ArrowDownToLine : ArrowUpFromLine;

  return (
    <li>
      <Link
        href={`/scan/${session.id}`}
        className={cn(
          "grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10 transition-colors hover:bg-muted/20",
        )}
      >
        <span
          className={cn(
            "grid size-10 place-items-center rounded-lg ring-1",
            kindTone.bg,
            kindTone.text,
            kindTone.ring,
          )}
        >
          <KindIcon className="size-[18px]" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[14px] font-semibold leading-tight">
              {session.name}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold leading-none ring-1",
                statusTone.bg,
                statusTone.text,
                statusTone.ring,
              )}
            >
              <span className={cn("size-1 rounded-full", statusTone.dot)} />
              {STATUS_LABEL[session.status]}
            </span>
            {session.pendingUnknowns > 0 && (
              <span className="rounded-full bg-status-low-soft px-2 py-0.5 text-[10.5px] font-semibold text-status-low ring-1 ring-status-low/30">
                {session.pendingUnknowns} sin resolver
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
            <span>{KIND_LABEL[session.kind]}</span>
            <span className="size-1 rounded-full bg-muted-foreground/40" />
            <span className="tabular-nums">
              {session.totalLines} ítem{session.totalLines === 1 ? "" : "s"}
            </span>
            <span className="size-1 rounded-full bg-muted-foreground/40" />
            <span className="tabular-nums">
              {session.totalUnits} unidad{session.totalUnits === 1 ? "" : "es"}
            </span>
            <span className="size-1 rounded-full bg-muted-foreground/40" />
            <span>
              {session.confirmedAt
                ? `confirmada ${formatRelative(session.confirmedAt)}`
                : `creada ${formatRelative(session.createdAt)}`}
            </span>
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}
