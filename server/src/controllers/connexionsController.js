const db = require("../db");

// GET /api/connexions — Pasteur/PR uniquement (EF-08). Historique des
// tentatives de connexion, les plus récentes en premier.
async function list(req, res) {
  const limit = Math.min(Number(req.query.limit) || 200, 500);
  const data = await db.connexions.listRecent({ limit });
  res.json({ data });
}

module.exports = { list };