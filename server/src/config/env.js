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
