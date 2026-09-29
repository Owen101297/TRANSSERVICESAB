import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { getServerSession } from "@/lib/auth";

export default async function PortalConductorLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (session.mustChangePassword) redirect("/cambiar-clave");

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <PortalShell>{children}</PortalShell>
    </Suspense>
  );
}
