const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const config = require("../config/env");

/**
 * Database access layer (SSA v2 — dirigeants / assignés / rapports).
 *
 * Two interchangeable backends behind one interface:
 *  - Postgres (when DATABASE_URL is set) via `pg`.
 *  - An in-memory store (dev/demo fallback) otherwise, so the API boots
 *    and the demo works out of the box.
 */

const isPostgres = Boolean(config.db.url);
let pool = null;

const newUuid = () => crypto.randomUUID();

// --- In-memory store -------------------------------------------------------
const memory = {
  roles: [
    { id: 1, name: "pasteur", description: "Pasteur (Daddy)" },
    { id: 2, name: "pr", description: "Première Responsable" },
    { id: 3, name: "leader", description: "Leader principal" },
    { id: 4, name: "encadreur", description: "Encadreur / Sous-leader" },
    { id: 5, name: "leader_cellule", description: "Leader de cellule" },
  ],
  departments: [
    { id: 1, name: "Faiseurs de Disciples", description: "Intégration des nouveaux venus (7 leçons)" },
    { id: 2, name: "Chorale", description: "Animation musicale des cultes" },
    { id: 3, name: "Audiovisuel", description: "Captation et diffusion des services" },
    { id: 4, name: "Protocole", description: "Protocole et accueil des fidèles" },
    { id: 5, name: "Intercession / Prière", description: "Animation des temps de prière" },
    { id: 6, name: "Évangélisation", description: "Témoignage et recrutement" },
    { id: 7, name: "Ecodim", description: "École du dimanche" },
    { id: 8, name: "Jeunes", description: "Animation et suivi des jeunes membres" },
    { id: 9, name: "Femmes", description: "Encadrement du groupe des femmes" },
    { id: 10, name: "Diaconesse", description: "Diaconat féminin et soutien pastoral" },
    { id: 11, name: "Nettoyage / Logistique", description: "Nettoyage et gestion matérielle" },
    { id: 12, name: "Sécurité Audiovisuelle", description: "Sécurité audiovisuelle et technique" },
    { id: 13, name: "Suivi", description: "Intégration des nouveaux venus et suivi des 7 leçons" },
  ],
  users: [], // comptes (dirigeants) — populated by seed
  assignes: [],
  rapports: [],
  presences: [],
};

// Rôles ayant une vue "administrative" globale (CDC : Pasteur + PR).
const ADMIN_ROLES = ["pasteur", "pr"];

// --- Postgres helpers ------------------------------------------------------
function getPool() {
  if (!isPostgres) return null;
  if (pool) return pool;
  const { Pool } = require("pg");
  pool = new Pool({
    connectionString: config.db.url,
    ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined,
  });
  return pool;
}

async function query(text, params) {
  const p = getPool();
  if (!p) throw new Error("query() called without a Postgres connection");
  return p.query(text, params);
}

// --- Lifecycle -------------------------------------------------------------
let initialized = false;

async function init() {
  if (initialized) return { backend: isPostgres ? "postgres" : "memory" };
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
  if (!isPostgres) return { backend: "memory", ok: true };
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

// --- Mappers ---------------------------------------------------------------
function mapUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    fullName: row.full_name ?? null,
    phone: row.phone ?? null,
    roleId: row.role_id,
    role: row.role ?? null,
    departmentId: row.department_id ?? null,
    departmentName: row.department_name ?? null,
    isActive: row.is_active,
    createdAt: row.created_at ?? null,
  };
}

function memUserToRow(u) {
  const role = memory.roles.find((r) => r.id === u.roleId);
  const dept = memory.departments.find((d) => d.id === u.departmentId);
  return {
    id: u.id,
    email: u.email,
    password_hash: u.passwordHash,
    full_name: u.fullName,
    phone: u.phone,
    role_id: u.roleId,
    role: role?.name,
    department_id: u.departmentId,
    department_name: dept?.name,
    is_active: u.isActive,
    created_at: u.createdAt,
  };
}

function mapDepartmentRow(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, description: row.description ?? null };
}

function mapAssigneRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone ?? null,
    email: row.email ?? null,
    dirigeantId: row.dirigeant_id,
    notes: row.notes ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

function mapRapportRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    dirigeantId: row.dirigeant_id,
    dirigeantName: row.dirigeant_name ?? null,
    departmentName: row.department_name ?? null,
    year: row.year,
    week: row.week,
    presentCount: row.present_count,
    absents: row.absents ?? null,
    remarques: row.remarques ?? null,
    status: row.status,
    reviewComment: row.review_comment ?? null,
    reviewedBy: row.reviewed_by ?? null,
    reviewedByName: row.reviewed_by_name ?? null,
    reviewedAt: row.reviewed_at ?? null,
    submittedAt: row.submitted_at ?? null,
  };
}

// Map an in-memory rapport object (camelCase) through mapRapportRow.
function memRapportRow(r, extra = {}) {
  if (!r) return null;
  return mapRapportRow({
    ...r,
    dirigeant_id: r.dirigeantId,
    present_count: r.presentCount,
    review_comment: r.reviewComment,
    reviewed_by: r.reviewedBy,
    reviewed_at: r.reviewedAt,
    submitted_at: r.submittedAt,
    ...extra,
  });
}

// --- Reference repositories ------------------------------------------------
const roles = {
  async findByName(name) {
    if (!isPostgres) return memory.roles.find((r) => r.name === name) || null;
    const { rows } = await query("SELECT * FROM roles WHERE name = $1", [name]);
    return rows[0] || null;
  },
};

const departments = {
  async list() {
    if (!isPostgres) return memory.departments.map(mapDepartmentRow);
    const { rows } = await query("SELECT * FROM departments ORDER BY name ASC");
    return rows.map(mapDepartmentRow);
  },
  async findById(id) {
    const numId = Number(id);
    if (!isPostgres) return mapDepartmentRow(memory.departments.find((d) => d.id === numId));
    const { rows } = await query("SELECT * FROM departments WHERE id = $1", [numId]);
    return mapDepartmentRow(rows[0]);
  },

  // Per-department stats for { year, week }: dirigeant/assigné counts + submitted.
  async listWithStats({ year, week } = {}) {
    if (!isPostgres) {
      return memory.departments
        .map((dep) => {
          const dirs = memory.users.filter((u) => {
            const role = memory.roles.find((r) => r.id === u.roleId);
            return role && !ADMIN_ROLES.includes(role.name) && u.departmentId === dep.id;
          });
          const dirIds = new Set(dirs.map((d) => d.id));
          const assigneCount = memory.assignes.filter((a) => dirIds.has(a.dirigeantId)).length;
          const soumis = dirs.filter((d) =>
            memory.rapports.some(
              (r) => r.dirigeantId === d.id && r.year === year && r.week === week && r.status === "soumis"
            )
          ).length;
          return {
            id: dep.id,
            name: dep.name,
            description: dep.description ?? null,
            dirigeantCount: dirs.length,
            assigneCount,
            soumis,
            total: dirs.length,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, "fr"));
    }
    const { rows } = await query(
      `SELECT d.id, d.name, d.description,
              (SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.role_id
                 WHERE u.department_id = d.id AND r.name NOT IN ('pasteur','pr'))::int AS dirigeant_count,
              (SELECT COUNT(*) FROM assignes a JOIN users u ON u.id = a.dirigeant_id
                 WHERE u.department_id = d.id)::int AS assigne_count,
              (SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.role_id
                 JOIN rapports rep ON rep.dirigeant_id = u.id AND rep.year = $1 AND rep.week = $2 AND rep.status = 'soumis'
                 WHERE u.department_id = d.id AND r.name NOT IN ('pasteur','pr'))::int AS soumis
         FROM departments d
        ORDER BY d.name ASC`,
      [year, week]
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      dirigeantCount: row.dirigeant_count,
      assigneCount: row.assigne_count,
      soumis: row.soumis,
      total: row.dirigeant_count,
    }));
  },
};

// --- Users (auth) ----------------------------------------------------------
const users = {
  async findByEmail(email) {
    const normalized = String(email || "").trim().toLowerCase();
    if (!isPostgres) {
      const u = memory.users.find((x) => x.email === normalized);
      return u ? mapUserRow(memUserToRow(u)) : null;
    }
    const { rows } = await query(
      `SELECT u.*, r.name AS role, d.name AS department_name
         FROM users u JOIN roles r ON r.id = u.role_id
         LEFT JOIN departments d ON d.id = u.department_id
        WHERE u.email = $1`,
      [normalized]
    );
    return mapUserRow(rows[0]);
  },

  // Login identifier = email OR phone (CDC EF-02). Phone is matched on digits
  // only, so "+237 6 99 11 22 33" and "+237699112233" are equivalent.
  async findByIdentifier(identifier) {
    const raw = String(identifier || "").trim();
    const asEmail = raw.toLowerCase();
    const digits = raw.replace(/\D/g, "");
    const phoneLookup = digits.length >= 6 ? digits : null; // avoid matching emails

    if (!isPostgres) {
      const u = memory.users.find(
        (x) =>
          x.email === asEmail ||
          (phoneLookup && x.phone && x.phone.replace(/\D/g, "") === phoneLookup)
      );
      return u ? mapUserRow(memUserToRow(u)) : null;
    }

    const clauses = ["u.email = $1"];
    const params = [asEmail];
    if (phoneLookup) {
      params.push(phoneLookup);
      clauses.push(`regexp_replace(COALESCE(u.phone,''), '\\D', '', 'g') = $${params.length}`);
    }
    const { rows } = await query(
      `SELECT u.*, r.name AS role, d.name AS department_name
         FROM users u JOIN roles r ON r.id = u.role_id
         LEFT JOIN departments d ON d.id = u.department_id
        WHERE ${clauses.join(" OR ")}`,
      params
    );
    return mapUserRow(rows[0]);
  },

  async findById(id) {
    if (!isPostgres) {
      const u = memory.users.find((x) => x.id === id);
      return u ? mapUserRow(memUserToRow(u)) : null;
    }
    const { rows } = await query(
      `SELECT u.*, r.name AS role, d.name AS department_name
         FROM users u JOIN roles r ON r.id = u.role_id
         LEFT JOIN departments d ON d.id = u.department_id
        WHERE u.id = $1`,
      [id]
    );
    return mapUserRow(rows[0]);
  },

  async create({ email, passwordHash, fullName, phone, roleId, departmentId }) {
    const normalized = String(email).trim().toLowerCase();
    if (!isPostgres) {
      const u = {
        id: newUuid(),
        email: normalized,
        passwordHash,
        fullName: fullName ?? null,
        phone: phone ?? null,
        roleId,
        departmentId: departmentId ?? null,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      memory.users.push(u);
      return this.findById(u.id);
    }
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, full_name, phone, role_id, department_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [normalized, passwordHash, fullName ?? null, phone ?? null, roleId, departmentId ?? null]
    );
    return this.findById(rows[0].id);
  },
};

// --- Dirigeants (users with role leader/encadreur, + aggregates) -----------
const dirigeants = {
  // List dirigeants (leaders/encadreurs/cell leaders — never Pasteur/PR) with
  // department, assigné count, and report status for { year, week }.
  // `scope` enforces RBAC visibility: { departmentId } (leader) or { selfId }.
  async list({ search, departmentId, year, week, scope } = {}) {
    if (!isPostgres) {
      let rows = memory.users.filter((u) => {
        const role = memory.roles.find((r) => r.id === u.roleId);
        return role && !ADMIN_ROLES.includes(role.name);
      });
      if (scope?.selfId) rows = rows.filter((u) => u.id === scope.selfId);
      if (scope?.departmentId) rows = rows.filter((u) => u.departmentId === scope.departmentId);
      if (departmentId) rows = rows.filter((u) => u.departmentId === Number(departmentId));
      if (search) {
        const q = String(search).toLowerCase();
        rows = rows.filter((u) =>
          `${u.fullName || ""} ${u.email}`.toLowerCase().includes(q)
        );
      }
      const mapped = rows.map((u) => {
        const base = mapUserRow(memUserToRow(u));
        const assigneCount = memory.assignes.filter((a) => a.dirigeantId === u.id).length;
        const rep = memory.rapports.find(
          (r) => r.dirigeantId === u.id && r.year === year && r.week === week
        );
        return {
          id: base.id,
          fullName: base.fullName,
          email: base.email,
          phone: base.phone,
          role: base.role,
          departmentId: base.departmentId,
          departmentName: base.departmentName,
          assigneCount,
          reportStatus: rep ? rep.status : null,
        };
      });
      mapped.sort((a, b) => String(a.fullName).localeCompare(String(b.fullName), "fr"));
      return mapped;
    }

    const params = [year, week];
    const where = ["r.name NOT IN ('pasteur','pr')"];
    if (scope?.selfId) {
      params.push(scope.selfId);
      where.push(`u.id = $${params.length}`);
    }
    if (scope?.departmentId) {
      params.push(scope.departmentId);
      where.push(`u.department_id = $${params.length}`);
    }
    if (departmentId) {
      params.push(Number(departmentId));
      where.push(`u.department_id = $${params.length}`);
    }
    if (search) {
      params.push(`%${String(search).toLowerCase()}%`);
      where.push(`(LOWER(COALESCE(u.full_name,'')) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`);
    }
    const { rows } = await query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.department_id,
              r.name AS role, d.name AS department_name,
              (SELECT COUNT(*) FROM assignes a WHERE a.dirigeant_id = u.id)::int AS assigne_count,
              rep.status AS report_status
         FROM users u
         JOIN roles r ON r.id = u.role_id
         LEFT JOIN departments d ON d.id = u.department_id
         LEFT JOIN rapports rep ON rep.dirigeant_id = u.id AND rep.year = $1 AND rep.week = $2
        WHERE ${where.join(" AND ")}
        ORDER BY u.full_name ASC`,
      params
    );
    return rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      departmentId: row.department_id,
      departmentName: row.department_name,
      assigneCount: row.assigne_count,
      reportStatus: row.report_status ?? null,
    }));
  },

  // Detail = the user record (reuse users.findById).
  findById(id) {
    return users.findById(id);
  },

  async update(id, fields) {
    const allowed = {
      fullName: "full_name",
      phone: "phone",
      departmentId: "department_id",
    };
    if (!isPostgres) {
      const u = memory.users.find((x) => x.id === id);
      if (!u) return null;
      for (const key of Object.keys(allowed)) {
        if (fields[key] !== undefined) u[key] = fields[key];
      }
      return users.findById(id);
    }
    const sets = [];
    const params = [];
    for (const [key, column] of Object.entries(allowed)) {
      if (fields[key] !== undefined) {
        params.push(fields[key]);
        sets.push(`${column} = $${params.length}`);
      }
    }
    if (!sets.length) return users.findById(id);
    sets.push("updated_at = now()");
    params.push(id);
    const { rowCount } = await query(`UPDATE users SET ${sets.join(", ")} WHERE id = $${params.length}`, params);
    if (!rowCount) return null;
    return users.findById(id);
  },
};

// --- Assignés (rattachés à un dirigeant) -----------------------------------
const assignes = {
  // Global directory (annuaire) of assignés, enriched with dirigeant + department.
  // `scope`: { dirigeantId } (encadreur — own) or { departmentId } (leader).
  async listAll({ search, departmentId, scope } = {}) {
    if (!isPostgres) {
      let rows = memory.assignes.map((a) => {
        const dir = memory.users.find((u) => u.id === a.dirigeantId);
        const dept = dir && memory.departments.find((d) => d.id === dir.departmentId);
        return {
          ...mapAssigneRow({
            ...a, first_name: a.firstName, last_name: a.lastName,
            dirigeant_id: a.dirigeantId, created_at: a.createdAt, updated_at: a.updatedAt,
          }),
          dirigeantName: dir?.fullName ?? null,
          departmentId: dir?.departmentId ?? null,
          departmentName: dept?.name ?? null,
        };
      });
      if (scope?.dirigeantId) rows = rows.filter((r) => r.dirigeantId === scope.dirigeantId);
      if (scope?.departmentId) rows = rows.filter((r) => r.departmentId === scope.departmentId);
      if (departmentId) rows = rows.filter((r) => r.departmentId === Number(departmentId));
      if (search) {
        const q = String(search).toLowerCase();
        rows = rows.filter((r) =>
          `${r.firstName} ${r.lastName} ${r.phone || ""} ${r.email || ""}`.toLowerCase().includes(q)
        );
      }
      return rows.sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "fr")
      );
    }

    const params = [];
    const where = [];
    if (scope?.dirigeantId) {
      params.push(scope.dirigeantId);
      where.push(`a.dirigeant_id = $${params.length}`);
    }
    if (scope?.departmentId) {
      params.push(scope.departmentId);
      where.push(`u.department_id = $${params.length}`);
    }
    if (departmentId) {
      params.push(Number(departmentId));
      where.push(`u.department_id = $${params.length}`);
    }
    if (search) {
      params.push(`%${String(search).toLowerCase()}%`);
      const i = params.length;
      where.push(
        `(LOWER(a.first_name) LIKE $${i} OR LOWER(a.last_name) LIKE $${i} OR LOWER(COALESCE(a.phone,'')) LIKE $${i} OR LOWER(COALESCE(a.email,'')) LIKE $${i})`
      );
    }
    const { rows } = await query(
      `SELECT a.*, u.full_name AS dirigeant_name, u.department_id, d.name AS department_name
         FROM assignes a
         JOIN users u ON u.id = a.dirigeant_id
         LEFT JOIN departments d ON d.id = u.department_id
         ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY a.last_name ASC, a.first_name ASC`,
      params
    );
    return rows.map((r) => ({
      ...mapAssigneRow(r),
      dirigeantName: r.dirigeant_name ?? null,
      departmentId: r.department_id ?? null,
      departmentName: r.department_name ?? null,
    }));
  },

  async listByDirigeant(dirigeantId) {
    if (!isPostgres) {
      return memory.assignes
        .filter((a) => a.dirigeantId === dirigeantId)
        .map((a) => mapAssigneRow({
          ...a, first_name: a.firstName, last_name: a.lastName,
          dirigeant_id: a.dirigeantId, created_at: a.createdAt, updated_at: a.updatedAt,
        }))
        .sort((x, y) => `${x.lastName} ${x.firstName}`.localeCompare(`${y.lastName} ${y.firstName}`, "fr"));
    }
    const { rows } = await query(
      `SELECT * FROM assignes WHERE dirigeant_id = $1 ORDER BY last_name ASC, first_name ASC`,
      [dirigeantId]
    );
    return rows.map(mapAssigneRow);
  },

  async findById(id) {
    if (!isPostgres) {
      const a = memory.assignes.find((x) => x.id === id);
      return a ? mapAssigneRow({
        ...a, first_name: a.firstName, last_name: a.lastName,
        dirigeant_id: a.dirigeantId, created_at: a.createdAt, updated_at: a.updatedAt,
      }) : null;
    }
    const { rows } = await query("SELECT * FROM assignes WHERE id = $1", [id]);
    return mapAssigneRow(rows[0]);
  },

  async create({ firstName, lastName, phone, email, dirigeantId, notes }) {
    if (!isPostgres) {
      const a = {
        id: newUuid(), firstName, lastName, phone: phone ?? null, email: email ?? null,
        dirigeantId, notes: notes ?? null,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      memory.assignes.push(a);
      return this.findById(a.id);
    }
    const { rows } = await query(
      `INSERT INTO assignes (first_name, last_name, phone, email, dirigeant_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [firstName, lastName, phone ?? null, email ?? null, dirigeantId, notes ?? null]
    );
    return this.findById(rows[0].id);
  },

  async update(id, fields) {
    const allowed = {
      firstName: "first_name", lastName: "last_name",
      phone: "phone", email: "email", notes: "notes",
    };
    if (!isPostgres) {
      const a = memory.assignes.find((x) => x.id === id);
      if (!a) return null;
      for (const key of Object.keys(allowed)) {
        if (fields[key] !== undefined) a[key] = fields[key];
      }
      a.updatedAt = new Date().toISOString();
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
    const { rowCount } = await query(`UPDATE assignes SET ${sets.join(", ")} WHERE id = $${params.length}`, params);
    if (!rowCount) return null;
    return this.findById(id);
  },

  async remove(id) {
    if (!isPostgres) {
      const i = memory.assignes.findIndex((x) => x.id === id);
      if (i === -1) return false;
      memory.assignes.splice(i, 1);
      return true;
    }
    const { rowCount } = await query("DELETE FROM assignes WHERE id = $1", [id]);
    return rowCount > 0;
  },
};

// --- Rapports hebdomadaires ------------------------------------------------
const rapports = {
  async findById(id) {
    if (!isPostgres) {
      return memRapportRow(memory.rapports.find((x) => x.id === id));
    }
    const { rows } = await query("SELECT * FROM rapports WHERE id = $1", [id]);
    return mapRapportRow(rows[0]);
  },

  // Validate a submitted fiche or send it back for correction.
  // action: 'valide' | 'a_corriger'. Records the reviewer + comment.
  async review(id, { action, comment, reviewerId }) {
    const reviewedAt = new Date().toISOString();
    if (!isPostgres) {
      const r = memory.rapports.find((x) => x.id === id);
      if (!r) return null;
      r.status = action;
      r.reviewComment = comment ?? null;
      r.reviewedBy = reviewerId;
      r.reviewedAt = reviewedAt;
      return memRapportRow(r);
    }
    await query(
      `UPDATE rapports SET status = $1, review_comment = $2, reviewed_by = $3, reviewed_at = $4, updated_at = now()
        WHERE id = $5`,
      [action, comment ?? null, reviewerId, reviewedAt, id]
    );
    return this.findById(id);
  },

  async findByDirigeantWeek(dirigeantId, year, week) {
    if (!isPostgres) {
      const r = memory.rapports.find(
        (x) => x.dirigeantId === dirigeantId && x.year === year && x.week === week
      );
      return r ? memRapportRow(r) : null;
    }
    const { rows } = await query(
      "SELECT * FROM rapports WHERE dirigeant_id = $1 AND year = $2 AND week = $3",
      [dirigeantId, year, week]
    );
    return mapRapportRow(rows[0]);
  },

  async listByDirigeant(dirigeantId) {
    if (!isPostgres) {
      return memory.rapports
        .filter((r) => r.dirigeantId === dirigeantId)
        .map((r) => memRapportRow(r))
        .sort((a, b) => b.year - a.year || b.week - a.week);
    }
    const { rows } = await query(
      "SELECT * FROM rapports WHERE dirigeant_id = $1 ORDER BY year DESC, week DESC",
      [dirigeantId]
    );
    return rows.map(mapRapportRow);
  },

  // Presences of a fiche, as [{ assigneId, statut }].
  async getPresences(rapportId) {
    if (!isPostgres) {
      return memory.presences
        .filter((p) => p.rapportId === rapportId)
        .map((p) => ({ assigneId: p.assigneId, statut: p.statut }));
    }
    const { rows } = await query("SELECT assigne_id, statut FROM presences WHERE rapport_id = $1", [rapportId]);
    return rows.map((r) => ({ assigneId: r.assigne_id, statut: r.statut }));
  },

  // The fiche for a dirigeant + week, with its presences.
  async findFiche(dirigeantId, year, week) {
    const rapport = await this.findByDirigeantWeek(dirigeantId, year, week);
    if (!rapport) return { rapport: null, presences: [] };
    return { rapport, presences: await this.getPresences(rapport.id) };
  },

  // Create/update the fiche (upsert) with optional per-assigné presences.
  // status: 'soumis' (default) | 'brouillon'. When `presences` is provided,
  // present_count is derived from it; otherwise `presentCount` is used (legacy).
  async submit({ dirigeantId, year, week, presentCount, absents, remarques, status = "soumis", presences }) {
    const hasPresences = Array.isArray(presences);
    const derivedCount = hasPresences
      ? presences.filter((p) => p.statut === "present").length
      : presentCount ?? 0;
    const submittedAt = status === "soumis" ? new Date().toISOString() : null;

    if (!isPostgres) {
      let r = memory.rapports.find(
        (x) => x.dirigeantId === dirigeantId && x.year === year && x.week === week
      );
      if (!r) {
        r = { id: newUuid(), dirigeantId, year, week };
        memory.rapports.push(r);
      }
      Object.assign(r, {
        presentCount: derivedCount,
        absents: absents ?? r.absents ?? null,
        remarques: remarques ?? null,
        status,
        submittedAt,
        // A fresh save/submit supersedes any prior review.
        reviewComment: null,
        reviewedBy: null,
        reviewedAt: null,
      });
      if (hasPresences) {
        memory.presences = memory.presences.filter((p) => p.rapportId !== r.id);
        for (const p of presences) {
          memory.presences.push({ id: newUuid(), rapportId: r.id, assigneId: p.assigneId, statut: p.statut });
        }
      }
      return this.findByDirigeantWeek(dirigeantId, year, week);
    }

    const { rows } = await query(
      `INSERT INTO rapports (dirigeant_id, year, week, present_count, absents, remarques, status, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (dirigeant_id, year, week)
       DO UPDATE SET present_count = EXCLUDED.present_count, absents = EXCLUDED.absents,
                     remarques = EXCLUDED.remarques, status = EXCLUDED.status,
                     submitted_at = EXCLUDED.submitted_at, updated_at = now(),
                     review_comment = NULL, reviewed_by = NULL, reviewed_at = NULL
       RETURNING id`,
      [dirigeantId, year, week, derivedCount, absents ?? null, remarques ?? null, status, submittedAt]
    );
    const rapportId = rows[0].id;
    if (hasPresences) {
      await query("DELETE FROM presences WHERE rapport_id = $1", [rapportId]);
      for (const p of presences) {
        await query(
          "INSERT INTO presences (rapport_id, assigne_id, statut) VALUES ($1, $2, $3)",
          [rapportId, p.assigneId, p.statut]
        );
      }
    }
    const { rows: full } = await query("SELECT * FROM rapports WHERE id = $1", [rapportId]);
    return mapRapportRow(full[0]);
  },

  // All submitted reports for a given week (joined with dirigeant + department).
  async listByWeek(year, week) {
    if (!isPostgres) {
      return memory.rapports
        .filter((r) => r.year === year && r.week === week)
        .map((r) => {
          const u = memory.users.find((x) => x.id === r.dirigeantId);
          const dept = u && memory.departments.find((d) => d.id === u.departmentId);
          return mapRapportRow({
            ...r, dirigeant_id: r.dirigeantId, present_count: r.presentCount, submitted_at: r.submittedAt,
            dirigeant_name: u?.fullName, department_name: dept?.name,
          });
        });
    }
    const { rows } = await query(
      `SELECT rep.*, u.full_name AS dirigeant_name, d.name AS department_name
         FROM rapports rep
         JOIN users u ON u.id = rep.dirigeant_id
         LEFT JOIN departments d ON d.id = u.department_id
        WHERE rep.year = $1 AND rep.week = $2
        ORDER BY u.full_name ASC`,
      [year, week]
    );
    return rows.map(mapRapportRow);
  },
};

module.exports = {
  isPostgres,
  query,
  init,
  healthcheck,
  close,
  roles,
  departments,
  users,
  dirigeants,
  assignes,
  rapports,
  ADMIN_ROLES,
  _memory: memory,
};
