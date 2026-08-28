import { MobileShell } from "@/components/layout/MobileShell";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <MobileShell>{children}</MobileShell>;
}
