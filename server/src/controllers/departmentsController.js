const db = require("../db");
const ApiError = require("../utils/ApiError");
const { parseWeek } = require("../utils/week");

const str = (v) => (typeof v === "string" ? v.trim() : "");

// GET /api/departments — list all departments (for filters & member forms).
async function list(_req, res) {
  const departments = await db.departments.list();
  res.json({ data: departments });
}

// POST /api/departments — créer (Pasteur/PR).
async function create(req, res) {
  const name = str(req.body.name);
  if (!name) throw ApiError.badRequest("Le nom du département est requis");
  if (await db.departments.findByName(name)) {
    throw new ApiError(409, "NAME_EXISTS", "Un département porte déjà ce nom");
  }
  const dep = await db.departments.create({ name, description: str(req.body.description) || null });
  res.status(201).json(dep);
}

// PUT /api/departments/:id — renommer / décrire (Pasteur/PR).
async function update(req, res) {
  const existing = await db.departments.findById(req.params.id);
  if (!existing) throw ApiError.notFound("Département introuvable");

  const fields = {};
  if (req.body.name !== undefined) {
    const name = str(req.body.name);
    if (!name) throw ApiError.badRequest("Le nom est requis");
    const dup = await db.departments.findByName(name);
    if (dup && dup.id !== existing.id) throw new ApiError(409, "NAME_EXISTS", "Un département porte déjà ce nom");
    fields.name = name;
  }
  if (req.body.description !== undefined) fields.description = str(req.body.description) || null;
  res.json(await db.departments.update(existing.id, fields));
}

// GET /api/departments/overview?year&week — departments with stats for a week.
async function overview(req, res) {
  const { year, week } = parseWeek(req.query);
  const data = await db.departments.listWithStats({ year, week });
  res.json({ data, week: { year, week } });
}

module.exports = { list, create, update, overview };
