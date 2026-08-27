const path = require("path");
const dotenv = require("dotenv");

// Load server-local .env first, then fall back to the repo-root .env.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const NODE_ENV = process.env.NODE_ENV || "development";

const config = {
  nodeEnv: NODE_ENV,
  isProduction: NODE_ENV === "production",
  port: Number(process.env.PORT || 3000),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  jwt: {
    secret: process.env.JWT_SECRET || "change-me-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  db: {
    // When DATABASE_URL is absent we fall back to an in-memory store so the
    // API boots out of the box for local development and demos.
    url: process.env.DATABASE_URL || "",
    // Supabase / managed Postgres usually require SSL.
    ssl: String(process.env.DATABASE_SSL || "").toLowerCase() === "true",
  },
  // Public URL of the frontend, used to build links embedded in emails
  // (password reset, etc.).
  appUrl: process.env.APP_URL || "http://localhost:5173",
  email: {
    // Resend (https://resend.com) — transactional email for password reset.
    resendApiKey: process.env.RESEND_API_KEY || "",
    from: process.env.EMAIL_FROM || "SSA <onboarding@resend.dev>",
  },
  // Object storage for report attachments (photo of the paper fiche).
  // Falls back to local disk (server/uploads) when absent — fine for local
  // dev, but NOT durable on Render's free tier (ephemeral filesystem), so
  // this must be set in production.
  storage: {
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || "",
    bucket: process.env.SUPABASE_STORAGE_BUCKET || "rapport-attachments",
  },
  // Web Push (VAPID) — browser push notifications, no third-party service
  // or per-message cost. Generate once with `npx web-push generate-vapid-keys`.
  push: {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || "",
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || "",
    vapidSubject: process.env.VAPID_SUBJECT || "mailto:contact@example.com",
  },
};

// Fail fast on a weak secret in production — reject the default and anything
// too short to be a meaningful secret.
if (config.isProduction) {
  const secret = config.jwt.secret;
  if (secret === "change-me-in-production" || secret.length < 32) {
    // eslint-disable-next-line no-console
    console.error(
      "FATAL: JWT_SECRET must be set to a strong random value (>= 32 chars) in production."
    );
    process.exit(1);
  }
}

module.exports = config;