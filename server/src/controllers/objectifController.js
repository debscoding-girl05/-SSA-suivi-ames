const db = require("../db");
const ApiError = require("../utils/ApiError");

const KEY = "objectif_personnes";
const KEY_DEBUT = "objectif_debut";
const KEY_FIN = "objectif_fin";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(v, label) {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v).trim();
  if (!DATE_RE.test(s) || Number.isNaN(new Date(`${s}T00:00:00`).getTime())) {
    throw ApiError.badRequest(`${label} invalide (format AAAA-MM-JJ)`);
  }
  return s;
}

// Ajouts par mois (AAAA-MM) sur la période, mois vides compris — frise.
function monthlyCounts(dates, debut, fin) {
  const counts = new Map();
  for (const d of dates) {
    const t = new Date(d);
    const k = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  if (!debut || !fin) {
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count }));
  }
  const out = [];
  const cur = new Date(`${debut}T00:00:00`);
  cur.setDate(1);
  const last = new Date(`${fin}T00:00:00`);
  while (cur <= last && out.length < 60) {
    const k = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
    out.push({ month: k, count: counts.get(k) || 0 });
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

// Progression = personnes ajoutées à l'annuaire entre la date de début et la
// date de fin de l'objectif (pas le total de l'annuaire : les personnes déjà
// suivies avant le lancement de l'objectif ne comptent pas comme fruits de
// l'évangélisation de la période).
async function build() {
  const target = Number(await db.settings.get(KEY)) || 0;
  const debut = (await db.settings.get(KEY_DEBUT)) || null;
  const fin = (await db.settings.get(KEY_FIN)) || null;

  const [achieved, dates] = await Promise.all([
    db.assignes.countCreatedBetween(debut, fin),
    db.assignes.createdDates(debut, fin),
  ]);
  const percent = target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0;

  let timeline = null;
  if (debut && fin) {
    const start = new Date(`${debut}T00:00:00`).getTime();
    const end = new Date(`${fin}T23:59:59`).getTime();
    const now = Date.now();
    const totalDays = Math.max(1, Math.round((end - start) / DAY_MS));
    const elapsedDays = Math.min(totalDays, Math.max(0, Math.round((now - start) / DAY_MS)));
    const daysLeft = Math.max(0, Math.ceil((end - now) / DAY_MS));
    const remaining = Math.max(0, target - achieved);
    const weeksLeft = daysLeft / 7;
    timeline = {
      totalDays,
      elapsedDays,
      daysLeft,
      timePercent: Math.round((elapsedDays / totalDays) * 100),
      // Rythme nécessaire pour atteindre l'objectif à temps.
      perWeekNeeded: remaining > 0 && weeksLeft > 0 ? Math.ceil(remaining / weeksLeft) : 0,
      status: now < start ? "a_venir" : now > end ? "termine" : "en_cours",
    };
  }

  return { target, debut, fin, achieved, percent, timeline, monthly: monthlyCounts(dates, debut, fin) };
}

// GET /api/objectif — objectif d'évangélisation + accomplissement (Pasteur).
async function get(_req, res) {
  res.json(await build());
}

// PUT /api/objectif — fixer l'objectif et sa période (Pasteur).
// body: { target, debut?, fin? } — dates AAAA-MM-JJ.
async function set(req, res) {
  const target = Number(req.body.target);
  if (!Number.isInteger(target) || target < 0) {
    throw ApiError.badRequest("L'objectif doit être un entier positif");
  }
  const debut = parseDate(req.body.debut, "Date de début");
  const fin = parseDate(req.body.fin, "Date de fin");
  if (debut && fin && fin < debut) {
    throw ApiError.badRequest("La date de fin doit être après la date de début");
  }
  await db.settings.set(KEY, String(target));
  if (req.body.debut !== undefined) await db.settings.set(KEY_DEBUT, debut || "");
  if (req.body.fin !== undefined) await db.settings.set(KEY_FIN, fin || "");
  res.json(await build());
}

module.exports = { get, set };
