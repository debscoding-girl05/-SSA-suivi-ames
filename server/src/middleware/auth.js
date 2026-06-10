const ApiError = require("../utils/ApiError");
const { verifyToken } = require("../utils/jwt");

/**
 * JWT auth middleware. Expects `Authorization: Bearer <token>`.
 * On success, attaches the decoded payload to `req.user`.
 */
function requireAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(ApiError.unauthorized("En-tête Authorization Bearer manquant"));
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch (error) {
    return next(ApiError.unauthorized("Token invalide ou expiré"));
  }
}

/**
 * Role guard — use after requireAuth. `requireRole("pasteur", "pr")`.
 */
function requireRole(...allowed) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowed.includes(req.user.role)) {
      return next(ApiError.forbidden("Rôle insuffisant pour cette action"));
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
