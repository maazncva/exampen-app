import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabaseServer";

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

  const { userId, full_name, phone } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const adminClient = createAdminClient();
  const { data: profile, error } = await adminClient
    .from("profiles")
    .update({ full_name, phone })
    .eq("id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile });
}
