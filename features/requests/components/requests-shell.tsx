"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useRequests } from "../lib/use-requests";
import type { InternalRequest } from "../lib/requests";
import { NewRequestDialog } from "./new-request-dialog";
import { RequestsList } from "./requests-list";
import { OurPurchasesSection } from "@/features/procurement/components/our-purchases-section";

export function RequestsShell() {
  const { requests, hydrated } = useRequests();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InternalRequest | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (r: InternalRequest) => {
    setEditing(r);
    setDialogOpen(true);
  };

  const sorted = useMemo(
    () =>
      [...requests].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [requests],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-3.5" />
          Nuevo pedido
        </Button>
      </div>

      <RequestsList
        requests={sorted}
        hydrated={hydrated}
        onEdit={openEdit}
        onCreate={openCreate}
      />

      <OurPurchasesSection />

      <NewRequestDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditing(null);
        }}
        editing={editing}
      />
    </div>
  );
}
