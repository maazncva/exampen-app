import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import AdminPanel from "./AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return (
      <div className="container">
        <h1>Not authorized</h1>
        <p>This account doesn't have admin access.</p>
        <a href="/" className="btn">Back to courses</a>
      </div>
    );
  }

  const { data: users } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  const { data: courses } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
  const { data: enrollments } = await supabase.from("enrollments").select("*");
  const { data: lessons } = await supabase.from("lessons").select("*").order("position", { ascending: true });

  return (
    <div>
      <div className="topbar">
        <div className="brand">EXAMPEN — Admin</div>
        <a href="/" className="btn btn-secondary" style={{ textDecoration: "none", padding: "8px 14px" }}>
          Back to app
        </a>
      </div>
      <div className="container">
        <AdminPanel
          initialUsers={users || []}
          initialCourses={courses || []}
          initialEnrollments={enrollments || []}
          initialLessons={lessons || []}
        />
      </div>
    </div>
  );
}
