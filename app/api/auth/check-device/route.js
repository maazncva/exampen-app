import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { createClient, createAdminClient } from "@/lib/supabaseServer";
import { sendAdminOtpEmail } from "@/lib/resend";
import { parseDeviceLabel } from "@/lib/deviceLabel";

// Called right after a successful email/password sign-in. Decides whether
// this browser is already a trusted device (-> log straight in) or needs
// a code emailed to the admin first.
export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const cookieStore = cookies();
  let deviceId = cookieStore.get("device_id")?.value;
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    cookieStore.set("device_id", deviceId, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 730, // ~2 years
      path: "/"
    });
  }

  const deviceLabel = parseDeviceLabel(req.headers.get("user-agent"));
  const adminClient = createAdminClient();

  const { data: existing } = await adminClient
    .from("device_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (existing?.trusted) {
    // Known device: make it the one active session, kicking any others.
    await adminClient.from("device_sessions").update({ is_current_session: false }).eq("user_id", user.id);
    await adminClient
      .from("device_sessions")
      .update({ is_current_session: true, last_seen_at: new Date().toISOString(), device_label: deviceLabel })
      .eq("id", existing.id);
    return NextResponse.json({ status: "ok" });
  }

  if (!existing) {
    await adminClient.from("device_sessions").insert({
      user_id: user.id,
      device_id: deviceId,
      device_label: deviceLabel,
      trusted: false,
      is_current_session: false
    });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Invalidate any earlier unverified code for this device first, so there's
  // only ever one valid code at a time -- avoids the confusing case where an
  // admin reads an older email instead of the latest "resend" and the code
  // silently doesn't match.
  await adminClient
    .from("login_otps")
    .update({ verified: true })
    .eq("user_id", user.id)
    .eq("device_id", deviceId)
    .eq("verified", false);

  await adminClient.from("login_otps").insert({ user_id: user.id, device_id: deviceId, code, expires_at });

  try {
    await sendAdminOtpEmail(
      "New Exampen login code",
      `${user.email} is trying to log in on a new device (${deviceLabel}).\n\nCode: ${code}\n\nThis code expires in 10 minutes.`
    );
  } catch (e) {
    return NextResponse.json({ error: "Couldn't send the verification email: " + e.message }, { status: 500 });
  }

  return NextResponse.json({ status: "otp_required" });
}
