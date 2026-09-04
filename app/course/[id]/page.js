import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import { requireApprovedDevice } from "@/lib/deviceGuard";
import LessonPlayer from "./LessonPlayer";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await requireApprovedDevice(supabase, user.id);

  const { data: course } = await supabase.from("courses").select("*").eq("id", params.id).single();
  if (!course) notFound();

  // Server-side gate: only proceed if this user is actually enrolled in this course.
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", params.id)
    .maybeSingle();

  if (!enrollment) {
    return (
      <div className="container">
        <h1>🔒 Not enrolled</h1>
        <p>You don't have access to this course yet. Contact the admin.</p>
        <a href="/" className="btn">Back to courses</a>
      </div>
    );
  }

  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", params.id)
    .order("position", { ascending: true });

  return (
    <div className="container">
      <a href="/" style={{ color: "#4f7cff", fontSize: 14 }}>&larr; Back to courses</a>
      <h1>{course.title}</h1>
      <p style={{ color: "#999" }}>{course.description}</p>

      {(!lessons || lessons.length === 0) ? (
        <p style={{ color: "#888" }}>No lessons published yet — check back soon.</p>
      ) : (
        <LessonPlayer lessons={lessons} />
      )}
    </div>
  );
}
