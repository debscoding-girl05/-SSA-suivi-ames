const db = require("../db");
const ApiError = require("../utils/ApiError");
const { validateDirigeant } = require("../utils/validators");
const { parseWeek } = require("../utils/week");

const isAdmin = (role) => db.ADMIN_ROLES.includes(role);

// RBAC visibility scope (CDC Annexe D):
//  - Pasteur / PR  → tout
//  - Leader        → son département
//  - Encadreur / Leader de cellule → lui-même uniquement
function scopeFor(user) {
  if (isAdmin(user.role)) return undefined;
  if (user.role === "leader") return { departmentId: user.departmentId ?? -1 };
  return { selfId: user.sub };
}

// Can the requesting user see this dirigeant's detail?
function canView(user, dirigeant) {
  if (isAdmin(user.role)) return true;
  if (user.role === "leader") {
    return user.departmentId != null && dirigeant.departmentId === user.departmentId;
  }
  return dirigeant.id === user.sub;
}

// GET /api/dirigeants — list with department, assigné count, report status for a week.
async function list(req, res) {
  const { year, week } = parseWeek(req.query);
  const data = await db.dirigeants.list({
    search: req.query.search,
    departmentId: req.query.departmentId,
    year,
    week,
    scope: scopeFor(req.user),
  });
  res.json({ data, week: { year, week } });
}

// GET /api/dirigeants/:id — detail + assignés + report history.
async function getOne(req, res) {
  const dirigeant = await db.dirigeants.findById(req.params.id);
  if (!dirigeant || isAdmin(dirigeant.role)) throw ApiError.notFound("Dirigeant introuvable");
  if (!canView(req.user, dirigeant)) throw ApiError.notFound("Dirigeant introuvable");

  const [assignes, rapports] = await Promise.all([
    db.assignes.listByDirigeant(dirigeant.id),
    db.rapports.listByDirigeant(dirigeant.id),
  ]);

  res.json({
    dirigeant: {
      id: dirigeant.id,
      fullName: dirigeant.fullName,
      email: dirigeant.email,
      phone: dirigeant.phone,
      role: dirigeant.role,
      departmentId: dirigeant.departmentId,
      departmentName: dirigeant.departmentName,
    },
    assignes,
    rapports,
  });
}

// PUT /api/dirigeants/:id — Pasteur/PR edit profile (name, phone, department).
async function update(req, res) {
  const existing = await db.dirigeants.findById(req.params.id);
  if (!existing || isAdmin(existing.role)) throw ApiError.notFound("Dirigeant introuvable");

  const payload = validateDirigeant(req.body);
  if (payload.departmentId) {
    const dept = await db.departments.findById(payload.departmentId);
    if (!dept) throw ApiError.badRequest("Département introuvable");
  }
  const u = await db.dirigeants.update(req.params.id, payload);
  // Public projection — never leak passwordHash.
  res.json({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    role: u.role,
    departmentId: u.departmentId,
    departmentName: u.departmentName,
  });
}

module.exports = { list, getOne, update, canView, isAdmin };
