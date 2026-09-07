import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseServer";
import { createDocSession } from "@/lib/docSession";

export async function POST(req) {
  const { email, code } = await req.json();
  if (!email || !code) return NextResponse.json({ error: "Email and code required" }, { status: 400 });

  const adminClient = createAdminClient();

  const { data: otp } = await adminClient
    .from("doc_login_otps")
    .select("*")
    .eq("email", email)
    .eq("verified", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp || otp.code !== code || new Date(otp.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  const { data: profile } = await adminClient.from("profiles").select("id").eq("email", email).maybeSingle();
  if (!profile) return NextResponse.json({ error: "No account found for this email" }, { status: 404 });

  await adminClient.from("doc_login_otps").update({ verified: true }).eq("id", otp.id);
  await createDocSession(profile.id);

  return NextResponse.json({ status: "ok" });
}
