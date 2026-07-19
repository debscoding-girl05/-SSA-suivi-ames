const config = require("../config/env");

// Minimal Resend client using the built-in fetch (Node 18+) — no extra
// dependency needed. https://resend.com/docs/api-reference/emails/send-email
//
// If RESEND_API_KEY is not configured, we log the email to the console
// instead of throwing, so local/dev environments keep working without an
// API key (the reset link will simply show up in the server logs).
async function sendEmail({ to, subject, html }) {
  if (!config.email.resendApiKey) {
    // eslint-disable-next-line no-console
    console.warn(
      `[email] RESEND_API_KEY absent — email non envoyé. Destinataire: ${to} | Sujet: ${subject}\n${html}`
    );
    return { skipped: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.email.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.email.from,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    // eslint-disable-next-line no-console
    console.error(`[email] Échec d'envoi Resend (${response.status}): ${body}`);
    throw new Error("Échec de l'envoi de l'email");
  }

  return response.json();
}

function passwordResetEmailHtml(link) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Réinitialisation de votre mot de passe</h2>
      <p>Vous avez demandé à réinitialiser votre mot de passe sur l'application Suivi des Âmes.</p>
      <p>
        <a href="${link}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;
           text-decoration:none;border-radius:8px;">Réinitialiser mon mot de passe</a>
      </p>
      <p>Ce lien est valable 1 heure et ne peut être utilisé qu'une seule fois.</p>
      <p>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.</p>
    </div>
  `;
}

module.exports = { sendEmail, passwordResetEmailHtml };