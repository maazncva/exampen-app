import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { createClient, createAdminClient } from "@/lib/supabaseServer";

const COOKIE_NAME = "doc_session";
const SESSION_DAYS = 14;

export async function createDocSession(profileId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires_at = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("doc_sessions").insert({ token, user_id: profileId, expires_at });
  if (error) throw new Error(error.message);

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: "/"
  });
}

// Returns the current viewer's profile if they're logged in EITHER via the
// full Courses Portal (password + device trust) OR this lightweight
// documents-only OTP login. Returns null if neither.
export async function getDocumentViewer() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("id, email, full_name").eq("id", user.id).single();
    if (profile) return profile;
  }

  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;

  const adminClient = createAdminClient();
  const { data: session } = await adminClient
    .from("doc_sessions")
    .select("*, profiles(id, email, full_name)")
    .eq("token", token)
    .maybeSingle();

  if (!session || new Date(session.expires_at) < new Date()) return null;
  return session.profiles;
}

export async function requireDocumentViewer() {
  const viewer = await getDocumentViewer();
  if (!viewer) redirect("/documents/login");
  return viewer;
}

export async function destroyDocSession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (token) {
    const adminClient = createAdminClient();
    await adminClient.from("doc_sessions").delete().eq("token", token);
  }
  cookies().set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}
