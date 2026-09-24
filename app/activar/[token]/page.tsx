import ActivarCuentaClient from "@/components/auth/ActivarCuentaClient";

export const dynamic = "force-dynamic";

export default async function ActivarCuentaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ActivarCuentaClient token={token} />;
}
