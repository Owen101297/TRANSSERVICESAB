import { requireStaffSession } from "@/lib/auth";
import { EventosAsistenciaClient } from "@/components/asistencia/EventosAsistenciaClient";
import { connection } from "next/server";

export default async function EventosAsistenciaPage({
  searchParams,
}: {
  searchParams: Promise<{ evento?: string }>;
}) {
  await connection();
  const session = await requireStaffSession();
  const { evento } = await searchParams;
  return <EventosAsistenciaClient sessionRole={session.rolPrincipal} initialEventId={evento} />;
}
