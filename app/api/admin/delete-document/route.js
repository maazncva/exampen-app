import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabaseServer";

async function requireAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

export async function POST(req) {
  const supabase = createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { documentId } = await req.json();
  if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

  const adminClient = createAdminClient();
  const { data: document } = await adminClient.from("documents").select("storage_path").eq("id", documentId).single();

  const { error } = await adminClient.from("documents").delete().eq("id", documentId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (document?.storage_path) {
    await adminClient.storage.from("documents").remove([document.storage_path]);
  }

  return NextResponse.json({ ok: true });
}
