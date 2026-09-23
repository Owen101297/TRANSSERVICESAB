import { Suspense } from "react";
import { PortalShell } from "@/components/portal/PortalShell";

export default function PortalConductorLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <PortalShell>{children}</PortalShell>
    </Suspense>
  );
}
