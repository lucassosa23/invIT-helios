import { notFound } from "next/navigation";

import { ScanShell } from "@/features/scan/components/scan-shell";
import { getScanSession } from "@/features/scan/lib/queries";

type Params = { sessionId: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { sessionId } = await params;
  const session = await getScanSession(sessionId);
  return { title: session ? `Escaneo · ${session.name}` : "Escaneo" };
}

export default async function ScanSessionPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { sessionId } = await params;
  const session = await getScanSession(sessionId);
  if (!session) notFound();

  return <ScanShell session={session} />;
}
