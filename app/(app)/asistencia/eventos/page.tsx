import { requireStaffSession } from "@/lib/auth";
import { EventosAsistenciaClient } from "@/components/asistencia/EventosAsistenciaClient";
import { connection } from "next/server";

export default async function EventosAsistenciaPage() {
  await connection();
  const session = await requireStaffSession();
  return <EventosAsistenciaClient sessionRole={session.rolPrincipal} />;
}
