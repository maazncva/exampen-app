// Sends an email to the admin via Resend's API (no SDK needed, just fetch).
export async function sendAdminOtpEmail(subject, message) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_ALERT_EMAIL;

  if (!apiKey || !to) {
    throw new Error("Resend environment variables are not fully configured");
  }

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
