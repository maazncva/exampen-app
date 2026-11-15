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

  const { courseId, storagePath, title } = await req.json();
  if (!courseId || !storagePath || !title) {
    return NextResponse.json({ error: "courseId, storagePath and title are required" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const { count } = await adminClient
    .from("course_pdfs")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  const { data: pdf, error } = await adminClient
    .from("course_pdfs")
    .insert({ course_id: courseId, storage_path: storagePath, title, position: count || 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ pdf });
}
