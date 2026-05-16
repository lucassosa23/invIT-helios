"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command as CommandPrimitive } from "cmdk";
import {
  Activity,
  Boxes,
  CornerDownLeft,
  Inbox,
  LayoutDashboard,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";

import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { flatNav } from "@/lib/navigation";
import { SETTINGS_SECTIONS } from "@/features/settings/lib/sections";
import type { Asset } from "@/lib/fake-data";
import type { PurchaseOrder } from "@/features/procurement/lib/orders";
import type { InternalRequest } from "@/features/requests/lib/requests";
import { loadSearchPayloadAction } from "@/features/search/search-actions";

export function TopbarSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [inventory, setInventory] = useState<Asset[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [requests, setRequests] = useState<InternalRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();

  // Carga lazy: la primera vez que el usuario abre el search traemos
  // inventory + orders + requests con una sola server action. Hasta
  // entonces no le pegamos a la DB para esto — saca peso del layout
  // en cada navegación.
  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    (async () => {
      try {
        const payload = await loadSearchPayloadAction();
        if (cancelled) return;
        setInventory(payload.inventory);
        setOrders(payload.orders);
        setRequests(payload.requests);
        setLoaded(true);
      } catch {
        /* silencioso: si falla simplemente no aparecen resultados */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, loaded]);

  // Atajo Cmd/Ctrl+K → focusea el input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Click afuera cierra el dropdown
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const run = (fn: () => void) => {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    queueMicrotask(fn);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-md"
    >
      <CommandPrimitive
        shouldFilter
        loop
        className="flex w-full flex-col overflow-visible bg-transparent"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <CommandPrimitive.Input
            ref={inputRef}
            value={query}
            onValueChange={(v) => {
              setQuery(v);
              if (!open) setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Buscar en inventario, pedidos…"
            className={cn(
              "h-9 w-full rounded-lg border border-input/60 bg-input/30 pl-8 pr-12 text-[13.5px] text-foreground outline-none transition-colors",
              "placeholder:text-muted-foreground",
              "hover:bg-input/50",
              "focus-visible:border-ring focus-visible:bg-input/60 focus-visible:ring-2 focus-visible:ring-ring/30",
            )}
          />
          {!open && (
            <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
              <span>⌘</span>
              <span>K</span>
            </kbd>
          )}
        </div>

        <div
          className={cn(
            "absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl bg-popover shadow-lg ring-1 ring-foreground/10 transition-opacity duration-100",
            open
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none invisible opacity-0",
          )}
          aria-hidden={!open}
        >
            <CommandList className="max-h-[420px] overflow-y-auto p-1">
              <CommandEmpty>
                <div className="flex flex-col items-center gap-1 py-3">
                  <Search className="size-4 text-muted-foreground/60" />
                  <span className="text-[13px] text-muted-foreground">
                    Sin resultados. Probá &ldquo;monitor&rdquo;, &ldquo;PO-&rdquo; o &ldquo;REQ-&rdquo;.
                  </span>
                </div>
              </CommandEmpty>

              {inventory.length > 0 && (
                <CommandGroup heading="Inventario">
                  {inventory.slice(0, 50).map((a) => (
                    <CommandItem
                      key={`inv-${a.id}`}
                      value={`inv ${a.name} ${a.brand} ${a.sku} ${a.category}`}
                      onSelect={() =>
                        run(() =>
                          router.push(
                            `/inventory?q=${encodeURIComponent(a.name)}`,
                          ),
                        )
                      }
                    >
                      <Package className="text-muted-foreground" />
                      <span className="flex-1 truncate">{a.name}</span>
                      <span className="ml-2 truncate text-[11.5px] text-muted-foreground">
                        {a.brand || a.category} · stock {a.stock}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {orders.length > 0 && (
                <CommandGroup heading="Órdenes de compra">
                  {orders.slice(0, 30).map((o) => {
                    const itemPreview = o.lines
                      .slice(0, 3)
                      .map((l) => l.name)
                      .join(", ");
                    return (
                      <CommandItem
                        key={`ord-${o.id}`}
                        value={`po ${o.reference} ${itemPreview} ${o.status}`}
                        onSelect={() =>
                          run(() => router.push("/procurement"))
                        }
                      >
                        <ShoppingBag className="text-muted-foreground" />
                        <span className="font-mono">{o.reference}</span>
                        <span className="ml-2 truncate text-[11.5px] text-muted-foreground">
                          {o.lines.length}{" "}
                          {o.lines.length === 1 ? "item" : "items"}
                          {itemPreview && ` · ${itemPreview}`}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

              {requests.length > 0 && (
                <CommandGroup heading="Pedidos internos">
                  {requests.slice(0, 30).map((r) => (
                    <CommandItem
                      key={`req-${r.id}`}
                      value={`req ${r.reference} ${r.requesterName} ${r.itemName} ${r.status}`}
                      onSelect={() => run(() => router.push("/requests"))}
                    >
                      <Inbox className="text-muted-foreground" />
                      <span className="font-mono">{r.reference}</span>
                      <span className="ml-2 truncate text-[11.5px] text-muted-foreground">
                        {r.requesterName} · {r.qty} × {r.itemName}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {(inventory.length > 0 ||
                orders.length > 0 ||
                requests.length > 0) && <CommandSeparator />}

              <CommandGroup heading="Navegación">
                {flatNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.href}
                      value={`ir ${item.label} ${item.description ?? ""}`}
                      onSelect={() => run(() => router.push(item.href))}
                    >
                      <Icon className="text-muted-foreground" />
                      <span>{item.label}</span>
                      {item.description && (
                        <span className="ml-2 truncate text-[11.5px] text-muted-foreground">
                          {item.description}
                        </span>
                      )}
                      {item.shortcut && (
                        <CommandShortcut>{item.shortcut}</CommandShortcut>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Ajustes">
                {SETTINGS_SECTIONS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <CommandItem
                      key={s.href}
                      value={`ajustes settings ${s.label} ${(s.keywords ?? []).join(" ")}`}
                      onSelect={() => run(() => router.push(s.href))}
                    >
                      <Icon className="text-muted-foreground" />
                      <span>{s.label}</span>
                      <span className="ml-2 truncate text-[11.5px] text-muted-foreground">
                        Ajustes · {s.description}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Acciones rápidas">
                <CommandItem
                  value="agregar inventario nuevo item"
                  onSelect={() => run(() => router.push("/inventory?new=1"))}
                >
                  <Plus className="text-muted-foreground" />
                  <span>Agregar item al inventario</span>
                  <CommandShortcut>N</CommandShortcut>
                </CommandItem>
                <CommandItem
                  value="nueva compra orden"
                  onSelect={() => run(() => router.push("/procurement?new=1"))}
                >
                  <ShoppingBag className="text-muted-foreground" />
                  <span>Crear orden de compra</span>
                </CommandItem>
                <CommandItem
                  value="nuevo pedido interno"
                  onSelect={() => run(() => router.push("/requests?new=1"))}
                >
                  <Inbox className="text-muted-foreground" />
                  <span>Registrar nuevo pedido</span>
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Atajos">
                <CommandItem
                  value="tema claro oscuro"
                  onSelect={() =>
                    run(() =>
                      setTheme(resolvedTheme === "dark" ? "light" : "dark"),
                    )
                  }
                >
                  <Sun className="text-muted-foreground" />
                  <span>Cambiar tema (claro / oscuro)</span>
                  <CommandShortcut>⌘ ⇧ L</CommandShortcut>
                </CommandItem>
                <CommandItem
                  value="inicio dashboard"
                  onSelect={() => run(() => router.push("/dashboard"))}
                >
                  <LayoutDashboard className="text-muted-foreground" />
                  <span>Ir a Inicio</span>
                  <CommandShortcut>G I</CommandShortcut>
                </CommandItem>
                <CommandItem
                  value="inventario"
                  onSelect={() => run(() => router.push("/inventory"))}
                >
                  <Boxes className="text-muted-foreground" />
                  <span>Ir a Inventario</span>
                  <CommandShortcut>G V</CommandShortcut>
                </CommandItem>
                <CommandItem
                  value="actividad"
                  onSelect={() => run(() => router.push("/activity"))}
                >
                  <Activity className="text-muted-foreground" />
                  <span>Ir a Actividad</span>
                </CommandItem>
                <CommandItem
                  value="ajustes"
                  onSelect={() => run(() => router.push("/settings"))}
                >
                  <Settings className="text-muted-foreground" />
                  <span>Ir a Ajustes</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>

            <div className="flex items-center justify-between border-t border-border/70 px-3 py-2 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  ↑↓
                </kbd>
                navegar
              </div>
              <div className="flex items-center gap-2">
                <kbd className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  <CornerDownLeft className="size-3" />
                </kbd>
                seleccionar
                <span className="px-1">·</span>
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  esc
                </kbd>
                cerrar
              </div>
            </div>
          </div>
      </CommandPrimitive>
    </div>
  );
}
