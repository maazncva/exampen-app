import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabaseServer";

async function requireAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

// Deactivating blocks login (via Supabase's built-in ban) without deleting
// anything -- their account, courses, and progress all stay intact and can
// be reactivated any time.
export async function POST(req) {
  const supabase = createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { userId, active } = await req.json();
  if (!userId || typeof active !== "boolean") {
    return NextResponse.json({ error: "userId and active (boolean) required" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: active ? "none" : "876000h" // ~100 years = effectively indefinite
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, active });
}
