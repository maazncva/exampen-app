import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseServer";
import { sendEmail } from "@/lib/resend";

export async function POST(req) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient.from("profiles").select("id").eq("email", email).maybeSingle();

  // Don't reveal whether an email exists -- same response either way.
  if (!profile) return NextResponse.json({ status: "otp_sent" });

  await adminClient.from("doc_login_otps").update({ verified: true }).eq("email", email).eq("verified", false);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await adminClient.from("doc_login_otps").insert({ email, code, expires_at });

  try {
    await sendEmail(email, "Your Exampen document access code", `Your code is: ${code}\n\nThis code expires in 10 minutes.`);
  } catch (e) {
    return NextResponse.json({ error: "Couldn't send the email: " + e.message }, { status: 500 });
  }

  return NextResponse.json({ status: "otp_sent" });
}
