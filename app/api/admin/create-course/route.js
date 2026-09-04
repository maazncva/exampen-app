import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

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

  const { title, description, thumbnail_url } = await req.json();
  if (!title || !thumbnail_url) {
    return NextResponse.json({ error: "Title and thumbnail are required" }, { status: 400 });
  }

  const { data: course, error } = await supabase
    .from("courses")
    .insert({ title, description, thumbnail_url })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ course });
}
