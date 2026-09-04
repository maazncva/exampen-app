import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabaseServer";

export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const deviceId = cookies().get("device_id")?.value;
  if (!deviceId) return NextResponse.json({ error: "Missing device info — please try logging in again" }, { status: 400 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const adminClient = createAdminClient();
  const { data: otp } = await adminClient
    .from("login_otps")
    .select("*")
    .eq("user_id", user.id)
    .eq("device_id", deviceId)
    .eq("verified", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp || otp.code !== code || new Date(otp.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  await adminClient.from("login_otps").update({ verified: true }).eq("id", otp.id);
  await adminClient.from("device_sessions").update({ is_current_session: false }).eq("user_id", user.id);
  await adminClient
    .from("device_sessions")
    .update({ trusted: true, is_current_session: true, last_seen_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("device_id", deviceId);

  return NextResponse.json({ status: "ok" });
}
