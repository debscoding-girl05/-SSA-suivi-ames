const ApiError = require("./ApiError");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v) => (typeof v === "string" ? v.trim() : "");

// Assigné payload — { partial } for PUT (validate only provided fields).
function validateAssigne(body = {}, { partial = false } = {}) {
  const out = {};
  const has = (k) => body[k] !== undefined && body[k] !== null;

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
  if (has("phone")) out.phone = str(body.phone) || null;
  if (has("notes")) out.notes = str(body.notes) || null;

  return out;
}

// Dirigeant editable fields (profile bits an admin can adjust).
function validateDirigeant(body = {}) {
  const out = {};
  const has = (k) => body[k] !== undefined && body[k] !== null;
  if (has("fullName")) {
    const fullName = str(body.fullName);
    if (!fullName) throw ApiError.badRequest("Le nom est requis");
    out.fullName = fullName;
  }
  if (has("phone")) out.phone = str(body.phone) || null;
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
  return out;
}

// Weekly report submission.
function validateRapport(body = {}) {
  const presentCount = Number(body.presentCount);
  if (!Number.isInteger(presentCount) || presentCount < 0) {
    throw ApiError.badRequest("Le nombre de présents doit être un entier positif");
  }
  return {
    presentCount,
    absents: str(body.absents) || null,
    remarques: str(body.remarques) || null,
  };
}

module.exports = { validateAssigne, validateDirigeant, validateRapport };
