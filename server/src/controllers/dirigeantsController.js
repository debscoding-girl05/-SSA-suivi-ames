const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("../db");
const ApiError = require("../utils/ApiError");
const { validateDirigeant, validateNewDirigeant } = require("../utils/validators");
const { parseWeek } = require("../utils/week");

// Generates a temporary password meeting the ENF-14 policy (≥8 chars,
// uppercase, digit, special char). Ambiguous characters (0/O, 1/l/I) are
// excluded for easier manual transcription.
function generateTempPassword() {
  const LOWER = "abcdefghjkmnpqrstuvwxyz";
  const UPPER = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const DIGITS = "23456789";
  const SPECIAL = "!@#$%*?";
  const ALL = LOWER + UPPER + DIGITS + SPECIAL;
  const pick = (set) => set[crypto.randomInt(set.length)];

  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SPECIAL)];
  while (chars.length < 10) chars.push(pick(ALL));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

const isAdmin = (role) => db.ADMIN_ROLES.includes(role);

// Public projection of a dirigeant — never leak passwordHash.
const toPublic = (d) => ({
  id: d.id,
  fullName: d.fullName,
  email: d.email,
  phone: d.phone,
  role: d.role,
  departmentId: d.departmentId,
  departmentName: d.departmentName,
});

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

  const [assignes, fiches, reports] = await Promise.all([
    db.assignes.listByDirigeant(dirigeant.id),
    db.rapports.listByDirigeant(dirigeant.id), // fiches de présence (historique)
    db.reports.listByAuthor(dirigeant.id), // rapports hebdomadaires (documents)
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
      isActive: dirigeant.isActive,
    },
    assignes,
    fiches,
    reports,
  });
}

// POST /api/dirigeants — Pasteur/PR create a new account (leader, encadreur,
// leader_cellule, or pr). "pasteur" is never creatable here (seed-only).
// A temporary password is generated and returned ONCE in the response — there
// is no password-reset flow yet, so the admin must communicate it to the new
// dirigeant directly. It is never stored in plaintext nor retrievable again.
async function create(req, res) {
  const payload = validateNewDirigeant(req.body);

  const existing = await db.users.findByEmail(payload.email);
  if (existing) throw ApiError.conflict("Un compte existe déjà avec cet email");

  if (payload.departmentId) {
    const dept = await db.departments.findById(payload.departmentId);
    if (!dept) throw ApiError.badRequest("Département introuvable");
  }

  const role = await db.roles.findByName(payload.role);
  if (!role) throw ApiError.badRequest("Rôle introuvable");

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const u = await db.users.create({
    email: payload.email,
    passwordHash,
    fullName: payload.fullName,
    phone: payload.phone,
    roleId: role.id,
    departmentId: payload.departmentId,
  });

  res.status(201).json({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    role: u.role,
    departmentId: u.departmentId,
    departmentName: u.departmentName,
    tempPassword,
  });
}

// POST /api/dirigeants/:id/deactivate — disable an account without deleting
// it (CDC EF-05). The account can no longer log in; its history is kept.
async function deactivate(req, res) {
  const existing = await db.dirigeants.findById(req.params.id);
  if (!existing || isAdmin(existing.role)) throw ApiError.notFound("Dirigeant introuvable");

  const u = await db.dirigeants.setActive(req.params.id, false);
  res.json({ id: u.id, fullName: u.fullName, isActive: u.isActive });
}

// POST /api/dirigeants/:id/reactivate — restore access to a deactivated account.
async function reactivate(req, res) {
  const existing = await db.dirigeants.findById(req.params.id);
  if (!existing || isAdmin(existing.role)) throw ApiError.notFound("Dirigeant introuvable");

  const u = await db.dirigeants.setActive(req.params.id, true);
  res.json({ id: u.id, fullName: u.fullName, isActive: u.isActive });
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
  res.json(toPublic(u));
}

module.exports = { list, getOne, create, update, deactivate, reactivate, canView, isAdmin };
