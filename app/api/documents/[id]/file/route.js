import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseServer";
import { getDocumentViewer } from "@/lib/docSession";

// Streams the PDF bytes directly -- this route is only ever called via
// fetch() from inside the viewer page, never linked or navigated to
// directly, so there's nothing to right-click-save or copy as a URL.
export async function GET(req, { params }) {
  const viewer = await getDocumentViewer();
  if (!viewer) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const adminClient = createAdminClient();

  const { data: access } = await adminClient
    .from("document_access")
    .select("id")
    .eq("document_id", params.id)
    .eq("user_id", viewer.id)
    .maybeSingle();

  if (!access) return NextResponse.json({ error: "You don't have access to this document" }, { status: 403 });

  const { data: document } = await adminClient.from("documents").select("storage_path").eq("id", params.id).single();
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: fileBlob, error } = await adminClient.storage.from("documents").download(document.storage_path);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const arrayBuffer = await fileBlob.arrayBuffer();
  return new NextResponse(arrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store"
    }
  });
}
