const bcrypt = require("bcryptjs");
const db = require("../db");
const ApiError = require("../utils/ApiError");
const { signToken } = require("../utils/jwt");

// Public projection of a user (never leak the password hash).
function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  };
}

async function login(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    throw ApiError.badRequest("Email et mot de passe requis");
  }

  const user = await db.users.findByEmail(email);
  // Generic message on purpose — do not reveal whether the email exists.
  if (!user || !user.isActive) {
    throw ApiError.unauthorized("Identifiants invalides");
  }

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) {
    throw ApiError.unauthorized("Identifiants invalides");
  }

  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  res.json({ token, user: toPublicUser(user) });
}

// Stateless JWT — logout is handled client-side by discarding the token.
async function logout(_req, res) {
  res.status(204).end();
}

async function me(req, res) {
  const user = await db.users.findById(req.user.sub);
  if (!user) {
    throw ApiError.unauthorized("Utilisateur introuvable");
  }
  res.json({ user: toPublicUser(user) });
}

module.exports = { login, logout, me };
