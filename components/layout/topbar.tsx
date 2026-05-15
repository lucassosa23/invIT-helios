import { Menu } from "lucide-react";

import { Breadcrumbs } from "./breadcrumbs";
import { TopbarSearch } from "./topbar-search";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { Button } from "@/components/ui/button";
import { NotificationsBell } from "@/features/notifications/components/notifications-bell";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/70 bg-background/70 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
      <Button
        size="icon-sm"
        variant="ghost"
        className="md:hidden text-muted-foreground"
        aria-label="Abrir navegación"
      >
        <Menu className="size-4" />
      </Button>

      <div className="hidden min-w-0 items-center md:flex">
        <Breadcrumbs />
      </div>

      <div className="flex flex-1 justify-center px-2">
        <TopbarSearch />
      </div>

      <div className="flex items-center gap-1">
        <NotificationsBell />
        <ThemeToggle />
        <div className="mx-1 h-5 w-px bg-border" />
        <UserMenu />
      </div>
    </header>
  );
}
