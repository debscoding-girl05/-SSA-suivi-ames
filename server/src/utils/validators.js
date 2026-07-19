const ApiError = require("./ApiError");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v) => (typeof v === "string" ? v.trim() : "");

// Password policy (CDC ENF-14): ≥8 chars, at least one uppercase letter, one
// digit, one special character. Throws with a precise, actionable message.
function validatePasswordPolicy(password) {
  const pwd = String(password || "");
  if (pwd.length < 8) throw ApiError.badRequest("Le mot de passe doit contenir au moins 8 caractères");
  if (!/[A-Z]/.test(pwd)) throw ApiError.badRequest("Le mot de passe doit contenir au moins une majuscule");
  if (!/[0-9]/.test(pwd)) throw ApiError.badRequest("Le mot de passe doit contenir au moins un chiffre");
  if (!/[^A-Za-z0-9]/.test(pwd)) throw ApiError.badRequest("Le mot de passe doit contenir au moins un caractère spécial");
  return pwd;
}

// EF-06 — mot de passe oublié : juste un email valide.
function validateForgotPassword(body = {}) {
  const email = str(body.email).toLowerCase();
  if (!EMAIL_RE.test(email)) throw ApiError.badRequest("Un email valide est requis");
  return { email };
}

// EF-06 — réinitialisation : nouveau mot de passe conforme ENF-14.
function validateResetPassword(body = {}) {
  const password = validatePasswordPolicy(body.password);
  return { password };
}

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
  if (has("dateNaissance")) out.dateNaissance = str(body.dateNaissance) || null;
  if (has("sexe")) {
    const sexe = str(body.sexe).toUpperCase();
    if (sexe && !["M", "F"].includes(sexe)) throw ApiError.badRequest("Sexe invalide (M ou F)");
    out.sexe = sexe || null;
  }
  if (has("adresse")) out.adresse = str(body.adresse) || null;
  if (has("zoneResidence")) out.zoneResidence = str(body.zoneResidence) || null;
  if (has("notes")) out.notes = str(body.notes) || null;

  return out;
}

// Dirigeant editable fields (profile bits an admin can adjust).
// Roles creatable via the API. "pasteur" is intentionally excluded — the
// super-admin account is provisioned once via the seed, never through the UI,
// to avoid privilege-escalation risk.
const CREATABLE_ROLES = ["pr", "leader", "encadreur", "leader_cellule"];
// Roles that must belong to a department.
const DEPARTMENT_REQUIRED_ROLES = ["leader", "encadreur"];

function validateNewDirigeant(body = {}) {
  const fullName = str(body.fullName);
  if (!fullName) throw ApiError.badRequest("Le nom est requis");

  const email = str(body.email).toLowerCase();
  if (!email || !EMAIL_RE.test(email)) throw ApiError.badRequest("Email invalide");

  const role = str(body.role);
  if (!CREATABLE_ROLES.includes(role)) {
    throw ApiError.badRequest(`Rôle invalide (attendu : ${CREATABLE_ROLES.join(", ")})`);
  }

  let departmentId = null;
  if (has(body, "departmentId") && body.departmentId !== "") {
    departmentId = Number(body.departmentId);
    if (!Number.isInteger(departmentId) || departmentId <= 0) {
      throw ApiError.badRequest("departmentId invalide");
    }
  }
  if (DEPARTMENT_REQUIRED_ROLES.includes(role) && !departmentId) {
    throw ApiError.badRequest("Un département est requis pour ce rôle");
  }

  return { fullName, email, phone: str(body.phone) || null, role, departmentId };
}

// Invitation creation payload — just email + role + department. The invited
// person supplies their own name/phone/password when accepting.
function validateInvitation(body = {}) {
  const email = str(body.email).toLowerCase();
  if (!email || !EMAIL_RE.test(email)) throw ApiError.badRequest("Email invalide");

  const role = str(body.role);
  if (!CREATABLE_ROLES.includes(role)) {
    throw ApiError.badRequest(`Rôle invalide (attendu : ${CREATABLE_ROLES.join(", ")})`);
  }

  let departmentId = null;
  if (has(body, "departmentId") && body.departmentId !== "") {
    departmentId = Number(body.departmentId);
    if (!Number.isInteger(departmentId) || departmentId <= 0) {
      throw ApiError.badRequest("departmentId invalide");
    }
  }
  if (DEPARTMENT_REQUIRED_ROLES.includes(role) && !departmentId) {
    throw ApiError.badRequest("Un département est requis pour ce rôle");
  }

  return { email, role, departmentId };
}

// Invitation acceptance payload — the invited person completes their profile.
function validateAcceptInvitation(body = {}) {
  const fullName = str(body.fullName);
  if (!fullName) throw ApiError.badRequest("Le nom est requis");

  const phone = str(body.phone);
  if (!phone || phone.replace(/\D/g, "").length < 6) {
    throw ApiError.badRequest("Un numéro de téléphone valide est requis");
  }

  const password = validatePasswordPolicy(body.password);

  return { fullName, phone, password };
}

function has(body, key) {
  return body[key] !== undefined && body[key] !== null;
}

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

module.exports = { validateAssigne, validateDirigeant, validateNewDirigeant, validateInvitation, validateAcceptInvitation, validatePasswordPolicy, validateForgotPassword, validateResetPassword, validateRapport };