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
  users: [], // populated by the seed script
};

function nextMemoryUserId() {
  // Real UUID so the in-memory store matches the Postgres schema (users.id UUID)
  // and the OpenAPI UserPublic.id (format: uuid).
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
        id: nextMemoryUserId(),
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

module.exports = {
  isPostgres,
  query,
  init,
  healthcheck,
  close,
  roles,
  users,
  // Exposed for the seed script's idempotency checks in memory mode.
  _memory: memory,
};
