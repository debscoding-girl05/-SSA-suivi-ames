const ApiError = require("./ApiError");

const STATUSES = ["nouveau", "actif", "inactif"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Validates + normalizes a member payload.
 * @param {object} body
 * @param {boolean} partial - when true (PUT), only validates provided fields.
 * @returns normalized object containing only provided/valid fields.
 */
function validateMember(body = {}, { partial = false } = {}) {
  const out = {};
  const has = (key) => body[key] !== undefined && body[key] !== null;

  if (!partial || has("firstName")) {
    const firstName = str(body.firstName);
    if (!firstName) throw ApiError.badRequest("Le prénom est requis");
    out.firstName = firstName;
  }
  if (!partial || has("lastName")) {
    const lastName = str(body.lastName);
    if (!lastName) throw ApiError.badRequest("Le nom est requis");
    out.lastName = lastName;
  }
  if (has("email")) {
    const email = str(body.email);
    if (email && !EMAIL_RE.test(email)) throw ApiError.badRequest("Email invalide");
    out.email = email || null;
  }
  if (has("phone")) {
    out.phone = str(body.phone) || null;
  }
  if (has("departmentId")) {
    if (body.departmentId === "" || body.departmentId === null) {
      out.departmentId = null;
    } else {
      const departmentId = Number(body.departmentId);
      if (!Number.isInteger(departmentId) || departmentId <= 0) {
        throw ApiError.badRequest("departmentId invalide");
      }
      out.departmentId = departmentId;
    }
  }
  if (has("status")) {
    if (!STATUSES.includes(body.status)) {
      throw ApiError.badRequest(`status doit être l'un de : ${STATUSES.join(", ")}`);
    }
    out.status = body.status;
  }
  if (has("notes")) {
    out.notes = str(body.notes) || null;
  }

  return out;
}

module.exports = { validateMember, STATUSES };
