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

// GET /api/rapports?year&week — weekly overview: who submitted, who is missing.
async function weekOverview(req, res) {
  const { year, week } = parseWeek(req.query);
  const dirigeants = await db.dirigeants.list({ year, week, scope: scopeFor(req.user) });

  const rows = dirigeants.map((d) => ({
    dirigeantId: d.id,
    fullName: d.fullName,
    departmentName: d.departmentName,
    assigneCount: d.assigneCount,
    status: d.reportStatus === "soumis" ? "soumis" : "manquant",
  }));

  const soumis = rows.filter((r) => r.status === "soumis").length;
  res.json({
    week: { year, week },
    summary: { total: rows.length, soumis, manquant: rows.length - soumis },
    dirigeants: rows,
  });
}

// GET /api/rapports/me?year&week — the connected dirigeant's fiche + presences.
async function mine(req, res) {
  const { year, week } = parseWeek(req.query);
  const { rapport, presences } = await db.rapports.findFiche(req.user.sub, year, week);
  res.json({ week: { year, week }, rapport, presences });
}

// POST /api/rapports — submit/save a weekly fiche.
// Body: { status?: 'brouillon'|'soumis', remarques?, presences?: [{assigneId,statut}], dirigeantId? }
// Legacy fallback: { presentCount } when no presences provided.
// A dirigeant submits for himself; Pasteur/PR may submit for any dirigeant.
async function submit(req, res) {
  const { year, week } = parseWeek(req.body);
  const targetId = req.body.dirigeantId || req.user.sub;

  if (targetId !== req.user.sub && !isAdmin(req.user.role)) {
    throw ApiError.forbidden("Vous ne pouvez soumettre que votre propre rapport");
  }

  const dirigeant = await db.dirigeants.findById(targetId);
  if (!dirigeant || isAdmin(dirigeant.role)) throw ApiError.badRequest("Dirigeant invalide");

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

  // Legacy flow (no per-member presences).
  const payload = validateRapport(req.body);
  const rapport = await db.rapports.submit({ dirigeantId: targetId, year, week, status, ...payload });
  res.status(201).json(rapport);
}

module.exports = { weekOverview, mine, submit };
