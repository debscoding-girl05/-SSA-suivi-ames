const ApiError = require("../utils/ApiError");
const config = require("../config/env");

// 404 handler for unmatched routes.
function notFound(req, _res, next) {
  next(new ApiError(404, "NOT_FOUND", `Route introuvable: ${req.method} ${req.originalUrl}`));
}

// Central error handler — always responds with { code, message }.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const code = err.code || "INTERNAL_ERROR";
  const message =
    status >= 500 && config.isProduction ? "Erreur interne du serveur" : err.message;

  if (status >= 500) {
    console.error(err); // eslint-disable-line no-console
  }

  res.status(status).json({ code, message });
}

module.exports = { notFound, errorHandler };
