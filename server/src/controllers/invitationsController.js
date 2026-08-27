const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("../db");
const ApiError = require("../utils/ApiError");
const { validateInvitation, validateAcceptInvitation } = require("../utils/validators");
const { signToken } = require("../utils/jwt");
const { sendEmail, invitationEmailHtml } = require("../utils/email");
const config = require("../config/env");

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// POST /api/invitations — Pasteur/PR only. Creates an invitation and returns
// the raw one-time token (never stored in plaintext) so the frontend can
// build a shareable link. There is no email/SMS infrastructure yet, so the
// admin communicates the link manually (WhatsApp, SMS, etc.).
async function create(req, res) {
  const payload = validateInvitation(req.body);

  const existingUser = await db.users.findByEmail(payload.email);
  if (existingUser) throw ApiError.conflict("Un compte existe déjà avec cet email");

  // Un seul lien d'invitation actif par email à la fois, tous
  // départements/rôles confondus (évite d'inviter la même personne deux fois
  // pour deux postes différents pendant que le premier lien est encore valide).
  const pending = await db.invitations.findPendingByEmail(payload.email);
  if (pending) {
    if (new Date(pending.expiresAt) < new Date()) {
      await db.invitations.setStatus(pending.id, "expired");
    } else {
      throw ApiError.conflict(
        `Une invitation est déjà en attente pour cet email (${pending.role}${pending.departmentName ? " · " + pending.departmentName : ""}). Révoque-la d'abord si tu veux changer le poste.`
      );
    }
  }

  let departmentName = null;
  if (payload.departmentId) {
    const dept = await db.departments.findById(payload.departmentId);
    if (!dept) throw ApiError.badRequest("Département introuvable");
    departmentName = dept.name;
  }

  const role = await db.roles.findByName(payload.role);
  if (!role) throw ApiError.badRequest("Rôle introuvable");

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS).toISOString();

  const invitation = await db.invitations.create({
    email: payload.email,
    role: payload.role,
    departmentId: payload.departmentId,
    invitedBy: req.user.sub,
    tokenHash: hashToken(token),
    expiresAt,
  });

  // Best-effort : l'admin garde de toute façon le lien (copier / WhatsApp /
  // SMS) affiché côté client, donc un échec d'envoi ne doit jamais faire
  // échouer la création de l'invitation elle-même.
  const link = `${config.appUrl}/invitation/${token}`;
  sendEmail({
    to: payload.email,
    subject: "Invitation — Suivi des Âmes",
    html: invitationEmailHtml({ link, role: payload.role, departmentName }),
  }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error(`[invitation] échec de l'envoi de l'email à ${payload.email}:`, error.message);
  });

  res.status(201).json({ ...invitation, token });
}

// GET /api/invitations — Pasteur/PR only. Pending invitations, for follow-up
// (resend the link, or revoke).
async function list(_req, res) {
  const data = await db.invitations.listPending();
  res.json({ data });
}

// DELETE /api/invitations/:id — Pasteur/PR only. Revokes a pending invitation;
// the link stops working immediately.
async function revoke(req, res) {
  const invitation = await db.invitations.findById(req.params.id);
  if (!invitation) throw ApiError.notFound("Invitation introuvable");
  if (invitation.status !== "pending") throw ApiError.badRequest("Cette invitation n'est plus en attente");

  await db.invitations.setStatus(invitation.id, "revoked");
  res.status(204).end();
}

// GET /api/invitations/token/:token — PUBLIC. Lets the invited person see
// what they're accepting before submitting the form. Returns only the
// non-sensitive subset (email, role, department).
async function getByToken(req, res) {
  const invitation = await db.invitations.findByTokenHash(hashToken(req.params.token));
  if (!invitation) throw ApiError.notFound("Invitation introuvable ou déjà utilisée");

  if (invitation.status === "accepted") throw ApiError.badRequest("Cette invitation a déjà été utilisée");
  if (invitation.status === "revoked") throw ApiError.badRequest("Cette invitation a été révoquée");
  if (new Date(invitation.expiresAt) < new Date()) {
    if (invitation.status === "pending") await db.invitations.setStatus(invitation.id, "expired");
    throw ApiError.badRequest("Cette invitation a expiré");
  }

  res.json({
    email: invitation.email,
    role: invitation.role,
    departmentName: invitation.departmentName,
  });
}

// POST /api/invitations/token/:token/accept — PUBLIC. Creates the account
// and logs the person in immediately (same JWT shape as a normal login).
async function accept(req, res) {
  const invitation = await db.invitations.findByTokenHash(hashToken(req.params.token));
  if (!invitation) throw ApiError.notFound("Invitation introuvable ou déjà utilisée");
  if (invitation.status !== "pending") throw ApiError.badRequest("Cette invitation n'est plus valide");
  if (new Date(invitation.expiresAt) < new Date()) {
    await db.invitations.setStatus(invitation.id, "expired");
    throw ApiError.badRequest("Cette invitation a expiré");
  }

  const payload = validateAcceptInvitation(req.body);

  // Defensive re-check: the email could have been registered since the
  // invitation was created (e.g. created directly by an admin meanwhile).
  const existingUser = await db.users.findByEmail(invitation.email);
  if (existingUser) throw ApiError.conflict("Un compte existe déjà avec cet email");

  const role = await db.roles.findByName(invitation.role);
  if (!role) throw ApiError.badRequest("Rôle introuvable");

  const passwordHash = await bcrypt.hash(payload.password, 12);
  const user = await db.users.create({
    email: invitation.email,
    passwordHash,
    fullName: payload.fullName,
    phone: payload.phone,
    roleId: role.id,
    departmentId: invitation.departmentId,
  });

  await db.invitations.setStatus(invitation.id, "accepted", { acceptedAt: new Date().toISOString() });

  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId ?? null,
  });

  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      departmentId: user.departmentId,
      departmentName: user.departmentName,
    },
  });
}

module.exports = { create, list, revoke, getByToken, accept };