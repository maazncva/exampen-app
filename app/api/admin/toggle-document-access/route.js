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

  const { documentId, userId, action } = await req.json();
  if (!documentId || !userId) return NextResponse.json({ error: "documentId and userId required" }, { status: 400 });

  const adminClient = createAdminClient();

  if (action === "remove") {
    const { error } = await adminClient.from("document_access").delete().eq("document_id", documentId).eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const { data: access, error } = await adminClient
    .from("document_access")
    .insert({ document_id: documentId, user_id: userId })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ access });
}
