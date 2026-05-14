"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Filter,
  Lock,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatRelative, initials } from "@/lib/format";
import {
  ROLE_DESCRIPTION,
  ROLE_LABEL,
  STATUS_LABEL,
  changeRole,
  inviteMember,
  loadMembers,
  removeMember,
  subscribeMembers,
  suspendMember,
  type Member,
  type Role,
} from "@/features/settings/lib/members";
import { SectionCard, SectionHeader } from "../section-primitives";

const ROLE_ORDER: Role[] = ["owner", "admin", "operator", "viewer"];

export function MembersSection() {
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    const sync = () => setMembers(loadMembers());
    sync();
    return subscribeMembers(sync);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => (roleFilter === "all" ? true : m.role === roleFilter))
      .filter((m) => {
        if (!q) return true;
        return (
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.team.toLowerCase().includes(q)
        );
      });
  }, [members, query, roleFilter]);

  const stats = useMemo(() => {
    const total = members.length;
    const active = members.filter((m) => m.status === "active").length;
    const invited = members.filter((m) => m.status === "invited").length;
    const mfa = members.filter((m) => m.twoFactor).length;
    return { total, active, invited, mfa };
  }, [members]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Total" value={stats.total} />
        <Stat label="Activos" value={stats.active} tone="emerald" />
        <Stat label="Invitados" value={stats.invited} tone="amber" />
        <Stat label="Con MFA" value={`${stats.mfa}/${stats.total}`} tone="sky" />
      </div>

      <SectionCard>
        <SectionHeader
          icon={Users}
          title="Miembros del workspace"
          description={`${stats.total} ${stats.total === 1 ? "miembro" : "miembros"} · Owners y admins pueden invitar.`}
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setInviteOpen(true)}
              >
                <UserPlus className="size-3.5" /> Invitar miembro
              </Button>
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-5 py-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, email o equipo…"
              className="h-9 pl-8"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="size-3.5 text-muted-foreground" />
            <Select
              value={roleFilter}
              onValueChange={(v) => v && setRoleFilter(v as Role | "all")}
            >
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                {ROLE_ORDER.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-5">Miembro</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Última actividad</TableHead>
              <TableHead className="text-right pr-5">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="px-5 py-10 text-center text-[13px] text-muted-foreground">
                  Sin miembros coincidentes.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="px-5">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-primary/35 to-primary/10 text-[11.5px] font-semibold ring-1 ring-primary/30">
                      {initials(m.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium">{m.name}</div>
                      <div className="truncate text-[11.5px] text-muted-foreground">{m.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <RoleControl member={m} />
                </TableCell>
                <TableCell>
                  <span className="text-[12.5px] text-muted-foreground">{m.team || "—"}</span>
                </TableCell>
                <TableCell>
                  <StatusPill member={m} />
                </TableCell>
                <TableCell className="text-[12px] text-muted-foreground">
                  {m.lastActiveAt
                    ? formatRelative(m.lastActiveAt)
                    : m.invitedAt
                      ? `invitado ${formatRelative(m.invitedAt)}`
                      : "—"}
                </TableCell>
                <TableCell className="text-right pr-5">
                  <MemberMenu member={m} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={Lock}
          title="Roles disponibles"
          description="Las invitaciones quedan registradas en el audit log."
        />
        <div className="grid divide-y divide-border/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          {ROLE_ORDER.map((r) => (
            <div key={r} className="px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-md bg-primary/10 text-primary">
                  <ShieldCheck className="size-3.5" />
                </span>
                <div className="text-[13.5px] font-medium">{ROLE_LABEL[r]}</div>
              </div>
              <p className="mt-1.5 text-[12.5px] text-muted-foreground">
                {ROLE_DESCRIPTION[r]}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "emerald" | "amber" | "sky";
}) {
  const tones: Record<NonNullable<typeof tone>, string> = {
    emerald: "text-status-healthy",
    amber: "text-status-low",
    sky: "text-status-info",
  };
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-[22px] font-semibold tracking-tight tabular-nums",
          tone && tones[tone],
        )}
      >
        {value}
      </div>
    </div>
  );
}

function RoleControl({ member }: { member: Member }) {
  if (member.role === "owner") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11.5px] font-medium text-primary ring-1 ring-primary/25">
        <ShieldCheck className="size-3" /> Owner
      </span>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-md border border-transparent px-1.5 py-0.5 text-[12.5px] text-foreground/90 transition-colors hover:bg-muted">
        {ROLE_LABEL[member.role]} <ChevronDown className="size-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Cambiar rol</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(["admin", "operator", "viewer"] as Role[]).map((r) => (
            <DropdownMenuItem
              key={r}
              onClick={() => {
                if (r === member.role) return;
                changeRole(member.id, r);
                toast.success(`${member.name} → ${ROLE_LABEL[r]}`);
              }}
            >
              <ShieldCheck />
              <span>{ROLE_LABEL[r]}</span>
              {member.role === r && <CheckCircle2 className="ml-auto text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StatusPill({ member }: { member: Member }) {
  if (member.status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-status-healthy-soft px-2 py-0.5 text-[11.5px] font-medium text-status-healthy">
        <span className="size-1.5 rounded-full bg-current" />
        {STATUS_LABEL.active}
      </span>
    );
  }
  if (member.status === "invited") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-status-low-soft px-2 py-0.5 text-[11.5px] font-medium text-status-low">
        <Clock className="size-3" /> {STATUS_LABEL.invited}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[11.5px] font-medium text-muted-foreground">
      <XCircle className="size-3" /> {STATUS_LABEL.suspended}
    </span>
  );
}

function MemberMenu({ member }: { member: Member }) {
  if (member.role === "owner") {
    return (
      <span className="text-[11px] text-muted-foreground/60">Owner</span>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Más acciones"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {member.status === "active" && (
          <DropdownMenuItem
            onClick={() => {
              suspendMember(member.id, true);
              toast.success(`${member.name} suspendido`);
            }}
          >
            <UserMinus /> Suspender
          </DropdownMenuItem>
        )}
        {member.status === "suspended" && (
          <DropdownMenuItem
            onClick={() => {
              suspendMember(member.id, false);
              toast.success(`${member.name} reactivado`);
            }}
          >
            <CheckCircle2 /> Reactivar
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            const res = removeMember(member.id);
            if (res.ok) toast.success(`${member.name} eliminado del workspace`);
            else toast.error(res.reason ?? "No se pudo eliminar");
          }}
        >
          <Trash2 /> Eliminar del workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("operator");
  const [team, setTeam] = useState("Soporte IT");

  const handleInvite = () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      toast.error("Ingresá un email válido");
      return;
    }
    const res = inviteMember(trimmed, role, team);
    if (!res.ok) {
      toast.error(res.reason ?? "No se pudo invitar");
      return;
    }
    toast.success(`Invitación enviada a ${trimmed}`);
    setEmail("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar miembro</DialogTitle>
          <DialogDescription>
            Le enviaremos un email con un link de invitación válido por 7 días.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-[12.5px] font-medium">Email corporativo</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="persona@heliossalud.com.ar"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[12.5px] font-medium">Rol</label>
              <Select value={role} onValueChange={(v) => v && setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{ROLE_LABEL.admin}</SelectItem>
                  <SelectItem value="operator">{ROLE_LABEL.operator}</SelectItem>
                  <SelectItem value="viewer">{ROLE_LABEL.viewer}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-[12.5px] font-medium">Equipo</label>
              <Input value={team} onChange={(e) => setTeam(e.target.value)} />
            </div>
          </div>
          <p className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-3 text-[12px] leading-relaxed text-muted-foreground">
            {ROLE_DESCRIPTION[role]}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleInvite}>
            <Plus className="size-3.5" /> Enviar invitación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
