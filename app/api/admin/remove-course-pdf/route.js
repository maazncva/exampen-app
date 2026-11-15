import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabaseServer";

async function requireAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

// Removes a PDF from a course. The file itself stays in Bunny Storage.
export async function POST(req) {
  const supabase = createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { pdfId } = await req.json();
  if (!pdfId) return NextResponse.json({ error: "pdfId required" }, { status: 400 });

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("course_pdfs").delete().eq("id", pdfId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
