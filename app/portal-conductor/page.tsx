import { PortalHomeClient } from "@/components/portal/PortalHomeClient";

export default async function PortalConductorPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>;
}) {
  const { vista } = await searchParams;
  return <PortalHomeClient initialView={vista || "hoy"} />;
}
