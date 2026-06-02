const db = require("../db");
const ApiError = require("../utils/ApiError");
const { validateMember } = require("../utils/validateMember");

// GET /api/members — list with filters (search, status, departmentId) + pagination.
async function list(req, res) {
  const { search, status, departmentId, page, limit } = req.query;

  // Role-based visibility: volunteers only see active members.
  const effectiveStatus = req.user?.role === "volunteer" ? "actif" : status;

  const { data, total } = await db.members.list({
    search,
    status: effectiveStatus,
    departmentId,
    page,
    limit,
  });

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);

  res.json({ data, total, page: safePage, limit: safeLimit });
}

// GET /api/members/:id
async function getOne(req, res) {
  const member = await db.members.findById(req.params.id);
  if (!member) throw ApiError.notFound("Membre introuvable");
  // Same visibility floor as the list: volunteers only see active members.
  if (req.user?.role === "volunteer" && member.status !== "actif") {
    throw ApiError.notFound("Membre introuvable");
  }
  res.json(member);
}

// POST /api/members
async function create(req, res) {
  const payload = validateMember(req.body, { partial: false });

  if (payload.departmentId) {
    const dept = await db.departments.findById(payload.departmentId);
    if (!dept) throw ApiError.badRequest("Département introuvable");
  }

  const member = await db.members.create(payload);
  res.status(201).json(member);
}

// PUT /api/members/:id
async function update(req, res) {
  const existing = await db.members.findById(req.params.id);
  if (!existing) throw ApiError.notFound("Membre introuvable");

  const payload = validateMember(req.body, { partial: true });

  if (payload.departmentId) {
    const dept = await db.departments.findById(payload.departmentId);
    if (!dept) throw ApiError.badRequest("Département introuvable");
  }

  const member = await db.members.update(req.params.id, payload);
  res.json(member);
}

// DELETE /api/members/:id
async function remove(req, res) {
  const ok = await db.members.remove(req.params.id);
  if (!ok) throw ApiError.notFound("Membre introuvable");
  res.status(204).end();
}

module.exports = { list, getOne, create, update, remove };
