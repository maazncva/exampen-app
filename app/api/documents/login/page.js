"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DocumentsLoginPage() {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRequestOtp(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/documents/request-otp", { method: "POST", body: JSON.stringify({ email }) });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) return setError(json.error || "Something went wrong");
    setStep("otp");
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/documents/verify-otp", { method: "POST", body: JSON.stringify({ email, code }) });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) return setError(json.error || "Invalid code");
    router.push("/documents");
    router.refresh();
  }

  return (
    <div className="container" style={{ maxWidth: 400, paddingTop: 80 }}>
      <h1 style={{ marginBottom: 24 }}>Document Access</h1>

      {step === "email" && (
        <form onSubmit={handleRequestOtp} className="card">
          {error && <div className="error">{error}</div>}
          <label>Your email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Sending code..." : "Send access code"}
          </button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={handleVerify} className="card">
          {error && <div className="error">{error}</div>}
          <p style={{ color: "#999", fontSize: 13, marginTop: 0 }}>We emailed a 6-digit code to {email}.</p>
          <label>Code</label>
          <input
            inputMode="numeric"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
          />
          <button type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Verifying..." : "View my documents"}
          </button>
        </form>
      )}
    </div>
  );
}
