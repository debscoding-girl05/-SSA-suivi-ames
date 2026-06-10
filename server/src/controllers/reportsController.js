const db = require("../db");
const ApiError = require("../utils/ApiError");
const { parseWeek } = require("../utils/week");

const isAdmin = (role) => db.ADMIN_ROLES.includes(role); // pasteur | pr
const canAuthor = (role) => role === "leader" || role === "pr";

// Read scope: Pasteur/PR → tout ; Leader → son département ; sinon → rien.
function scopeFor(user) {
  if (isAdmin(user.role)) return undefined;
  if (user.role === "leader") return { departmentId: user.departmentId ?? -1 };
  return { departmentId: -1 };
}

function canRead(user, report) {
  if (isAdmin(user.role)) return true;
  if (user.role === "leader") return user.departmentId != null && report.departmentId === user.departmentId;
  return report.authorId === user.sub;
}

const str = (v) => (typeof v === "string" ? v.trim() : "");

// GET /api/reports — list (scoped).
async function list(req, res) {
  const data = await db.reports.list({ scope: scopeFor(req.user) });
  res.json({ data });
}

// GET /api/reports/:id
async function getOne(req, res) {
  const report = await db.reports.findById(req.params.id);
  if (!report) throw ApiError.notFound("Rapport introuvable");
  if (!canRead(req.user, report)) throw ApiError.forbidden("Accès refusé");
  res.json(report);
}

// POST /api/reports — leader (rapport de département) ou PR (synthèse).
async function create(req, res) {
  if (!canAuthor(req.user.role)) throw ApiError.forbidden("Seuls les leaders et la PR rédigent des rapports");
  const { year, week } = parseWeek(req.body);
  const title = str(req.body.title);
  if (!title) throw ApiError.badRequest("Le titre est requis");

  const level = req.user.role === "pr" ? "synthese" : "departement";
  const departmentId = req.user.role === "leader" ? req.user.departmentId ?? null : null;

  const report = await db.reports.create({
    authorId: req.user.sub,
    level,
    departmentId,
    title,
    content: str(req.body.content),
    year,
    week,
  });
  res.status(201).json(report);
}

async function loadOwnEditable(req) {
  const report = await db.reports.findById(req.params.id);
  if (!report) throw ApiError.notFound("Rapport introuvable");
  if (report.authorId !== req.user.sub && !isAdmin(req.user.role)) {
    throw ApiError.forbidden("Vous ne pouvez modifier que vos propres rapports");
  }
  return report;
}

// PUT /api/reports/:id — author edits while draft.
async function update(req, res) {
  const report = await loadOwnEditable(req);
  if (report.status !== "brouillon") throw ApiError.badRequest("Un rapport transmis n'est plus modifiable");
  const fields = {};
  if (req.body.title !== undefined) {
    const title = str(req.body.title);
    if (!title) throw ApiError.badRequest("Le titre est requis");
    fields.title = title;
  }
  if (req.body.content !== undefined) fields.content = str(req.body.content);
  res.json(await db.reports.update(req.params.id, fields));
}

// POST /api/reports/:id/transmit — draft → transmitted (up the chain).
async function transmit(req, res) {
  const report = await loadOwnEditable(req);
  if (report.status === "transmis") throw ApiError.badRequest("Rapport déjà transmis");
  res.json(await db.reports.transmit(req.params.id));
}

// DELETE /api/reports/:id — author (draft) or admin.
async function remove(req, res) {
  const report = await loadOwnEditable(req);
  if (report.status === "transmis" && !isAdmin(req.user.role)) {
    throw ApiError.badRequest("Un rapport transmis ne peut pas être supprimé");
  }
  await db.reports.remove(req.params.id);
  res.status(204).end();
}

// GET /api/reports/aggregate?year&week — suggested title + content from fiches.
async function aggregate(req, res) {
  if (!canAuthor(req.user.role)) throw ApiError.forbidden("Action réservée aux leaders et à la PR");
  const { year, week } = parseWeek(req.query);
  const dirigeants = await db.dirigeants.list({ year, week, scope: scopeFor(req.user) });

  // Per-dirigeant present counts (from their fiche).
  const enriched = await Promise.all(
    dirigeants.map(async (d) => {
      const fiche = await db.rapports.findByDirigeantWeek(d.id, year, week);
      return { ...d, presentCount: fiche?.presentCount ?? 0, remarques: fiche?.remarques ?? null, ficheStatus: fiche?.status ?? "manquant" };
    })
  );

  const rendu = (s) => s === "soumis" || s === "valide";
  const soumis = enriched.filter((d) => rendu(d.ficheStatus)).length;
  const totalPresents = enriched.reduce((sum, d) => sum + (rendu(d.ficheStatus) ? d.presentCount : 0), 0);

  let title;
  let lines;
  if (req.user.role === "pr") {
    title = `Synthèse hebdomadaire — Semaine ${week} / ${year}`;
    // Group by department.
    const byDept = new Map();
    for (const d of enriched) {
      const k = d.departmentName || "Sans département";
      const e = byDept.get(k) || { soumis: 0, total: 0, presents: 0 };
      e.total += 1;
      if (rendu(d.ficheStatus)) { e.soumis += 1; e.presents += d.presentCount; }
      byDept.set(k, e);
    }
    lines = [...byDept.entries()].map(
      ([name, e]) => `• ${name} : ${e.soumis}/${e.total} fiches, ${e.presents} présents`
    );
  } else {
    const deptName = enriched[0]?.departmentName || "Mon département";
    title = `Rapport — ${deptName} — Semaine ${week} / ${year}`;
    lines = enriched.map(
      (d) => `• ${d.fullName} : ${rendu(d.ficheStatus) ? `${d.presentCount} présent(s)` : "fiche manquante"}${d.remarques ? ` — ${d.remarques}` : ""}`
    );
  }

  const content = [
    `Fiches reçues : ${soumis}/${enriched.length}`,
    `Total présents : ${totalPresents}`,
    "",
    ...lines,
    "",
    "Observations : ",
  ].join("\n");

  res.json({ title, content, week: { year, week } });
}

module.exports = { list, getOne, create, update, transmit, remove, aggregate };
