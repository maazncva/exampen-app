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

  const { userId, courseId, action } = await req.json();
  if (!userId || !courseId) return NextResponse.json({ error: "Missing userId or courseId" }, { status: 400 });

  const adminClient = createAdminClient();

  if (action === "remove") {
    const { error } = await adminClient.from("enrollments").delete().eq("user_id", userId).eq("course_id", courseId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const { data: enrollment, error } = await adminClient
    .from("enrollments")
    .insert({ user_id: userId, course_id: courseId })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ enrollment });
}
