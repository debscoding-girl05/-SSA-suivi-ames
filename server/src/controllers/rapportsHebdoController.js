const db = require("../db");
const ApiError = require("../utils/ApiError");
const { parseWeek, currentWeek } = require("../utils/week");
const { streamRapportHebdoPdf, RENDERERS } = require("../utils/rapportHebdoPdf");

const isAdmin = (role) => db.ADMIN_ROLES.includes(role);

// Types de fiches pris en charge (un modèle par département/rôle).
const TYPES = new Set(Object.keys(RENDERERS));

function scopeFor(user) {
  if (isAdmin(user.role)) return undefined; // Pasteur/PR voient tout
  return { authorId: user.sub };
}

function canRead(user, rapport) {
  if (isAdmin(user.role)) return true;
  return rapport.authorId === user.sub;
}

// GET /api/rapports-hebdo?type&year&week
async function list(req, res) {
  const { type, year, week } = req.query;
  const data = await db.rapportsHebdo.list({
    type: type || undefined,
    year: year || undefined,
    week: week || undefined,
    scope: scopeFor(req.user),
  });
  res.json({ data });
}

// GET /api/rapports-hebdo/:id
async function getOne(req, res) {
  const rapport = await db.rapportsHebdo.findById(req.params.id);
  if (!rapport) throw ApiError.notFound("Rapport introuvable");
  if (!canRead(req.user, rapport)) throw ApiError.forbidden("Accès refusé");
  res.json(rapport);
}

// POST /api/rapports-hebdo — crée un rapport (brouillon ou soumis).
async function create(req, res) {
  const type = String(req.body.type || "");
  if (!TYPES.has(type)) throw ApiError.badRequest("Type de rapport inconnu");

  const { year, week } = req.body.year && req.body.week ? parseWeek(req.body) : currentWeek();
  const entete = req.body.entete && typeof req.body.entete === "object" ? req.body.entete : {};
  const lignes = Array.isArray(req.body.lignes) ? req.body.lignes : [];
  const status = req.body.status === "soumis" ? "soumis" : "brouillon";

  const rapport = await db.rapportsHebdo.create({
    type,
    authorId: req.user.sub,
    departmentId: req.body.departmentId ?? req.user.departmentId ?? null,
    year, week, entete, lignes, status,
  });
  res.status(201).json(rapport);
}

async function loadOwnEditable(req) {
  const rapport = await db.rapportsHebdo.findById(req.params.id);
  if (!rapport) throw ApiError.notFound("Rapport introuvable");
  if (rapport.authorId !== req.user.sub && !isAdmin(req.user.role)) {
    throw ApiError.forbidden("Vous ne pouvez modifier que vos propres rapports");
  }
  return rapport;
}

// PUT /api/rapports-hebdo/:id — met à jour l'en-tête / les lignes / le statut.
async function update(req, res) {
  const rapport = await loadOwnEditable(req);
  const fields = {};
  if (req.body.entete !== undefined) fields.entete = req.body.entete;
  if (req.body.lignes !== undefined) fields.lignes = Array.isArray(req.body.lignes) ? req.body.lignes : [];
  if (req.body.status !== undefined) {
    if (!["brouillon", "soumis", "valide"].includes(req.body.status)) {
      throw ApiError.badRequest("Statut invalide");
    }
    fields.status = req.body.status;
  }
  const updated = await db.rapportsHebdo.update(req.params.id, fields);
  res.json(updated);
}

// DELETE /api/rapports-hebdo/:id
async function remove(req, res) {
  await loadOwnEditable(req);
  await db.rapportsHebdo.remove(req.params.id);
  res.status(204).end();
}

// GET /api/rapports-hebdo/:id/pdf
async function pdf(req, res) {
  const rapport = await db.rapportsHebdo.findById(req.params.id);
  if (!rapport) throw ApiError.notFound("Rapport introuvable");
  if (!canRead(req.user, rapport)) throw ApiError.forbidden("Accès refusé");
  streamRapportHebdoPdf(rapport, res);
}

module.exports = { list, getOne, create, update, remove, pdf };