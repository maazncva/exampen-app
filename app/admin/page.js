import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabaseServer";
import { requireApprovedDevice } from "@/lib/deviceGuard";
import AdminPanel from "./AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await requireApprovedDevice(supabase, user.id);

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
  const { data: deviceSessions } = await supabase
    .from("device_sessions")
    .select("*")
    .order("last_seen_at", { ascending: false });

  // Merge in each user's active/banned status (lives on the auth user, not the profile row).
  const adminClient = createAdminClient();
  const { data: authList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const bannedIds = new Set(
    (authList?.users || [])
      .filter((u) => u.banned_until && new Date(u.banned_until) > new Date())
      .map((u) => u.id)
  );
  const usersWithStatus = (users || []).map((u) => ({ ...u, active: !bannedIds.has(u.id) }));

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
          initialUsers={usersWithStatus}
          initialCourses={courses || []}
          initialEnrollments={enrollments || []}
          initialLessons={lessons || []}
          initialDeviceSessions={deviceSessions || []}
        />
      </div>
    </div>
  );
}
