import { getDocumentosDb } from "@/lib/services/documentos.service";
import { DocumentosClientView } from "@/components/documentos/DocumentosClientView";

export const dynamic = "force-dynamic";

export default async function DocumentosPage() {
  const documentos = await getDocumentosDb();

  return <DocumentosClientView initialDocumentos={documentos} />;
}
