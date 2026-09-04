import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

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

  const { courseId, bunnyVideoId, title } = await req.json();
  if (!courseId || !bunnyVideoId || !title) {
    return NextResponse.json({ error: "courseId, bunnyVideoId and title are required" }, { status: 400 });
  }

  const { count } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  const { data: lesson, error } = await supabase
    .from("lessons")
    .insert({ course_id: courseId, bunny_video_id: bunnyVideoId, title, position: count || 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ lesson });
}
