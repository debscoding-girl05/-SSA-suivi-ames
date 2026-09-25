const db = require("../db");

// Seuls ces profils voient l'annuaire COMPLET de l'église (décision client) :
// Pasteur, PR (« CP »), Secrétaire du pasteur, et les Faiseurs de Disciples
// (départements Faiseurs de Disciples / Suivi), qui intègrent les nouveaux
// venus de toute l'église et doivent pouvoir vérifier qu'une personne n'est
// pas déjà suivie ailleurs.
async function seesWholeAnnuaire(user) {
  if (db.READ_ALL_ROLES.includes(user.role)) return true;
  if (user.departmentId == null) return false;
  const dept = await db.departments.findById(user.departmentId);
  return Boolean(dept && db.FD_DEPT_NAMES.includes(dept.name));
}

// RBAC scope (annuaire) :
//  - voir seesWholeAnnuaire → tout
//  - Leader        → annuaire de son département
//  - Encadreur / Leader de cellule → ses propres personnes
async function scopeFor(user) {
  if (await seesWholeAnnuaire(user)) return undefined;
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
    scope: await scopeFor(req.user),
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  res.json({ data: rows, total, page, pageSize });
}

module.exports = { list, seesWholeAnnuaire };
