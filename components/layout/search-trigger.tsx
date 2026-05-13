"use client";

import { Search } from "lucide-react";
import { openCommandPalette } from "./command-palette";

export function SearchTrigger() {
  return (
    <button
      type="button"
      onClick={openCommandPalette}
      aria-label="Abrir paleta de comandos"
      className="group inline-flex h-8 w-full max-w-md items-center gap-2 rounded-lg border border-input/60 bg-input/30 px-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-input/50 focus-visible:border-ring focus-visible:bg-input/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
    >
      <Search className="size-4 opacity-60 transition-opacity group-hover:opacity-90" />
      <span className="flex-1 truncate">Buscar en inventario, pedidos…</span>
      <kbd className="hidden items-center gap-0.5 rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
        <span>⌘</span>
        <span>K</span>
      </kbd>
    </button>
  );
}
