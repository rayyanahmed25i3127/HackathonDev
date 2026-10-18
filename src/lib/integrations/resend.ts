import "server-only";

export type LeadAlertType = "overdue" | "reassigned";

/** Sends an email only when explicitly called from server-side code. */
export async function sendLeadAlertEmail(
  recipientEmail: string,
  leadName: string,
  alertType: LeadAlertType,
  message: string,
): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  if (!recipientEmail.trim() || !leadName.trim() || !message.trim()) {
    throw new Error("Recipient email, lead name, and message are required.");
  }

  if (alertType !== "overdue" && alertType !== "reassigned") {
    throw new Error("Unsupported lead alert type.");
  }

  const subjectLeadName = leadName.replace(/[\r\n]+/g, " ").trim();
  let response: Response;

  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipientEmail.trim()],
        subject: `HackathonDev - Lead ${alertType}: ${subjectLeadName}`,
        text: `Lead: ${leadName.trim()}\nAlert: ${alertType}\n\n${message}`,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    // Do not expose request headers or underlying errors containing credentials.
    // A network failure may occur after acceptance; do not retry automatically.
    throw new Error(
      "Unable to confirm email submission. Check Resend before retrying.",
    );
  }

  if (!response.ok) {
    // Never include the provider response body, which may contain sensitive data.
    throw new Error(`Resend rejected the email (HTTP ${response.status}).`);
  }

  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      "Resend returned an unreadable response. Check Resend before retrying.",
    );
  }

  if (
    typeof result !== "object" ||
    result === null ||
    !("id" in result) ||
    typeof result.id !== "string" ||
    !result.id
  ) {
    throw new Error(
      "Resend returned no email ID. Check Resend before retrying.",
    );
  }

  return { id: result.id };
}
