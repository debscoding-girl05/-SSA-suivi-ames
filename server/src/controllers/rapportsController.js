const db = require("../db");
const ApiError = require("../utils/ApiError");
const { validateRapport } = require("../utils/validators");
const { parseWeek } = require("../utils/week");

const isAdmin = (role) => db.ADMIN_ROLES.includes(role);

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

// GET /api/rapports/me?year&week — the connected dirigeant's report for a week.
async function mine(req, res) {
  const { year, week } = parseWeek(req.query);
  const rapport = await db.rapports.findByDirigeantWeek(req.user.sub, year, week);
  res.json({ week: { year, week }, rapport: rapport || null });
}

// POST /api/rapports — submit a weekly report.
// A dirigeant submits for himself; Pasteur/PR may submit for any dirigeant.
async function submit(req, res) {
  const { year, week } = parseWeek(req.body);
  const targetId = req.body.dirigeantId || req.user.sub;

  if (targetId !== req.user.sub && !isAdmin(req.user.role)) {
    throw ApiError.forbidden("Vous ne pouvez soumettre que votre propre rapport");
  }

  const dirigeant = await db.dirigeants.findById(targetId);
  if (!dirigeant || isAdmin(dirigeant.role)) throw ApiError.badRequest("Dirigeant invalide");

  const payload = validateRapport(req.body);
  const rapport = await db.rapports.submit({ dirigeantId: targetId, year, week, ...payload });
  res.status(201).json(rapport);
}

module.exports = { weekOverview, mine, submit };
