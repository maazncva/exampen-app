"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

// Polls every 30s so a session that gets kicked out (logged in elsewhere,
// or an admin revoked this device) notices quickly instead of only on the
// next full page navigation.
//
// Skips entirely on /login: mid-login (especially during the OTP step) a
// device is legitimately "not approved yet" for a little while, and this
// check has no way to tell that apart from a real kick -- running it there
// would sign people out while they're still typing in their code.
export default function SessionGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/login") return;

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
  }, [router, pathname]);

  return null;
}
