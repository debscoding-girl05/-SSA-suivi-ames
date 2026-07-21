const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("../db");
const ApiError = require("../utils/ApiError");
const config = require("../config/env");
const { signToken } = require("../utils/jwt");
const { validatePasswordPolicy, validateForgotPassword, validateResetPassword } = require("../utils/validators");
const { sendEmail, passwordResetEmailHtml } = require("../utils/email");

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
  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  // Trace la tentative (réussie ou non) sans jamais bloquer la connexion sur
  // un échec d'écriture du journal (EF-08) — la sécurité de l'app ne doit
  // jamais dépendre de la disponibilité du log.
  const logAttempt = async (userId, reussie) => {
    try {
      await db.connexions.log({ identifiant: identifier, userId, reussie, ip, userAgent });
    } catch {
      /* le journal ne doit jamais faire échouer la connexion elle-même */
    }
  };

  if (!identifier || !password) {
    throw ApiError.badRequest("Identifiant et mot de passe requis");
  }

  const key = identifier.toLowerCase();
  if (isLocked(key)) {
    await logAttempt(null, false);
    throw new ApiError(429, "TOO_MANY_ATTEMPTS", "Trop de tentatives. Réessayez dans quelques minutes.");
  }

  const user = await db.users.findByIdentifier(identifier);
  // Generic message on purpose — never reveal whether the identifier exists.
  if (!user || !user.isActive) {
    recordFailure(key);
    await logAttempt(user?.id ?? null, false);
    throw ApiError.unauthorized("Identifiants invalides");
  }

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) {
    recordFailure(key);
    await logAttempt(user.id, false);
    throw ApiError.unauthorized("Identifiants invalides");
  }

  clearFailures(key);
  await logAttempt(user.id, true);
  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId ?? null,
  });
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

// POST /api/auth/change-password — every user may change their own password
// (CDC EF-04). Requires the current password to confirm identity.
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    throw ApiError.badRequest("Mot de passe actuel et nouveau mot de passe requis");
  }

  const user = await db.users.findById(req.user.sub);
  if (!user) throw ApiError.unauthorized("Utilisateur introuvable");

  const ok = await bcrypt.compare(String(currentPassword), user.passwordHash);
  if (!ok) throw ApiError.unauthorized("Mot de passe actuel incorrect");

  validatePasswordPolicy(newPassword);
  if (String(newPassword) === String(currentPassword)) {
    throw ApiError.badRequest("Le nouveau mot de passe doit être différent de l'ancien");
  }

  const passwordHash = await bcrypt.hash(String(newPassword), 12);
  await db.users.updatePassword(user.id, passwordHash);
  res.status(204).end();
}


// --- Réinitialisation de mot de passe (EF-06) -------------------------------
const RESET_TTL_MS = 60 * 60 * 1000; // 1 heure

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// POST /api/auth/forgot-password — PUBLIC. Toujours une réponse générique
// (204), qu'un compte existe ou non pour cet email : on ne révèle jamais
// si un email est enregistré (évite l'énumération de comptes).
async function forgotPassword(req, res) {
  const { email } = validateForgotPassword(req.body);

  const user = await db.users.findByEmail(email);
  if (user && user.isActive) {
    await db.passwordResets.invalidateAllForUser(user.id);

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + RESET_TTL_MS).toISOString();
    await db.passwordResets.create({ userId: user.id, tokenHash: hashResetToken(token), expiresAt });

    const link = `${config.appUrl}/reset-password/${token}`;
    await sendEmail({
      to: user.email,
      subject: "Réinitialisation de votre mot de passe — Suivi des Âmes",
      html: passwordResetEmailHtml(link),
    });
  }

  res.status(204).end();
}

// POST /api/auth/reset-password/:token — PUBLIC.
async function resetPassword(req, res) {
  const reset = await db.passwordResets.findByTokenHash(hashResetToken(req.params.token));
  if (!reset) throw ApiError.notFound("Ce lien de réinitialisation est invalide ou a déjà été utilisé");
  if (reset.usedAt) throw ApiError.badRequest("Ce lien de réinitialisation a déjà été utilisé");
  if (new Date(reset.expiresAt) < new Date()) {
    throw ApiError.badRequest("Ce lien de réinitialisation a expiré");
  }

  const { password } = validateResetPassword(req.body);

  const user = await db.users.findById(reset.userId);
  if (!user) throw ApiError.notFound("Utilisateur introuvable");

  const passwordHash = await bcrypt.hash(password, 12);
  await db.users.updatePassword(user.id, passwordHash);
  await db.passwordResets.markUsed(reset.id);

  res.status(204).end();
}

module.exports = { login, logout, me, changePassword, forgotPassword, resetPassword };