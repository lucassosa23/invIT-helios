import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { ScanSessionsList } from "@/features/scan/components/scan-sessions-list";
import { getScanSessions } from "@/features/scan/lib/queries";

export const metadata: Metadata = {
  title: "Escaneo",
};

export default async function ScanPage() {
  const sessions = await getScanSessions();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Pistola de códigos"
        title="Escaneo"
        description="Sumá o restá del inventario escaneando con la pistola. Cada sesión acumula los códigos y al confirmar se aplican todos los movimientos juntos."
      />
      <ScanSessionsList sessions={sessions} />
    </div>
  );
}
