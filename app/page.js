import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import LogoutButton from "./LogoutButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, description, thumbnail_url")
    .order("created_at", { ascending: false });

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("user_id", user.id);

  const unlockedIds = new Set((enrollments || []).map((e) => e.course_id));

  return (
    <div>
      <div className="topbar">
        <div className="brand">EXAMPEN</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#aaa" }}>{profile?.email}</span>
          {profile?.role === "admin" && (
            <a href="/admin" className="btn btn-secondary" style={{ textDecoration: "none", padding: "8px 14px" }}>
              Admin panel
            </a>
          )}
          <LogoutButton />
        </div>
      </div>

      <div className="container">
        <h1>Your courses</h1>
        <p style={{ color: "#999" }}>Locked courses are visible but not accessible until an admin enrolls you.</p>

        <div className="grid">
          {(courses || []).map((course) => {
            const unlocked = unlockedIds.has(course.id);
            const CardInner = (
              <div className="course-card">
                <div className="course-thumb-wrap">
                  {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: "#222" }} />
                  )}
                  {!unlocked && <div className="locked-overlay">🔒</div>}
                </div>
                <div className="course-title">{course.title}</div>
                <div className="tag">{unlocked ? "Enrolled" : "Locked"}</div>
              </div>
            );
            return unlocked ? (
              <a key={course.id} href={`/course/${course.id}`} style={{ textDecoration: "none" }}>
                {CardInner}
              </a>
            ) : (
              <div key={course.id} style={{ cursor: "not-allowed" }}>
                {CardInner}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
