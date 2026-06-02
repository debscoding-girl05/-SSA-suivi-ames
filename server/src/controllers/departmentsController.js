const db = require("../db");

// GET /api/departments — list all departments (for filters & member forms).
async function list(_req, res) {
  const departments = await db.departments.list();
  res.json({ data: departments });
}

module.exports = { list };
