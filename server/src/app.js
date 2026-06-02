const express = require("express");
const cors = require("cors");
const config = require("./config/env");
const apiRoutes = require("./routes");
const healthRoutes = require("./routes/health");
const { notFound, errorHandler } = require("./middleware/error");

function createApp() {
  const app = express();

  // Bearer-token auth (Authorization header), not cookies — no credentials.
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());

  // Health check (unauthenticated, app root).
  app.use("/health", healthRoutes);

  // Versioned API surface.
  app.use("/api", apiRoutes);

  // 404 + central error handler (must be last).
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
