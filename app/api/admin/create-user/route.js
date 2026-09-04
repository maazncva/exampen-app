import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabaseServer";

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

export async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { email, password, full_name, courseIds } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name }
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: profile } = await adminClient.from("profiles").select("*").eq("id", data.user.id).single();

  let enrollments = [];
  if (Array.isArray(courseIds) && courseIds.length > 0) {
    const rows = courseIds.map((course_id) => ({ user_id: data.user.id, course_id }));
    const { data: inserted, error: enrollError } = await adminClient.from("enrollments").insert(rows).select();
    if (enrollError) {
      // user was still created successfully; surface the enrollment issue separately
      return NextResponse.json({ profile, enrollments: [], enrollError: enrollError.message });
    }
    enrollments = inserted;
  }

  return NextResponse.json({ profile, enrollments });
}
