import { AppShell } from "@/components/layout/AppShell";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (session.mustChangePassword) redirect("/cambiar-clave");
  if (session.rolPrincipal === "conductor") redirect("/portal-conductor");

  return <AppShell>{children}</AppShell>;
}
