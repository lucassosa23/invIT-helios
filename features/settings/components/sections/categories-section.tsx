"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Layers,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Tag,
  Trash2,
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
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { NumberInput } from "@/components/ui/number-input";
import {
  createCategory,
  deleteCategory,
  loadCategories,
  subscribeCategories,
  updateCategory,
  type Category,
} from "@/features/settings/lib/categories";
import { SectionCard, SectionHeader } from "../section-primitives";

const emptyDraft: Omit<Category, "id" | "slug"> & { slug?: string } = {
  name: "",
  slug: "",
  defaultThreshold: 8,
  iconHint: "Tag",
  trackWarranty: false,
  trackSerial: false,
  description: "",
};

export function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [draft, setDraft] = useState(emptyDraft);

  useEffect(() => {
    const sync = () => setCategories(loadCategories());
    sync();
    return subscribeCategories(sync);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) =>
      `${c.name} ${c.slug}`.toLowerCase().includes(q),
    );
  }, [categories, query]);

  const openNew = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setDialogOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setDraft({
      name: c.name,
      slug: c.slug,
      defaultThreshold: c.defaultThreshold,
      iconHint: c.iconHint,
      trackWarranty: c.trackWarranty,
      trackSerial: c.trackSerial,
      description: c.description,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!draft.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    if (editing) {
      updateCategory(editing.id, draft);
      toast.success("Categoría actualizada");
    } else {
      createCategory(draft);
      toast.success("Categoría creada");
    }
    setDialogOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionCard>
        <SectionHeader
          icon={Layers}
          title="Categorías"
          description={`${categories.length} categorías · Cada item se asigna a una y hereda sus reglas.`}
          action={
            <Button size="sm" onClick={openNew}>
              <Plus className="size-3.5" /> Nueva categoría
            </Button>
          }
        />

        <div className="border-b border-border/60 px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar categoría…"
              className="h-9 pl-8"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-14 text-center text-[13px] text-muted-foreground">
            Sin categorías coincidentes.
          </div>
        ) : (
          <ul className="grid grid-cols-1 divide-y divide-border/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {chunkInColumns(filtered, 2).map((column, ci) => (
              <div key={ci} className="flex flex-col divide-y divide-border/60">
                {column.map((c) => (
                  <li
                    key={c.id}
                    className="grid items-center gap-3 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/20">
                          <Tag className="size-3.5" />
                        </div>
                        <span className="text-[13.5px] font-medium">{c.name}</span>
                        <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground">
                          {c.slug}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Boxes className="size-3" /> umbral default {c.defaultThreshold}
                        </span>
                        {c.trackWarranty && (
                          <span className="inline-flex items-center gap-1 text-status-info">
                            <ShieldCheck className="size-3" /> garantía
                          </span>
                        )}
                        {c.trackSerial && (
                          <span className="inline-flex items-center gap-1">· serial</span>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(c)}>
                          <Pencil /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => {
                            deleteCategory(c.id);
                            toast.success("Categoría eliminada");
                          }}
                        >
                          <Trash2 /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                ))}
              </div>
            ))}
          </ul>
        )}
      </SectionCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar categoría" : "Nueva categoría"}
            </DialogTitle>
            <DialogDescription>
              Las categorías definen reglas por defecto que heredan los items.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[12.5px] font-medium">Nombre</label>
              <Input
                autoFocus
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-[12.5px] font-medium">Umbral default</label>
              <NumberInput
                value={draft.defaultThreshold}
                onChange={(v) => setDraft({ ...draft, defaultThreshold: v })}
                min={1}
                max={1000}
              />
            </div>
            <div>
              <label className="mb-1 block text-[12.5px] font-medium">Slug</label>
              <Input
                value={draft.slug ?? ""}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                placeholder="se autocompleta del nombre"
                className="font-mono text-[12.5px]"
              />
            </div>
            <div className="sm:col-span-2 grid grid-cols-2 gap-3 rounded-lg border border-border/70 bg-muted/30 p-3">
              <label className="flex items-center gap-2 text-[12.5px]">
                <Switch
                  checked={draft.trackWarranty}
                  onCheckedChange={(c) => setDraft({ ...draft, trackWarranty: c })}
                />
                <span>Trackear garantía</span>
              </label>
              <label className="flex items-center gap-2 text-[12.5px]">
                <Switch
                  checked={draft.trackSerial}
                  onCheckedChange={(c) => setDraft({ ...draft, trackSerial: c })}
                />
                <span>Trackear número de serie</span>
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[12.5px] font-medium">Descripción</label>
              <Textarea
                rows={2}
                value={draft.description ?? ""}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave}>
              {editing ? "Guardar cambios" : "Crear categoría"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function chunkInColumns<T>(arr: T[], cols: number): T[][] {
  const per = Math.ceil(arr.length / cols);
  const out: T[][] = [];
  for (let i = 0; i < cols; i++) {
    out.push(arr.slice(i * per, (i + 1) * per));
  }
  return out;
}
