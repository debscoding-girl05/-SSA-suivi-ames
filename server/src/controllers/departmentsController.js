const db = require("../db");
const { parseWeek } = require("../utils/week");

// GET /api/departments — list all departments (for filters & member forms).
async function list(_req, res) {
  const departments = await db.departments.list();
  res.json({ data: departments });
}

// GET /api/departments/overview?year&week — departments with stats for a week.
async function overview(req, res) {
  const { year, week } = parseWeek(req.query);
  const data = await db.departments.listWithStats({ year, week });
  res.json({ data, week: { year, week } });
}

module.exports = { list, overview };
