import { requireStaffSession } from "@/lib/auth";
import { NovedadesPersonalClient } from "@/components/asistencia/NovedadesPersonalClient";
import { connection } from "next/server";

export default async function NovedadesPersonalPage() {
  await connection();
  const session = await requireStaffSession();
  return <NovedadesPersonalClient sessionRole={session.rolPrincipal} />;
}
