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

// GET /api/annuaire — directory of assignés with search + department filter.
async function list(req, res) {
  const data = await db.assignes.listAll({
    search: req.query.search,
    departmentId: req.query.departmentId,
    scope: scopeFor(req.user),
  });
  res.json({ data });
}

module.exports = { list };
