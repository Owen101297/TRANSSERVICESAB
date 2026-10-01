import type { Metadata } from "next";
import RegistroAsistenciaClient from "@/components/asistencia/RegistroAsistenciaClient";

export const metadata: Metadata = {
  title: "Registro de asistencia | TRANS SERVICES A&B",
  description: "Registro individual de asistencia a actividades de formación y gestión.",
};

export default async function RegistroAsistenciaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <RegistroAsistenciaClient token={token} />;
}
