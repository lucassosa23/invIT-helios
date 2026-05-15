"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Boxes,
  CircleHelp,
  CornerDownLeft,
  Inbox,
  LayoutDashboard,
  Package,
  Plus,
  Settings,
  ShoppingBag,
  Sun,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useTheme } from "next-themes";
import { flatNav } from "@/lib/navigation";
import { loadInventory, subscribeInventory } from "@/lib/storage";
import type { Asset } from "@/lib/fake-data";
import type { PurchaseOrder } from "@/features/procurement/lib/orders";
import {
  loadOrders,
  subscribeOrders,
} from "@/features/procurement/lib/orders-storage";
import {
  loadRequests,
  subscribeRequests,
  type InternalRequest,
} from "@/features/requests/lib/requests";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();

  const [inventory, setInventory] = useState<Asset[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [requests, setRequests] = useState<InternalRequest[]>([]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const handleOpen = () => setOpen(true);
    window.addEventListener("keydown", handleKey);
    window.addEventListener("invit:open-command-palette", handleOpen);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("invit:open-command-palette", handleOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const refresh = () => {
      setInventory(loadInventory() ?? []);
      setOrders(loadOrders());
      setRequests(loadRequests());
    };
    refresh();
    const u1 = subscribeInventory(refresh);
    const u2 = subscribeOrders(refresh);
    const u3 = subscribeRequests(refresh);
    return () => {
      u1();
      u2();
      u3();
    };
  }, [open]);

  const run = (fn: () => void) => {
    setOpen(false);
    queueMicrotask(fn);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      className="top-[18%] w-[640px] max-w-[calc(100%-2rem)] sm:max-w-2xl"
    >
      <CommandInput placeholder="Buscar en inventario, pedidos, acciones…" />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-1 py-2">
            <CircleHelp className="size-5 text-muted-foreground/60" />
            <span className="text-sm text-muted-foreground">
              Sin resultados. Probá &ldquo;inventario&rdquo;, &ldquo;compra&rdquo; o &ldquo;garantía&rdquo;.
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
                <span className="ml-2 truncate text-xs text-muted-foreground">
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
                  onSelect={() => run(() => router.push("/procurement"))}
                >
                  <ShoppingBag className="text-muted-foreground" />
                  <span className="font-mono">{o.reference}</span>
                  <span className="ml-2 truncate text-xs text-muted-foreground">
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
                <span className="ml-2 truncate text-xs text-muted-foreground">
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
                  <span className="ml-2 truncate text-xs text-muted-foreground">
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
    </CommandDialog>
  );
}

export function openCommandPalette() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("invit:open-command-palette"));
}
