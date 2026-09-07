"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function DocumentsLoginPage() {
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
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push("/documents");
    router.refresh();
  }

  return (
    <div className="container" style={{ maxWidth: 400, paddingTop: 80 }}>
      <h1 style={{ marginBottom: 24 }}>Document Access</h1>
      <form onSubmit={handleLogin} className="card">
        {error && <div className="error">{error}</div>}
        <label>Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Password</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Signing in..." : "View my documents"}
        </button>
      </form>
      <p style={{ color: "#888", fontSize: 13, marginTop: 16 }}>
        Use the same email and password as your Courses Portal login.
      </p>
    </div>
  );
}
