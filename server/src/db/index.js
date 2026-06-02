const fs = require("fs");
const path = require("path");
const config = require("../config/env");

/**
 * Database access layer.
 *
 * Two interchangeable backends behind one interface:
 *  - Postgres (when DATABASE_URL is set) via `pg`.
 *  - An in-memory store (dev/demo fallback) when no DATABASE_URL is present,
 *    so the API boots and login works out of the box.
 *
 * Consumers use the high-level `users` / `roles` repositories rather than raw
 * SQL, which keeps both backends in sync.
 */

const isPostgres = Boolean(config.db.url);

let pool = null;

// --- In-memory store (dev fallback) --------------------------------------
const memory = {
  roles: [
    { id: 1, name: "admin", description: "Administrateur — accès complet" },
    { id: 2, name: "leader", description: "Responsable / Leader" },
    { id: 3, name: "volunteer", description: "Bénévole — saisie de terrain" },
  ],
  departments: [
    { id: 1, name: "Accueil", description: "Équipe d'accueil et intégration" },
    { id: 2, name: "Louange", description: "Louange et musique" },
    { id: 3, name: "Jeunesse", description: "Ministère des jeunes" },
    { id: 4, name: "Intercession", description: "Groupe de prière et intercession" },
    { id: 5, name: "Évangélisation", description: "Évangélisation et suivi des nouveaux" },
  ],
  users: [], // populated by the seed script
  members: [], // populated by the seed script
};

function newUuid() {
  // Real UUID so the in-memory store matches the Postgres schema (UUID PKs)
  // and the OpenAPI id (format: uuid).
  return require("crypto").randomUUID();
}

// --- Postgres helpers ------------------------------------------------------
function getPool() {
  if (!isPostgres) return null;
  if (pool) return pool;

  // Lazy require so the `pg` dependency is only needed when actually used.
  const { Pool } = require("pg");
  pool = new Pool({
    connectionString: config.db.url,
    ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined,
  });
  return pool;
}

async function query(text, params) {
  const p = getPool();
  if (!p) {
    throw new Error("query() called without a Postgres connection");
  }
  return p.query(text, params);
}

// --- Lifecycle -------------------------------------------------------------
let initialized = false;

// Idempotent: safe to call multiple times (server boot + standalone seed).
async function init() {
  if (initialized) {
    return { backend: isPostgres ? "postgres" : "memory" };
  }
  if (!isPostgres) {
    initialized = true;
    return { backend: "memory" };
  }
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await query(schema);
  initialized = true;
  return { backend: "postgres" };
}

async function healthcheck() {
  if (!isPostgres) {
    return { backend: "memory", ok: true };
  }
  try {
    await query("SELECT 1");
    return { backend: "postgres", ok: true };
  } catch (error) {
    return { backend: "postgres", ok: false, error: error.message };
  }
}

async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// --- Repositories ----------------------------------------------------------
function mapUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    fullName: row.full_name ?? null,
    roleId: row.role_id,
    role: row.role ?? null,
    isActive: row.is_active,
    createdAt: row.created_at ?? null,
  };
}

const roles = {
  async findByName(name) {
    if (!isPostgres) {
      return memory.roles.find((r) => r.name === name) || null;
    }
    const { rows } = await query("SELECT * FROM roles WHERE name = $1", [name]);
    return rows[0] || null;
  },
};

const users = {
  async findByEmail(email) {
    const normalized = String(email || "").trim().toLowerCase();
    if (!isPostgres) {
      const user = memory.users.find((u) => u.email === normalized);
      if (!user) return null;
      const role = memory.roles.find((r) => r.id === user.roleId);
      return mapUserRow({ ...user, password_hash: user.passwordHash, full_name: user.fullName, role_id: user.roleId, is_active: user.isActive, role: role?.name });
    }
    const { rows } = await query(
      `SELECT u.*, r.name AS role
         FROM users u JOIN roles r ON r.id = u.role_id
        WHERE u.email = $1`,
      [normalized]
    );
    return mapUserRow(rows[0]);
  },

  async findById(id) {
    if (!isPostgres) {
      const user = memory.users.find((u) => u.id === id);
      if (!user) return null;
      const role = memory.roles.find((r) => r.id === user.roleId);
      return mapUserRow({ ...user, password_hash: user.passwordHash, full_name: user.fullName, role_id: user.roleId, is_active: user.isActive, role: role?.name });
    }
    const { rows } = await query(
      `SELECT u.*, r.name AS role
         FROM users u JOIN roles r ON r.id = u.role_id
        WHERE u.id = $1`,
      [id]
    );
    return mapUserRow(rows[0]);
  },

  async create({ email, passwordHash, fullName, roleId }) {
    const normalized = String(email).trim().toLowerCase();
    if (!isPostgres) {
      const user = {
        id: newUuid(),
        email: normalized,
        passwordHash,
        fullName: fullName ?? null,
        roleId,
        isActive: true,
        createdAt: null,
      };
      memory.users.push(user);
      return this.findById(user.id);
    }
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, full_name, role_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [normalized, passwordHash, fullName ?? null, roleId]
    );
    return this.findById(rows[0].id);
  },
};

function mapDepartmentRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
  };
}

const departments = {
  async list() {
    if (!isPostgres) {
      return memory.departments.map(mapDepartmentRow);
    }
    const { rows } = await query("SELECT * FROM departments ORDER BY name ASC");
    return rows.map(mapDepartmentRow);
  },

  async findById(id) {
    const numId = Number(id);
    if (!isPostgres) {
      return mapDepartmentRow(memory.departments.find((d) => d.id === numId));
    }
    const { rows } = await query("SELECT * FROM departments WHERE id = $1", [numId]);
    return mapDepartmentRow(rows[0]);
  },
};

function mapMemberRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone ?? null,
    email: row.email ?? null,
    departmentId: row.department_id ?? null,
    departmentName: row.department_name ?? null,
    status: row.status,
    notes: row.notes ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

const members = {
  // Returns { data, total } with filtering (search/status/departmentId) + pagination.
  async list({ search, status, departmentId, page = 1, limit = 20 } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    if (!isPostgres) {
      let rows = memory.members.slice();
      if (status) rows = rows.filter((m) => m.status === status);
      if (departmentId) rows = rows.filter((m) => m.departmentId === Number(departmentId));
      if (search) {
        const q = String(search).toLowerCase();
        rows = rows.filter((m) =>
          `${m.firstName} ${m.lastName} ${m.email || ""} ${m.phone || ""}`.toLowerCase().includes(q)
        );
      }
      rows.sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "fr")
      );
      const total = rows.length;
      const paged = rows.slice(offset, offset + safeLimit).map((m) => {
        const dept = memory.departments.find((d) => d.id === m.departmentId);
        return mapMemberRow({
          ...m,
          first_name: m.firstName,
          last_name: m.lastName,
          department_id: m.departmentId,
          department_name: dept?.name,
          created_at: m.createdAt,
          updated_at: m.updatedAt,
        });
      });
      return { data: paged, total };
    }

    const where = [];
    const params = [];
    if (status) {
      params.push(status);
      where.push(`m.status = $${params.length}`);
    }
    if (departmentId) {
      params.push(Number(departmentId));
      where.push(`m.department_id = $${params.length}`);
    }
    if (search) {
      params.push(`%${String(search).toLowerCase()}%`);
      const i = params.length;
      where.push(
        `(LOWER(m.first_name) LIKE $${i} OR LOWER(m.last_name) LIKE $${i} OR LOWER(COALESCE(m.email,'')) LIKE $${i} OR LOWER(COALESCE(m.phone,'')) LIKE $${i})`
      );
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countRes = await query(`SELECT COUNT(*)::int AS total FROM members m ${whereSql}`, params);
    const total = countRes.rows[0].total;

    params.push(safeLimit, offset);
    const { rows } = await query(
      `SELECT m.*, d.name AS department_name
         FROM members m LEFT JOIN departments d ON d.id = m.department_id
         ${whereSql}
        ORDER BY m.last_name ASC, m.first_name ASC
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return { data: rows.map(mapMemberRow), total };
  },

  async findById(id) {
    if (!isPostgres) {
      const m = memory.members.find((x) => x.id === id);
      if (!m) return null;
      const dept = memory.departments.find((d) => d.id === m.departmentId);
      return mapMemberRow({
        ...m,
        first_name: m.firstName,
        last_name: m.lastName,
        department_id: m.departmentId,
        department_name: dept?.name,
        created_at: m.createdAt,
        updated_at: m.updatedAt,
      });
    }
    const { rows } = await query(
      `SELECT m.*, d.name AS department_name
         FROM members m LEFT JOIN departments d ON d.id = m.department_id
        WHERE m.id = $1`,
      [id]
    );
    return mapMemberRow(rows[0]);
  },

  async create({ firstName, lastName, phone, email, departmentId, status, notes }) {
    if (!isPostgres) {
      const member = {
        id: newUuid(),
        firstName,
        lastName,
        phone: phone ?? null,
        email: email ?? null,
        departmentId: departmentId ?? null,
        status: status || "nouveau",
        notes: notes ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      memory.members.push(member);
      return this.findById(member.id);
    }
    const { rows } = await query(
      `INSERT INTO members (first_name, last_name, phone, email, department_id, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [firstName, lastName, phone ?? null, email ?? null, departmentId ?? null, status || "nouveau", notes ?? null]
    );
    return this.findById(rows[0].id);
  },

  async update(id, fields) {
    const allowed = {
      firstName: "first_name",
      lastName: "last_name",
      phone: "phone",
      email: "email",
      departmentId: "department_id",
      status: "status",
      notes: "notes",
    };

    if (!isPostgres) {
      const member = memory.members.find((x) => x.id === id);
      if (!member) return null;
      for (const key of Object.keys(allowed)) {
        if (fields[key] !== undefined) member[key] = fields[key];
      }
      member.updatedAt = new Date().toISOString();
      return this.findById(id);
    }
    const sets = [];
    const params = [];
    for (const [key, column] of Object.entries(allowed)) {
      if (fields[key] !== undefined) {
        params.push(fields[key]);
        sets.push(`${column} = $${params.length}`);
      }
    }
    if (!sets.length) return this.findById(id);
    sets.push("updated_at = now()");
    params.push(id);
    const { rowCount } = await query(
      `UPDATE members SET ${sets.join(", ")} WHERE id = $${params.length}`,
      params
    );
    if (!rowCount) return null;
    return this.findById(id);
  },

  async remove(id) {
    if (!isPostgres) {
      const idx = memory.members.findIndex((x) => x.id === id);
      if (idx === -1) return false;
      memory.members.splice(idx, 1);
      return true;
    }
    const { rowCount } = await query("DELETE FROM members WHERE id = $1", [id]);
    return rowCount > 0;
  },
};

module.exports = {
  isPostgres,
  query,
  init,
  healthcheck,
  close,
  roles,
  users,
  departments,
  members,
  // Exposed for the seed script's idempotency checks in memory mode.
  _memory: memory,
};
