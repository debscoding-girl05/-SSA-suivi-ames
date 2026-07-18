const db = require("../db");
const ApiError = require("../utils/ApiError");

const KEY = "objectif_personnes";

// GET /api/objectif — objectif d'évangélisation + accomplissement (Pasteur).
async function get(_req, res) {
  const raw = await db.settings.get(KEY);
  const target = Number(raw) || 0;
  const achieved = await db.assignes.countAll();
  const percent = target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0;
  res.json({ target, achieved, percent });
}

// PUT /api/objectif — fixer l'objectif (Pasteur).
async function set(req, res) {
  const target = Number(req.body.target);
  if (!Number.isInteger(target) || target < 0) {
    throw ApiError.badRequest("L'objectif doit être un entier positif");
  }
  await db.settings.set(KEY, String(target));
  const achieved = await db.assignes.countAll();
  const percent = target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0;
  res.json({ target, achieved, percent });
}

module.exports = { get, set };
