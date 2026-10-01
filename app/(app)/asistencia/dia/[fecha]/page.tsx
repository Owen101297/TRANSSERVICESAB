import { notFound } from "next/navigation";
import { AsistenciaAdminPage } from "@/app/(app)/asistencia/page";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default async function AsistenciaDiaPage({
  params,
}: {
  params: Promise<{ fecha: string }>;
}) {
  const { fecha } = await params;
  if (!DATE_PATTERN.test(fecha) || Number.isNaN(new Date(`${fecha}T12:00:00-05:00`).getTime())) {
    notFound();
  }

  return <AsistenciaAdminPage initialDate={fecha} />;
}
