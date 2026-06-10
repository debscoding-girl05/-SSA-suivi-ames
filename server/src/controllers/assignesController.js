const db = require("../db");
const ApiError = require("../utils/ApiError");
const { validateAssigne } = require("../utils/validators");

const isAdmin = (role) => db.ADMIN_ROLES.includes(role);

async function loadDirigeant(id) {
  const dirigeant = await db.dirigeants.findById(id);
  if (!dirigeant || isAdmin(dirigeant.role)) throw ApiError.notFound("Dirigeant introuvable");
  return dirigeant;
}

// View: Pasteur/PR (all), the dirigeant himself, or a leader of the same department.
function canView(user, dirigeant) {
  if (isAdmin(user.role)) return true;
  if (user.sub === dirigeant.id) return true;
  if (user.role === "leader") {
    return user.departmentId != null && dirigeant.departmentId === user.departmentId;
  }
  return false;
}

// Manage (write): Pasteur/PR, the dirigeant himself, or a leader of the same dept.
function ensureCanManage(user, dirigeant) {
  if (canView(user, dirigeant)) return; // same matrix as view for assignés (CDC EF-14/15)
  throw ApiError.forbidden("Vous ne pouvez gérer que vos propres assignés");
}

// GET /api/dirigeants/:id/assignes
async function list(req, res) {
  const dirigeant = await loadDirigeant(req.params.id);
  if (!canView(req.user, dirigeant)) throw ApiError.forbidden("Accès refusé");
  const data = await db.assignes.listByDirigeant(req.params.id);
  res.json({ data });
}

// POST /api/dirigeants/:id/assignes
async function create(req, res) {
  const dirigeant = await loadDirigeant(req.params.id);
  ensureCanManage(req.user, dirigeant);
  const payload = validateAssigne(req.body, { partial: false });
  const assigne = await db.assignes.create({ ...payload, dirigeantId: req.params.id });
  res.status(201).json(assigne);
}

// PUT /api/dirigeants/:id/assignes/:assigneId
async function update(req, res) {
  const dirigeant = await loadDirigeant(req.params.id);
  ensureCanManage(req.user, dirigeant);
  const assigne = await db.assignes.findById(req.params.assigneId);
  if (!assigne || assigne.dirigeantId !== req.params.id) throw ApiError.notFound("Assigné introuvable");
  const payload = validateAssigne(req.body, { partial: true });
  const updated = await db.assignes.update(req.params.assigneId, payload);
  res.json(updated);
}

// DELETE /api/dirigeants/:id/assignes/:assigneId
async function remove(req, res) {
  const dirigeant = await loadDirigeant(req.params.id);
  ensureCanManage(req.user, dirigeant);
  const assigne = await db.assignes.findById(req.params.assigneId);
  if (!assigne || assigne.dirigeantId !== req.params.id) throw ApiError.notFound("Assigné introuvable");
  await db.assignes.remove(req.params.assigneId);
  res.status(204).end();
}

module.exports = { list, create, update, remove };
