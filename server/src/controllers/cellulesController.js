const db = require("../db");
const ApiError = require("../utils/ApiError");
const { validateCellule, validateFicheCellule } = require("../utils/validators");
const { parseWeek } = require("../utils/week");

const isAdmin = (role) => db.ADMIN_ROLES.includes(role);

// Scope for listing cellules: admin sees all, leader sees own department,
// leader_cellule sees only their own cellule (handled in findOwn/canManage).
function scopeFor(user) {
  if (isAdmin(user.role)) return undefined;
  if (user.role === "leader") return { departmentId: user.departmentId ?? -1 };
  if (user.role === "leader_cellule") return { leaderId: user.sub };
  return { leaderId: user.sub };
}

// Can `user` create/edit/delete cellules in general (department admin power)?
function canManageCellules(user) {
  return isAdmin(user.role) || user.role === "leader";
}

// Can `user` manage this specific cellule (edit info, review its fiche)?
function canManageCellule(user, cellule) {
  if (isAdmin(user.role)) return true;
  if (user.role === "leader") return user.departmentId != null && cellule.departmentId === user.departmentId;
  return false;
}

// Can `user` submit the weekly fiche for this cellule (its own leader_cellule)?
function canSubmitFiche(user, cellule) {
  if (cellule.leaderId === user.sub) return true;
  return canManageCellule(user, cellule);
}

// GET /api/cellules — list, scoped by role.
async function list(req, res) {
  const cellules = await db.cellules.list({ scope: scopeFor(req.user) });
  res.json(cellules);
}

// GET /api/cellules/:id — detail + members.
async function getOne(req, res) {
  const cellule = await db.cellules.findById(req.params.id);
  if (!cellule) throw ApiError.notFound("Cellule introuvable");
  if (!isAdmin(req.user.role) && !canManageCellule(req.user, cellule) && cellule.leaderId !== req.user.sub) {
    throw ApiError.forbidden("Accès refusé");
  }
  const members = await db.cellules.listMembers(cellule.id);
  res.json({ ...cellule, members });
}

// POST /api/cellules — create (admin or leader of the target department).
async function create(req, res) {
  if (!canManageCellules(req.user)) throw ApiError.forbidden("Vous ne pouvez pas créer de cellule");
  const payload = validateCellule(req.body);

  if (req.user.role === "leader") {
    // A leader can only create cellules within their own department.
    payload.departmentId = req.user.departmentId ?? null;
  }
  if (payload.leaderId) {
    const leader = await db.dirigeants.findById(payload.leaderId);
    if (!leader) throw ApiError.badRequest("Leader de cellule invalide");
  }

  const cellule = await db.cellules.create(payload);
  res.status(201).json(cellule);
}

// PUT /api/cellules/:id — update.
async function update(req, res) {
  const cellule = await db.cellules.findById(req.params.id);
  if (!cellule) throw ApiError.notFound("Cellule introuvable");
  if (!canManageCellule(req.user, cellule)) throw ApiError.forbidden("Vous ne pouvez pas modifier cette cellule");

  const payload = validateCellule(req.body, { partial: true });
  const updated = await db.cellules.update(req.params.id, payload);
  res.json(updated);
}

// DELETE /api/cellules/:id — soft delete (mark inactive) rather than a hard
// delete, so past fiches remain intact for historical reports.
async function remove(req, res) {
  const cellule = await db.cellules.findById(req.params.id);
  if (!cellule) throw ApiError.notFound("Cellule introuvable");
  if (!canManageCellule(req.user, cellule)) throw ApiError.forbidden("Vous ne pouvez pas désactiver cette cellule");

  await db.cellules.update(req.params.id, { actif: false });
  res.status(204).end();
}

// GET /api/cellules/:id/fiche?year&week — the cellule's weekly fiche.
async function getFiche(req, res) {
  const cellule = await db.cellules.findById(req.params.id);
  if (!cellule) throw ApiError.notFound("Cellule introuvable");
  if (!canSubmitFiche(req.user, cellule)) throw ApiError.forbidden("Accès refusé");

  const { year, week } = parseWeek(req.query);
  const fiche = await db.cellules.findFicheByCelluleWeek(cellule.id, year, week);
  res.json({ week: { year, week }, fiche });
}

// POST /api/cellules/:id/fiche — submit/save the weekly fiche.
async function submitFiche(req, res) {
  const cellule = await db.cellules.findById(req.params.id);
  if (!cellule) throw ApiError.notFound("Cellule introuvable");
  if (!canSubmitFiche(req.user, cellule)) throw ApiError.forbidden("Vous ne pouvez pas soumettre cette fiche");

  const { year, week } = parseWeek(req.body);
  const status = req.body.status === "brouillon" ? "brouillon" : "soumis";
  const payload = validateFicheCellule(req.body);

  const fiche = await db.cellules.submitFiche({ celluleId: cellule.id, year, week, status, ...payload });
  res.status(201).json(fiche);
}

// POST /api/cellules/:id/fiche/:ficheId/validate — mark the fiche validated
// (remontée au département). Reserved to admin or the department's leader.
async function validateFiche(req, res) {
  const cellule = await db.cellules.findById(req.params.id);
  if (!cellule) throw ApiError.notFound("Cellule introuvable");
  if (!canManageCellule(req.user, cellule)) throw ApiError.forbidden("Vous ne pouvez pas valider cette fiche");

  const fiche = await db.cellules.findFicheById(req.params.ficheId);
  if (!fiche || fiche.celluleId !== cellule.id) throw ApiError.notFound("Fiche introuvable");
  if (fiche.status !== "soumis") throw ApiError.badRequest("Cette fiche n'est pas soumise");

  const validated = await db.cellules.validateFiche(fiche.id);
  res.json(validated);
}

module.exports = { list, getOne, create, update, remove, getFiche, submitFiche, validateFiche };