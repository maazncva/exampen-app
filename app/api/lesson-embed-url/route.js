import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { getSignedBunnyEmbedUrl } from "@/lib/bunny";

// Given a lessonId, returns a short-lived signed playback URL --
// but ONLY after re-checking (server-side, from the database) that the
// logged-in user is enrolled in the course that lesson belongs to.
export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { lessonId } = await req.json();
  if (!lessonId) return NextResponse.json({ error: "lessonId required" }, { status: 400 });

  const { data: lesson } = await supabase.from("lessons").select("*").eq("id", lessonId).single();
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", lesson.course_id)
    .maybeSingle();

  if (!enrollment) return NextResponse.json({ error: "Not enrolled in this course" }, { status: 403 });

  const embedUrl = getSignedBunnyEmbedUrl(lesson.bunny_video_id);
  return NextResponse.json({ embedUrl });
}
