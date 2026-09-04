import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabaseServer";

// Polled every so often by logged-in pages so a kicked-out session notices
// quickly instead of only on the next full page navigation.
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ active: true }); // nothing to check if not logged in

  const deviceId = cookies().get("device_id")?.value;
  if (!deviceId) return NextResponse.json({ active: false });

  const adminClient = createAdminClient();
  const { data: session } = await adminClient
    .from("device_sessions")
    .select("trusted, is_current_session")
    .eq("user_id", user.id)
    .eq("device_id", deviceId)
    .maybeSingle();

  const active = !!(session && session.trusted && session.is_current_session);
  return NextResponse.json({ active });
}
