// Typed error carrying an HTTP status + machine code, matching the OpenAPI
// Error schema ({ code, message }).
class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }

  static unauthorized(message = "Token invalide ou expiré") {
    return new ApiError(401, "UNAUTHORIZED", message);
  }

  static badRequest(message = "Requête invalide") {
    return new ApiError(400, "BAD_REQUEST", message);
  }

  static forbidden(message = "Accès refusé") {
    return new ApiError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Ressource introuvable") {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static serviceUnavailable(message = "Service indisponible") {
    return new ApiError(503, "SERVICE_UNAVAILABLE", message);
  }
}

module.exports = ApiError;
