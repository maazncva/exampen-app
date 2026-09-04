import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { listBunnyVideos } from "@/lib/bunny";

async function requireAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

export async function GET() {
  const supabase = createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  try {
    const videos = await listBunnyVideos();
    return NextResponse.json({ videos });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
