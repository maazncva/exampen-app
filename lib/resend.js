// Sends an email via Resend's API (no SDK needed, just fetch).
export async function sendEmail(to, subject, message) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "Exampen <onboarding@resend.dev>",
      to: [to],
      subject,
      text: message
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error (${res.status}): ${text}`);
  }
  return res.json();
}

// Used by the Courses Portal's device-verification system.
export async function sendAdminOtpEmail(subject, message) {
  const to = process.env.ADMIN_ALERT_EMAIL;
  if (!to) throw new Error("ADMIN_ALERT_EMAIL is not configured");
  return sendEmail(to, subject, message);
}
