const db = require("../db");
const ApiError = require("../utils/ApiError");
const { validateAssigne } = require("../utils/validators");

const isAdmin = (role) => db.ADMIN_ROLES.includes(role);

async function isFdDept(departmentId) {
  if (departmentId == null) return false;
  const dept = await db.departments.findById(departmentId);
  return Boolean(dept && db.FD_DEPT_NAMES.includes(dept.name));
}

// Read scope (within FD/Suivi): admin → all ; leader → son dépt ; encadreur → soi.
function scopeFor(user) {
  if (isAdmin(user.role)) return undefined;
  if (user.role === "leader") return { departmentId: user.departmentId ?? -1 };
  return { dirigeantId: user.sub };
}

function canManageVenu(user, assigne, dirigeant) {
  if (isAdmin(user.role)) return true;
  if (user.sub === assigne.dirigeantId) return true;
  if (user.role === "leader") return user.departmentId != null && dirigeant.departmentId === user.departmentId;
  return false;
}

// Load a nouveau venu + its (FD) dirigeant, or 404.
async function loadVenu(id) {
  const assigne = await db.assignes.findById(id);
  if (!assigne) throw ApiError.notFound("Nouveau venu introuvable");
  const dirigeant = await db.dirigeants.findById(assigne.dirigeantId);
  if (!dirigeant || !(await isFdDept(dirigeant.departmentId))) throw ApiError.notFound("Nouveau venu introuvable");
  return { assigne, dirigeant };
}

// GET /api/integration/nouveaux
async function list(req, res) {
  const data = await db.integration.listNouveaux({ scope: scopeFor(req.user) });
  res.json({ data });
}

// POST /api/integration/nouveaux — register (FD dirigeant or admin).
async function register(req, res) {
  const targetId = req.body.dirigeantId || req.user.sub;
  if (targetId !== req.user.sub && !isAdmin(req.user.role)) {
    throw ApiError.forbidden("Vous ne pouvez enregistrer que pour vous-même");
  }
  const dirigeant = await db.dirigeants.findById(targetId);
  if (!dirigeant) throw ApiError.badRequest("Dirigeant invalide");
  if (!(await isFdDept(dirigeant.departmentId))) {
    throw ApiError.forbidden("Réservé au département Suivi / Faiseurs de Disciples");
  }
  if (!isAdmin(req.user.role) && !(await isFdDept(req.user.departmentId))) {
    throw ApiError.forbidden("Réservé au département Suivi / Faiseurs de Disciples");
  }

  const payload = validateAssigne(req.body, { partial: false });

  // Détection de doublon par numéro de téléphone (sauf si on force).
  if (payload.phone && !req.body.force) {
    const existing = await db.assignes.findByPhone(payload.phone);
    if (existing) {
      return res.status(409).json({
        code: "DUPLICATE",
        message: `Un contact avec ce numéro existe déjà : ${existing.firstName} ${existing.lastName}.`,
        existing: {
          id: existing.id,
          firstName: existing.firstName,
          lastName: existing.lastName,
          phone: existing.phone,
          statut: existing.statut,
          dirigeantName: existing.dirigeantName,
          departmentName: existing.departmentName,
        },
      });
    }
  }

  const firstSeenAt = typeof req.body.firstSeenAt === "string" && req.body.firstSeenAt ? req.body.firstSeenAt : new Date().toISOString().slice(0, 10);
  const created = await db.assignes.create({
    ...payload,
    dirigeantId: targetId,
    statut: "nouveau",
    isVisiteur: Boolean(req.body.isVisiteur),
    firstSeenAt,
  });
  res.status(201).json(created);
}

// GET /api/integration/nouveaux/:id — assigné + 7-lesson progress.
async function getOne(req, res) {
  const { assigne, dirigeant } = await loadVenu(req.params.id);
  if (!canManageVenu(req.user, assigne, dirigeant)) throw ApiError.forbidden("Accès refusé");
  const progress = await db.integration.getProgress(assigne.id);
  res.json({
    venu: { ...assigne, dirigeantName: dirigeant.fullName, departmentName: dirigeant.departmentName },
    progress,
    validated: progress.filter((p) => p.statut === "validee").length,
  });
}

// POST /api/integration/nouveaux/:id/valider — validate a lesson (sequential).
async function validate(req, res) {
  const { assigne, dirigeant } = await loadVenu(req.params.id);
  if (!canManageVenu(req.user, assigne, dirigeant)) throw ApiError.forbidden("Action refusée");

  const lecon = Number(req.body.lecon);
  if (!Number.isInteger(lecon) || lecon < 1 || lecon > 7) throw ApiError.badRequest("Leçon invalide (1-7)");

  const validated = await db.integration.countValidated(assigne.id);
  if (lecon !== validated + 1) {
    throw ApiError.badRequest(`Validez d'abord la leçon ${validated + 1} (progression séquentielle)`);
  }

  const progress = await db.integration.validateLesson(assigne.id, lecon, req.user.sub);
  res.json({ progress, validated: progress.filter((p) => p.statut === "validee").length });
}

// POST /api/integration/nouveaux/:id/promouvoir — to membre régulier (7/7).
async function promote(req, res) {
  const { assigne, dirigeant } = await loadVenu(req.params.id);
  if (!canManageVenu(req.user, assigne, dirigeant)) throw ApiError.forbidden("Action refusée");
  const validated = await db.integration.countValidated(assigne.id);
  if (validated < 7) throw ApiError.badRequest("Les 7 leçons doivent être validées avant le passage en membre régulier");
  const updated = await db.assignes.update(assigne.id, { statut: "regulier" });
  res.json(updated);
}

module.exports = { list, register, getOne, validate, promote };
