"use client";

import { useTransition } from "react";
import { Bell, ChevronDown, LifeBuoy, LogOut, Settings, Sparkles } from "lucide-react";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/lib/auth/actions";
import { initials } from "@/lib/format";

export type UserMenuProps = {
  name: string;
  email: string;
};

export function UserMenu({ name, email }: UserMenuProps) {
  const [pending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction();
    });
  };

  const userInitials = initials(name);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Abrir menú de usuario"
            className="group flex h-8 items-center gap-1.5 rounded-md pr-1.5 pl-0.5 transition-colors hover:bg-muted/60"
          >
            <div className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-primary/40 to-primary/10 text-[11.5px] font-semibold text-primary-foreground ring-1 ring-primary/30">
              {userInitials}
            </div>
            <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-aria-expanded:rotate-180" />
          </button>
        }
      />
      <DropdownMenuContent align="end" sideOffset={8} className="w-60 p-1.5">
        <div className="flex items-center gap-2.5 px-2 pt-1 pb-2">
          <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-primary/50 to-primary/10 text-sm font-semibold text-primary-foreground ring-1 ring-primary/30">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-medium">{name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {email}
            </div>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Workspace</DropdownMenuLabel>
          <DropdownMenuItem render={<Link href="/settings" />}>
            <Settings className="text-muted-foreground" />
            Ajustes
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/activity" />}>
            <Bell className="text-muted-foreground" />
            Notificaciones
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Sparkles className="text-muted-foreground" />
            Novedades
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LifeBuoy className="text-muted-foreground" />
          Ayuda y soporte
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          disabled={pending}
          onClick={handleSignOut}
        >
          <LogOut />
          {pending ? "Cerrando…" : "Cerrar sesión"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
