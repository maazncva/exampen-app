"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

// Polls every 30s so a session that gets kicked out (logged in elsewhere,
// or an admin revoked this device) notices quickly instead of only on the
// next full page navigation.
export default function SessionGuard() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/auth/session-status");
        const json = await res.json();
        if (!json.active) {
          const supabase = createClient();
          await supabase.auth.signOut();
          router.push("/login?kicked=1");
        }
      } catch {
        // network hiccup -- ignore, try again next tick
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [router]);

  return null;
}
