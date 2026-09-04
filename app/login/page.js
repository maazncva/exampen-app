"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

function LoginPageInner() {
  const [step, setStep] = useState("credentials"); // "credentials" | "otp"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const kicked = searchParams.get("kicked") === "1";

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setLoading(false);
      setError(signInError.message);
      return;
    }

    const res = await fetch("/api/auth/check-device", { method: "POST" });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error || "Something went wrong");
      return;
    }
    if (json.status === "ok") {
      router.push("/");
      router.refresh();
      return;
    }
    if (json.status === "otp_required") {
      setStep("otp");
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/verify-otp", { method: "POST", body: JSON.stringify({ code }) });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Invalid code");
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function handleResend() {
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/check-device", { method: "POST" });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) setError(json.error || "Couldn't resend the code");
  }

  if (step === "otp") {
    return (
      <div className="container" style={{ maxWidth: 400, paddingTop: 80 }}>
        <h1 style={{ marginBottom: 8 }}>Enter your code</h1>
        <p style={{ color: "#999", fontSize: 14, marginBottom: 24 }}>
          This is a new device. A code was sent to the admin — ask them for it.
        </p>
        <form onSubmit={handleVerifyOtp} className="card">
          {error && <div className="error">{error}</div>}
          <label>6-digit code</label>
          <input
            inputMode="numeric"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
          />
          <button type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Verifying..." : "Verify & log in"}
          </button>
        </form>
        <button className="btn-secondary" onClick={handleResend} disabled={loading} style={{ marginTop: 12, width: "100%" }}>
          Resend code
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 400, paddingTop: 80 }}>
      <h1 style={{ marginBottom: 24 }}>Sign in</h1>
      {kicked && (
        <div className="card" style={{ marginBottom: 16, borderColor: "#4f7cff" }}>
          You were signed out because this account logged in on another device.
        </div>
      )}
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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
