const db = require("../db");
const ApiError = require("../utils/ApiError");
const { validateRapport } = require("../utils/validators");
const { parseWeek } = require("../utils/week");

const isAdmin = (role) => db.ADMIN_ROLES.includes(role);
const PRESENCE_STATUS = ["present", "absent", "justifie"];

function scopeFor(user) {
  if (isAdmin(user.role)) return undefined;
  if (user.role === "leader") return { departmentId: user.departmentId ?? -1 };
  return { selfId: user.sub };
}

// Can `user` view a dirigeant's fiche? self, admin, or leader of same dept.
function canViewDirigeant(user, dirigeant) {
  if (isAdmin(user.role)) return true;
  if (user.sub === dirigeant.id) return true;
  if (user.role === "leader") return user.departmentId != null && dirigeant.departmentId === user.departmentId;
  return false;
}

// Can `user` validate / send back a fiche? Not your own; admin (any) or leader
// of the same department.
function canReview(user, dirigeant) {
  if (dirigeant.id === user.sub) return false;
  if (isAdmin(user.role)) return true;
  if (user.role === "leader") return user.departmentId != null && dirigeant.departmentId === user.departmentId;
  return false;
}

// GET /api/rapports?year&week — weekly overview: status per dirigeant.
async function weekOverview(req, res) {
  const { year, week } = parseWeek(req.query);
  const dirigeants = await db.dirigeants.list({ year, week, scope: scopeFor(req.user) });

  const norm = (s) => (s === "soumis" || s === "valide" || s === "a_corriger" ? s : "manquant");
  const rows = dirigeants.map((d) => ({
    dirigeantId: d.id,
    fullName: d.fullName,
    departmentName: d.departmentName,
    assigneCount: d.assigneCount,
    status: norm(d.reportStatus),
  }));

  const count = (s) => rows.filter((r) => r.status === s).length;
  res.json({
    week: { year, week },
    summary: {
      total: rows.length,
      soumis: count("soumis"),
      valide: count("valide"),
      aCorriger: count("a_corriger"),
      manquant: count("manquant"),
    },
    dirigeants: rows,
  });
}

// GET /api/rapports/me?year&week — the connected dirigeant's fiche + presences.
async function mine(req, res) {
  const { year, week } = parseWeek(req.query);
  const { rapport, presences } = await db.rapports.findFiche(req.user.sub, year, week);
  res.json({ week: { year, week }, rapport, presences });
}

// GET /api/rapports/fiche/:dirigeantId?year&week — a dirigeant's fiche (reviewer/self).
async function getFiche(req, res) {
  const dirigeant = await db.dirigeants.findById(req.params.dirigeantId);
  if (!dirigeant || isAdmin(dirigeant.role)) throw ApiError.notFound("Dirigeant introuvable");
  if (!canViewDirigeant(req.user, dirigeant)) throw ApiError.forbidden("Accès refusé");

  const { year, week } = parseWeek(req.query);
  const { rapport, presences } = await db.rapports.findFiche(dirigeant.id, year, week);
  res.json({ week: { year, week }, rapport, presences });
}

// POST /api/rapports — submit/save a weekly fiche (author or admin backfill).
async function submit(req, res) {
  const { year, week } = parseWeek(req.body);
  const targetId = req.body.dirigeantId || req.user.sub;
  const isSelf = targetId === req.user.sub;

  if (!isSelf && !isAdmin(req.user.role)) {
    throw ApiError.forbidden("Vous ne pouvez soumettre que votre propre rapport");
  }

  const dirigeant = await db.dirigeants.findById(targetId);
  if (!dirigeant || isAdmin(dirigeant.role)) throw ApiError.badRequest("Dirigeant invalide");

  // Lock: the author cannot edit a fiche awaiting review or already validated.
  if (isSelf && !isAdmin(req.user.role)) {
    const existing = await db.rapports.findByDirigeantWeek(targetId, year, week);
    if (existing?.status === "soumis") throw ApiError.forbidden("Fiche en attente de validation");
    if (existing?.status === "valide") throw ApiError.forbidden("Fiche déjà validée");
  }

  const status = req.body.status === "brouillon" ? "brouillon" : "soumis";
  const remarques = typeof req.body.remarques === "string" ? req.body.remarques.trim() || null : null;

  if (Array.isArray(req.body.presences)) {
    const own = await db.assignes.listByDirigeant(targetId);
    const ownIds = new Set(own.map((a) => a.id));
    const presences = req.body.presences.map((p) => {
      if (!p || !ownIds.has(p.assigneId)) throw ApiError.badRequest("Assigné invalide");
      if (!PRESENCE_STATUS.includes(p.statut)) throw ApiError.badRequest("Statut de présence invalide");
      return { assigneId: p.assigneId, statut: p.statut };
    });
    const rapport = await db.rapports.submit({ dirigeantId: targetId, year, week, status, remarques, presences });
    return res.status(201).json(rapport);
  }

  const payload = validateRapport(req.body);
  const rapport = await db.rapports.submit({ dirigeantId: targetId, year, week, status, ...payload });
  res.status(201).json(rapport);
}

// Shared review handler for validate / request-changes.
async function doReview(req, res, action) {
  const fiche = await db.rapports.findById(req.params.id);
  if (!fiche) throw ApiError.notFound("Fiche introuvable");
  if (fiche.status !== "soumis" && fiche.status !== "a_corriger" && fiche.status !== "valide") {
    throw ApiError.badRequest("Cette fiche n'est pas soumise");
  }

  const dirigeant = await db.dirigeants.findById(fiche.dirigeantId);
  if (!dirigeant) throw ApiError.notFound("Dirigeant introuvable");
  if (!canReview(req.user, dirigeant)) throw ApiError.forbidden("Vous ne pouvez pas valider cette fiche");

  const comment = typeof req.body.comment === "string" ? req.body.comment.trim() : "";
  if (action === "a_corriger" && !comment) {
    throw ApiError.badRequest("Un commentaire est requis pour demander une correction");
  }

  const rapport = await db.rapports.review(req.params.id, {
    action,
    comment: comment || null,
    reviewerId: req.user.sub,
  });
  res.json(rapport);
}

const validate = (req, res) => doReview(req, res, "valide");
const requestChanges = (req, res) => doReview(req, res, "a_corriger");

module.exports = { weekOverview, mine, getFiche, submit, validate, requestChanges };
