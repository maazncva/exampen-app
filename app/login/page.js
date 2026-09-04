"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="container" style={{ maxWidth: 400, paddingTop: 80 }}>
      <h1 style={{ marginBottom: 24 }}>Sign in</h1>
      <form onSubmit={handleLogin} className="card">
        {error && <div className="error">{error}</div>}
        <label>Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Password</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p style={{ color: "#888", fontSize: 13, marginTop: 16 }}>
        Accounts are created by the admin — there's no public signup here.
      </p>
    </div>
  );
}
