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
    phone: user.phone,
    role: user.role,
    departmentId: user.departmentId,
    departmentName: user.departmentName,
  };
}

// --- Brute-force lockout (CDC UC-01 E1 / ENF-15) ---------------------------
// Per-identifier failed-attempt tracking. In-memory (resets on restart) —
// sufficient for the MVP; replace with a store-backed counter for production.
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;
const attempts = new Map();

function isLocked(key) {
  const entry = attempts.get(key);
  return Boolean(entry && entry.lockedUntil && Date.now() < entry.lockedUntil);
}

function recordFailure(key) {
  const entry = attempts.get(key) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) entry.lockedUntil = Date.now() + LOCK_MS;
  attempts.set(key, entry);
}

function clearFailures(key) {
  attempts.delete(key);
}

async function login(req, res) {
  const { password } = req.body || {};
  const identifier = (req.body?.identifier || req.body?.email || "").trim();

  if (!identifier || !password) {
    throw ApiError.badRequest("Identifiant et mot de passe requis");
  }

  const key = identifier.toLowerCase();
  if (isLocked(key)) {
    throw new ApiError(429, "TOO_MANY_ATTEMPTS", "Trop de tentatives. Réessayez dans quelques minutes.");
  }

  const user = await db.users.findByIdentifier(identifier);
  // Generic message on purpose — never reveal whether the identifier exists.
  if (!user || !user.isActive) {
    recordFailure(key);
    throw ApiError.unauthorized("Identifiants invalides");
  }

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) {
    recordFailure(key);
    throw ApiError.unauthorized("Identifiants invalides");
  }

  clearFailures(key);
  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId ?? null,
  });
  res.json({ token, user: toPublicUser(user) });
}

// POST /api/auth/change-password — change own password (authenticated).
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    throw ApiError.badRequest("Mot de passe actuel et nouveau mot de passe requis");
  }
  if (String(newPassword).length < 6) {
    throw ApiError.badRequest("Le nouveau mot de passe doit contenir au moins 6 caractères");
  }

  const user = await db.users.findById(req.user.sub);
  if (!user) throw ApiError.unauthorized("Utilisateur introuvable");

  const ok = await bcrypt.compare(String(currentPassword), user.passwordHash);
  if (!ok) throw new ApiError(400, "WRONG_PASSWORD", "Mot de passe actuel incorrect");

  if (String(newPassword) === String(currentPassword)) {
    throw ApiError.badRequest("Le nouveau mot de passe doit être différent de l'actuel");
  }

  const passwordHash = await bcrypt.hash(String(newPassword), 12);
  await db.users.updatePassword(user.id, passwordHash);
  res.status(204).end();
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

module.exports = { login, logout, me, changePassword };
