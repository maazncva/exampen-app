import { requireDocumentViewer } from "@/lib/docSession";
import { createAdminClient } from "@/lib/supabaseServer";
import LogoutButton from "./LogoutButton";

export const dynamic = "force-dynamic";

export default async function DocumentsListPage() {
  const viewer = await requireDocumentViewer();
  const adminClient = createAdminClient();

  const { data: access } = await adminClient
    .from("document_access")
    .select("document_id, documents(id, title)")
    .eq("user_id", viewer.id);

  const documents = (access || []).map((a) => a.documents).filter(Boolean);

  return (
    <div>
      <div className="topbar">
        <div className="brand">EXAMPEN — Documents</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#aaa" }}>{viewer.email}</span>
          <LogoutButton />
        </div>
      </div>
      <div className="container">
        <h1>Your documents</h1>
        {documents.length === 0 ? (
          <p style={{ color: "#999" }}>No documents have been shared with you yet.</p>
        ) : (
          <div className="grid">
            {documents.map((d) => (
              <a key={d.id} href={`/documents/${d.id}`} style={{ textDecoration: "none" }}>
                <div className="course-card">
                  <div style={{ padding: 20 }}>
                    <h3 style={{ margin: 0 }}>{d.title}</h3>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
