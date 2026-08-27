const db = require("../db");

// RBAC scope (CDC Annexe D — annuaire):
//  - Pasteur / PR  → tous les assignés
//  - Leader        → assignés de son département
//  - Encadreur / Leader de cellule → ses propres assignés
function scopeFor(user) {
  if (db.ADMIN_ROLES.includes(user.role)) return undefined;
  if (user.role === "leader") return { departmentId: user.departmentId ?? -1 };
  return { dirigeantId: user.sub };
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

// GET /api/annuaire?search&departmentId&page&pageSize — paginé : à l'échelle
// réelle (des milliers de personnes suivies), tout renvoyer d'un coup
// planterait le téléphone bien avant le serveur.
async function list(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE));

  const { rows, total } = await db.assignes.listAll({
    search: req.query.search,
    departmentId: req.query.departmentId,
    scope: scopeFor(req.user),
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  res.json({ data: rows, total, page, pageSize });
}

module.exports = { list };
