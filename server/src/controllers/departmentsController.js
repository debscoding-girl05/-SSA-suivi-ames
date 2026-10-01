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
// Vue d'ensemble de l'église : Pasteur, PR, Secrétaire. Un leader ne voit
// que son département ; les autres rôles, aucun (la simple liste des noms,
// GET /api/departments, reste ouverte pour les formulaires et filtres).
async function overview(req, res) {
  const { year, week } = parseWeek(req.query);
  let data = await db.departments.listWithStats({ year, week });
  if (!db.READ_ALL_ROLES.includes(req.user.role)) {
    data = req.user.role === "leader" ? data.filter((d) => d.id === req.user.departmentId) : [];
  }
  res.json({ data, week: { year, week } });
}

module.exports = { list, create, update, overview };
