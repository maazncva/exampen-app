"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <button className="btn-secondary" onClick={logout}>
      Log out
    </button>
  );
}
