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

  // Course lookup and the enrollment check don't depend on each other --
  // run them together.
  const [{ data: course }, { data: enrollment }] = await Promise.all([
    supabase.from("courses").select("*").eq("id", params.id).single(),
    supabase.from("enrollments").select("id").eq("user_id", user.id).eq("course_id", params.id).maybeSingle()
  ]);

  if (!course) notFound();

  if (!enrollment) {
    return (
      <div className="container">
        <h1>🔒 Not enrolled</h1>
        <p>You don't have access to this course yet. Contact the admin.</p>
        <a href="/" className="btn">Back to courses</a>
      </div>
    );
  }

  const [{ data: lessons }, { data: pdfs }] = await Promise.all([
    supabase.from("lessons").select("*").eq("course_id", params.id).order("position", { ascending: true }),
    supabase.from("course_pdfs").select("id, title").eq("course_id", params.id).order("position", { ascending: true })
  ]);

  const hasLessons = lessons && lessons.length > 0;
  const hasPdfs = pdfs && pdfs.length > 0;

  return (
    <div className="container">
      <a href="/" style={{ color: "#4f7cff", fontSize: 14 }}>&larr; Back to courses</a>
      <h1>{course.title}</h1>
      <p style={{ color: "#999" }}>{course.description}</p>

      {!hasLessons && !hasPdfs && (
        <p style={{ color: "#888" }}>Nothing published yet — check back soon.</p>
      )}

      {hasLessons && <LessonPlayer lessons={lessons} />}

      {hasPdfs && (
        <div style={{ marginTop: hasLessons ? 36 : 20 }}>
          <h3>PDFs</h3>
          <div className="grid">
            {pdfs.map((p) => (
              <a key={p.id} href={`/course/${course.id}/pdf/${p.id}`} style={{ textDecoration: "none" }}>
                <div className="course-card">
                  <div style={{ padding: 20 }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                    <h3 style={{ margin: 0 }}>{p.title}</h3>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
