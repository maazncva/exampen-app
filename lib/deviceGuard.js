import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabaseServer";

// Call this on every protected page after confirming the user is logged in.
// It signs them out and bounces to /login if this browser isn't the
// account's currently-approved device (e.g. they got kicked because the
// account logged in somewhere else, or an admin marked this device untrusted).
export async function requireApprovedDevice(supabase, userId) {
  const deviceId = cookies().get("device_id")?.value;
  if (!deviceId) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  const adminClient = createAdminClient();
  const { data: session } = await adminClient
    .from("device_sessions")
    .select("trusted, is_current_session")
    .eq("user_id", userId)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (!session || !session.trusted || !session.is_current_session) {
    await supabase.auth.signOut();
    redirect("/login?kicked=1");
  }

  // Fire-and-forget last-seen touch, don't block the page on it.
  adminClient
    .from("device_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("device_id", deviceId)
    .then(() => {});
}
