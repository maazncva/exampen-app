import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Use this inside Server Components, Route Handlers, and Server Actions.
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // called from a Server Component - safe to ignore, middleware handles refresh
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {}
        }
      }
    }
  );
}

// Admin client - service role key, server-only, NEVER expose to the browser.
// Used only for admin actions like creating user logins.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
