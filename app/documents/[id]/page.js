import { notFound } from "next/navigation";
import { requireDocumentViewer } from "@/lib/docSession";
import { createAdminClient } from "@/lib/supabaseServer";
import DocumentViewer from "../DocumentViewer";

export const dynamic = "force-dynamic";

export default async function DocumentPage({ params }) {
  const viewer = await requireDocumentViewer();
  const adminClient = createAdminClient();

  const { data: access } = await adminClient
    .from("document_access")
    .select("id")
    .eq("document_id", params.id)
    .eq("user_id", viewer.id)
    .maybeSingle();

  if (!access) {
    return (
      <div className="container">
        <h1>🔒 No access</h1>
        <p>You don't have access to this document.</p>
        <a href="/documents" className="btn">Back</a>
      </div>
    );
  }

  const { data: document } = await adminClient.from("documents").select("*").eq("id", params.id).single();
  if (!document) notFound();

  const watermarkText = `${viewer.full_name || viewer.email} — ${new Date().toLocaleDateString()}`;

  return (
    <div className="container">
      <a href="/documents" style={{ color: "#4f7cff", fontSize: 14 }}>&larr; Back to documents</a>
      <h1>{document.title}</h1>
      <DocumentViewer documentId={document.id} watermarkText={watermarkText} />
    </div>
  );
}
