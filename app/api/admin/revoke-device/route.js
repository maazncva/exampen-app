import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabaseServer";

async function requireAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

// Marks a device untrusted, so its next request gets signed out and its
// next login requires a fresh code.
export async function POST(req) {
  const supabase = createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { deviceSessionId } = await req.json();
  if (!deviceSessionId) return NextResponse.json({ error: "deviceSessionId required" }, { status: 400 });

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("device_sessions")
    .update({ trusted: false, is_current_session: false })
    .eq("id", deviceSessionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
