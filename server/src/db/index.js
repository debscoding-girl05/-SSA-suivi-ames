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
  cellules: [],
  fichesCellule: [],
  rapports: [],
  presences: [],
  reports: [],
  progressions: [],
  notifications: [],
  invitations: [],
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
    dateNaissance: row.date_naissance ?? null,
    sexe: row.sexe ?? null,
    adresse: row.adresse ?? null,
    zoneResidence: row.zone_residence ?? null,
    dirigeantId: row.dirigeant_id,
    celluleId: row.cellule_id ?? null,
    celluleName: row.cellule_name ?? null,
    notes: row.notes ?? null,
    statut: row.statut ?? "regulier",
    firstSeenAt: row.first_seen_at ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

// Map an in-memory assigné (camelCase) through mapAssigneRow.
function memAssigneRow(a, extra = {}) {
  if (!a) return null;
  return mapAssigneRow({
    ...a,
    first_name: a.firstName,
    last_name: a.lastName,
    dirigeant_id: a.dirigeantId,
    cellule_id: a.celluleId,
    statut: a.statut,
    date_naissance: a.dateNaissance,
    sexe: a.sexe,
    adresse: a.adresse,
    zone_residence: a.zoneResidence,
    first_seen_at: a.firstSeenAt,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
    ...extra,
  });
}

// --- Cellules de prière (Module 8) -----------------------------------------
function mapCelluleRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    nom: row.nom,
    leaderId: row.leader_id ?? null,
    leaderName: row.leader_name ?? null,
    departmentId: row.department_id ?? null,
    departmentName: row.department_name ?? null,
    jourReunion: row.jour_reunion ?? null,
    lieu: row.lieu ?? null,
    actif: row.actif ?? true,
    memberCount: row.member_count != null ? Number(row.member_count) : undefined,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

function memCelluleRow(c, extra = {}) {
  if (!c) return null;
  return mapCelluleRow({
    ...c,
    leader_id: c.leaderId,
    department_id: c.departmentId,
    jour_reunion: c.jourReunion,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    ...extra,
  });
}

function mapFicheCelluleRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    celluleId: row.cellule_id,
    celluleName: row.cellule_name ?? null,
    year: row.year,
    week: row.week,
    presentCount: row.present_count ?? 0,
    effectif: row.effectif ?? 0,
    notes: row.notes ?? null,
    status: row.status,
    submittedAt: row.submitted_at ?? null,
    validatedAt: row.validated_at ?? null,
  };
}

function memFicheCelluleRow(f, extra = {}) {
  if (!f) return null;
  return mapFicheCelluleRow({
    ...f,
    cellule_id: f.celluleId,
    present_count: f.presentCount,
    submitted_at: f.submittedAt,
    validated_at: f.validatedAt,
    ...extra,
  });
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

  async updatePassword(id, passwordHash) {
    if (!isPostgres) {
      const u = memory.users.find((x) => x.id === id);
      if (!u) return false;
      u.passwordHash = passwordHash;
      return true;
    }
    const { rowCount } = await query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, id]);
    return rowCount > 0;
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
          isActive: base.isActive,
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
      `SELECT u.id, u.full_name, u.email, u.phone, u.department_id, u.is_active,
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
      isActive: row.is_active,
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

  // Deactivate/reactivate an account (CDC EF-05). Never deletes — preserves
  // history. The login flow already rejects inactive accounts.
  async setActive(id, isActive) {
    if (!isPostgres) {
      const u = memory.users.find((x) => x.id === id);
      if (!u) return null;
      u.isActive = isActive;
      return users.findById(id);
    }
    const { rowCount } = await query("UPDATE users SET is_active = $1, updated_at = now() WHERE id = $2", [isActive, id]);
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
          ...memAssigneRow(a),
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
        .map((a) => memAssigneRow(a))
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
      return a ? memAssigneRow(a) : null;
    }
    const { rows } = await query("SELECT * FROM assignes WHERE id = $1", [id]);
    return mapAssigneRow(rows[0]);
  },

  async create({ firstName, lastName, phone, email, dateNaissance, sexe, adresse, zoneResidence, dirigeantId, celluleId, notes, statut, firstSeenAt }) {
    if (!isPostgres) {
      const a = {
        id: newUuid(), firstName, lastName, phone: phone ?? null, email: email ?? null,
        dateNaissance: dateNaissance ?? null, sexe: sexe ?? null,
        adresse: adresse ?? null, zoneResidence: zoneResidence ?? null,
        dirigeantId, celluleId: celluleId ?? null, notes: notes ?? null,
        statut: statut || "regulier", firstSeenAt: firstSeenAt ?? null,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      memory.assignes.push(a);
      return this.findById(a.id);
    }
    const { rows } = await query(
      `INSERT INTO assignes (first_name, last_name, phone, email, date_naissance, sexe, adresse, zone_residence, dirigeant_id, cellule_id, notes, statut, first_seen_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
      [firstName, lastName, phone ?? null, email ?? null, dateNaissance ?? null, sexe ?? null, adresse ?? null, zoneResidence ?? null, dirigeantId, celluleId ?? null, notes ?? null, statut || "regulier", firstSeenAt ?? null]
    );
    return this.findById(rows[0].id);
  },

  async update(id, fields) {
    const allowed = {
      firstName: "first_name", lastName: "last_name",
      phone: "phone", email: "email", notes: "notes", statut: "statut",
      dateNaissance: "date_naissance", sexe: "sexe",
      adresse: "adresse", zoneResidence: "zone_residence",
      celluleId: "cellule_id",
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
const cellules = {
  // `scope`: { leaderId } (leader_cellule — sa propre cellule) or { departmentId } (leader).
  async list({ scope } = {}) {
    if (!isPostgres) {
      let rows = memory.cellules.map((c) => {
        const leader = memory.users.find((u) => u.id === c.leaderId);
        const dept = memory.departments.find((d) => d.id === c.departmentId);
        const memberCount = memory.assignes.filter((a) => a.celluleId === c.id).length;
        return memCelluleRow(c, { leader_name: leader?.fullName ?? null, department_name: dept?.name ?? null, member_count: memberCount });
      });
      if (scope?.leaderId) rows = rows.filter((r) => r.leaderId === scope.leaderId);
      if (scope?.departmentId) rows = rows.filter((r) => r.departmentId === scope.departmentId);
      return rows.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    }
    const params = [];
    const where = [];
    if (scope?.leaderId) {
      params.push(scope.leaderId);
      where.push(`c.leader_id = $${params.length}`);
    }
    if (scope?.departmentId) {
      params.push(scope.departmentId);
      where.push(`c.department_id = $${params.length}`);
    }
    const { rows } = await query(
      `SELECT c.*, u.full_name AS leader_name, d.name AS department_name,
              (SELECT COUNT(*) FROM assignes a WHERE a.cellule_id = c.id) AS member_count
         FROM cellules c
         LEFT JOIN users u ON u.id = c.leader_id
         LEFT JOIN departments d ON d.id = c.department_id
         ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY c.nom ASC`,
      params
    );
    return rows.map(mapCelluleRow);
  },

  async findById(id) {
    if (!isPostgres) {
      const c = memory.cellules.find((x) => x.id === id);
      if (!c) return null;
      const leader = memory.users.find((u) => u.id === c.leaderId);
      const dept = memory.departments.find((d) => d.id === c.departmentId);
      const memberCount = memory.assignes.filter((a) => a.celluleId === c.id).length;
      return memCelluleRow(c, { leader_name: leader?.fullName ?? null, department_name: dept?.name ?? null, member_count: memberCount });
    }
    const { rows } = await query(
      `SELECT c.*, u.full_name AS leader_name, d.name AS department_name,
              (SELECT COUNT(*) FROM assignes a WHERE a.cellule_id = c.id) AS member_count
         FROM cellules c
         LEFT JOIN users u ON u.id = c.leader_id
         LEFT JOIN departments d ON d.id = c.department_id
        WHERE c.id = $1`,
      [id]
    );
    return mapCelluleRow(rows[0]);
  },

  async create({ nom, leaderId, departmentId, jourReunion, lieu }) {
    if (!isPostgres) {
      const c = {
        id: newUuid(), nom, leaderId: leaderId ?? null, departmentId: departmentId ?? null,
        jourReunion: jourReunion ?? null, lieu: lieu ?? null, actif: true,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      memory.cellules.push(c);
      return this.findById(c.id);
    }
    const { rows } = await query(
      `INSERT INTO cellules (nom, leader_id, department_id, jour_reunion, lieu)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [nom, leaderId ?? null, departmentId ?? null, jourReunion ?? null, lieu ?? null]
    );
    return this.findById(rows[0].id);
  },

  async update(id, fields) {
    const allowed = {
      nom: "nom", leaderId: "leader_id", departmentId: "department_id",
      jourReunion: "jour_reunion", lieu: "lieu", actif: "actif",
    };
    if (!isPostgres) {
      const c = memory.cellules.find((x) => x.id === id);
      if (!c) return null;
      for (const key of Object.keys(allowed)) {
        if (fields[key] !== undefined) c[key] = fields[key];
      }
      c.updatedAt = new Date().toISOString();
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
    const { rowCount } = await query(`UPDATE cellules SET ${sets.join(", ")} WHERE id = $${params.length}`, params);
    if (!rowCount) return null;
    return this.findById(id);
  },

  // Members (assignés) currently attached to a cellule.
  async listMembers(celluleId) {
    if (!isPostgres) {
      return memory.assignes
        .filter((a) => a.celluleId === celluleId)
        .map((a) => memAssigneRow(a))
        .sort((x, y) => `${x.lastName} ${x.firstName}`.localeCompare(`${y.lastName} ${y.firstName}`, "fr"));
    }
    const { rows } = await query(
      "SELECT * FROM assignes WHERE cellule_id = $1 ORDER BY last_name ASC, first_name ASC",
      [celluleId]
    );
    return rows.map(mapAssigneRow);
  },

  // --- Fiche hebdomadaire de cellule (remontée au département) -----------
  async findFicheByCelluleWeek(celluleId, year, week) {
    if (!isPostgres) {
      const f = memory.fichesCellule.find((x) => x.celluleId === celluleId && x.year === year && x.week === week);
      return f ? memFicheCelluleRow(f) : null;
    }
    const { rows } = await query(
      "SELECT * FROM fiches_cellule WHERE cellule_id = $1 AND year = $2 AND week = $3",
      [celluleId, year, week]
    );
    return mapFicheCelluleRow(rows[0]);
  },

  async submitFiche({ celluleId, year, week, presentCount, effectif, notes, status = "soumis" }) {
    const submittedAt = status === "soumis" ? new Date().toISOString() : null;
    if (!isPostgres) {
      let f = memory.fichesCellule.find((x) => x.celluleId === celluleId && x.year === year && x.week === week);
      if (!f) {
        f = { id: newUuid(), celluleId, year, week };
        memory.fichesCellule.push(f);
      }
      Object.assign(f, {
        presentCount: presentCount ?? 0, effectif: effectif ?? 0,
        notes: notes ?? null, status, submittedAt, validatedAt: null,
      });
      return this.findFicheByCelluleWeek(celluleId, year, week);
    }
    const { rows } = await query(
      `INSERT INTO fiches_cellule (cellule_id, year, week, present_count, effectif, notes, status, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (cellule_id, year, week)
       DO UPDATE SET present_count = EXCLUDED.present_count, effectif = EXCLUDED.effectif,
                     notes = EXCLUDED.notes, status = EXCLUDED.status,
                     submitted_at = EXCLUDED.submitted_at, updated_at = now(), validated_at = NULL
       RETURNING id`,
      [celluleId, year, week, presentCount ?? 0, effectif ?? 0, notes ?? null, status, submittedAt]
    );
    return this.findFicheById(rows[0].id);
  },

  async findFicheById(id) {
    if (!isPostgres) {
      return memFicheCelluleRow(memory.fichesCellule.find((x) => x.id === id));
    }
    const { rows } = await query(
      `SELECT fc.*, c.nom AS cellule_name FROM fiches_cellule fc JOIN cellules c ON c.id = fc.cellule_id WHERE fc.id = $1`,
      [id]
    );
    return mapFicheCelluleRow(rows[0]);
  },

  // Validate a submitted fiche, marking it 'valide' (remontée au département).
  async validateFiche(id) {
    const validatedAt = new Date().toISOString();
    if (!isPostgres) {
      const f = memory.fichesCellule.find((x) => x.id === id);
      if (!f) return null;
      f.status = "valide";
      f.validatedAt = validatedAt;
      return memFicheCelluleRow(f);
    }
    await query("UPDATE fiches_cellule SET status = 'valide', validated_at = $1, updated_at = now() WHERE id = $2", [validatedAt, id]);
    return this.findFicheById(id);
  },

  // All fiches for a given week, joined with cellule name (department overview).
  async listFichesByWeek(year, week) {
    if (!isPostgres) {
      return memory.fichesCellule
        .filter((f) => f.year === year && f.week === week)
        .map((f) => {
          const c = memory.cellules.find((x) => x.id === f.celluleId);
          return memFicheCelluleRow(f, { cellule_name: c?.nom ?? null });
        });
    }
    const { rows } = await query(
      `SELECT fc.*, c.nom AS cellule_name FROM fiches_cellule fc
         JOIN cellules c ON c.id = fc.cellule_id
        WHERE fc.year = $1 AND fc.week = $2
        ORDER BY c.nom ASC`,
      [year, week]
    );
    return rows.map(mapFicheCelluleRow);
  },
};

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

// --- Rapports-documents (synthèses narratives, Module 6) -------------------
function mapReportRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name ?? null,
    level: row.level,
    departmentId: row.department_id ?? null,
    departmentName: row.department_name ?? null,
    title: row.title,
    content: row.content ?? "",
    year: row.year,
    week: row.week,
    status: row.status,
    transmittedAt: row.transmitted_at ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

function memReportToRow(r) {
  const author = memory.users.find((u) => u.id === r.authorId);
  const dept = memory.departments.find((d) => d.id === r.departmentId);
  return {
    ...r,
    author_id: r.authorId,
    author_name: author?.fullName ?? null,
    department_id: r.departmentId,
    department_name: dept?.name ?? null,
    transmitted_at: r.transmittedAt,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

const reports = {
  // scope: undefined (PR/Pasteur → tout) | { departmentId } (leader → son dépt).
  async list({ scope } = {}) {
    if (!isPostgres) {
      let rows = memory.reports.slice();
      if (scope?.departmentId != null) rows = rows.filter((r) => r.departmentId === scope.departmentId);
      return rows
        .map(memReportToRow)
        .map(mapReportRow)
        .sort((a, b) => b.year - a.year || b.week - a.week || (b.createdAt || "").localeCompare(a.createdAt || ""));
    }
    const params = [];
    let where = "";
    if (scope?.departmentId != null) {
      params.push(scope.departmentId);
      where = `WHERE r.department_id = $${params.length}`;
    }
    const { rows } = await query(
      `SELECT r.*, u.full_name AS author_name, d.name AS department_name
         FROM reports r
         JOIN users u ON u.id = r.author_id
         LEFT JOIN departments d ON d.id = r.department_id
         ${where}
        ORDER BY r.year DESC, r.week DESC, r.created_at DESC`,
      params
    );
    return rows.map(mapReportRow);
  },

  async listByAuthor(authorId) {
    if (!isPostgres) {
      return memory.reports
        .filter((r) => r.authorId === authorId)
        .map(memReportToRow)
        .map(mapReportRow)
        .sort((a, b) => b.year - a.year || b.week - a.week);
    }
    const { rows } = await query(
      `SELECT r.*, u.full_name AS author_name, d.name AS department_name
         FROM reports r JOIN users u ON u.id = r.author_id
         LEFT JOIN departments d ON d.id = r.department_id
        WHERE r.author_id = $1
        ORDER BY r.year DESC, r.week DESC`,
      [authorId]
    );
    return rows.map(mapReportRow);
  },

  async findById(id) {
    if (!isPostgres) {
      const r = memory.reports.find((x) => x.id === id);
      return r ? mapReportRow(memReportToRow(r)) : null;
    }
    const { rows } = await query(
      `SELECT r.*, u.full_name AS author_name, d.name AS department_name
         FROM reports r JOIN users u ON u.id = r.author_id
         LEFT JOIN departments d ON d.id = r.department_id
        WHERE r.id = $1`,
      [id]
    );
    return mapReportRow(rows[0]);
  },

  async create({ authorId, level, departmentId, title, content, year, week }) {
    if (!isPostgres) {
      const r = {
        id: newUuid(), authorId, level, departmentId: departmentId ?? null,
        title, content: content ?? "", year, week, status: "brouillon",
        transmittedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      memory.reports.push(r);
      return this.findById(r.id);
    }
    const { rows } = await query(
      `INSERT INTO reports (author_id, level, department_id, title, content, year, week)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [authorId, level, departmentId ?? null, title, content ?? "", year, week]
    );
    return this.findById(rows[0].id);
  },

  async update(id, { title, content }) {
    if (!isPostgres) {
      const r = memory.reports.find((x) => x.id === id);
      if (!r) return null;
      if (title !== undefined) r.title = title;
      if (content !== undefined) r.content = content;
      r.updatedAt = new Date().toISOString();
      return this.findById(id);
    }
    const sets = [];
    const params = [];
    if (title !== undefined) { params.push(title); sets.push(`title = $${params.length}`); }
    if (content !== undefined) { params.push(content); sets.push(`content = $${params.length}`); }
    if (!sets.length) return this.findById(id);
    sets.push("updated_at = now()");
    params.push(id);
    await query(`UPDATE reports SET ${sets.join(", ")} WHERE id = $${params.length}`, params);
    return this.findById(id);
  },

  async transmit(id) {
    if (!isPostgres) {
      const r = memory.reports.find((x) => x.id === id);
      if (!r) return null;
      r.status = "transmis";
      r.transmittedAt = new Date().toISOString();
      r.updatedAt = r.transmittedAt;
      return this.findById(id);
    }
    await query("UPDATE reports SET status = 'transmis', transmitted_at = now(), updated_at = now() WHERE id = $1", [id]);
    return this.findById(id);
  },

  async remove(id) {
    if (!isPostgres) {
      const i = memory.reports.findIndex((x) => x.id === id);
      if (i === -1) return false;
      memory.reports.splice(i, 1);
      return true;
    }
    const { rowCount } = await query("DELETE FROM reports WHERE id = $1", [id]);
    return rowCount > 0;
  },
};

// --- Intégration : nouveaux venus + 7 leçons (Module 4) --------------------
const FD_DEPT_NAMES = ["Faiseurs de Disciples", "Suivi"];

const integration = {
  // Nouveaux venus (assignés statut 'nouveau') du périmètre FD/Suivi, enrichis.
  async listNouveaux({ scope } = {}) {
    if (!isPostgres) {
      const fd = new Set(FD_DEPT_NAMES);
      let rows = memory.assignes
        .filter((a) => a.statut === "nouveau")
        .map((a) => {
          const dir = memory.users.find((u) => u.id === a.dirigeantId);
          const dept = dir && memory.departments.find((d) => d.id === dir.departmentId);
          return { a, dir, dept };
        })
        .filter(({ dept }) => dept && fd.has(dept.name));
      if (scope?.dirigeantId) rows = rows.filter((r) => r.a.dirigeantId === scope.dirigeantId);
      if (scope?.departmentId) rows = rows.filter((r) => r.dir?.departmentId === scope.departmentId);
      return rows
        .map(({ a, dir, dept }) => {
          const progs = memory.progressions.filter((p) => p.assigneId === a.id);
          const last = progs.reduce((m, p) => (p.validatedAt && (!m || p.validatedAt > m) ? p.validatedAt : m), null);
          return {
            ...memAssigneRow(a),
            dirigeantName: dir?.fullName ?? null,
            departmentName: dept?.name ?? null,
            lessonsValidated: progs.length,
            lastProgressAt: last,
          };
        })
        .sort((x, y) => `${x.lastName} ${x.firstName}`.localeCompare(`${y.lastName} ${y.firstName}`, "fr"));
    }
    const params = [];
    const where = ["a.statut = 'nouveau'", `d.name IN ('Faiseurs de Disciples','Suivi')`];
    if (scope?.dirigeantId) { params.push(scope.dirigeantId); where.push(`a.dirigeant_id = $${params.length}`); }
    if (scope?.departmentId) { params.push(scope.departmentId); where.push(`u.department_id = $${params.length}`); }
    const { rows } = await query(
      `SELECT a.*, u.full_name AS dirigeant_name, d.name AS department_name,
              (SELECT COUNT(*) FROM progressions p WHERE p.assigne_id = a.id)::int AS lessons_validated,
              (SELECT MAX(validated_at) FROM progressions p WHERE p.assigne_id = a.id) AS last_progress_at
         FROM assignes a JOIN users u ON u.id = a.dirigeant_id JOIN departments d ON d.id = u.department_id
        WHERE ${where.join(" AND ")}
        ORDER BY a.last_name ASC, a.first_name ASC`,
      params
    );
    return rows.map((r) => ({
      ...mapAssigneRow(r),
      dirigeantName: r.dirigeant_name ?? null,
      departmentName: r.department_name ?? null,
      lessonsValidated: r.lessons_validated,
      lastProgressAt: r.last_progress_at ?? null,
    }));
  },

  // 7-lesson progress, always returns lessons 1..7 (validee or a_effectuer).
  async getProgress(assigneId) {
    let stored = [];
    if (!isPostgres) {
      stored = memory.progressions
        .filter((p) => p.assigneId === assigneId)
        .map((p) => ({ ...p, validantName: memory.users.find((u) => u.id === p.validantId)?.fullName ?? null }));
    } else {
      const { rows } = await query(
        `SELECT p.lecon, p.statut, p.validated_at, p.validant_id, u.full_name AS validant_name
           FROM progressions p LEFT JOIN users u ON u.id = p.validant_id
          WHERE p.assigne_id = $1`,
        [assigneId]
      );
      stored = rows.map((r) => ({ lecon: r.lecon, statut: r.statut, validatedAt: r.validated_at, validantId: r.validant_id, validantName: r.validant_name }));
    }
    const byLecon = new Map(stored.map((p) => [p.lecon, p]));
    return Array.from({ length: 7 }, (_, i) => {
      const n = i + 1;
      const p = byLecon.get(n);
      return p
        ? { lecon: n, statut: "validee", validatedAt: p.validatedAt ?? null, validantName: p.validantName ?? null }
        : { lecon: n, statut: "a_effectuer", validatedAt: null, validantName: null };
    });
  },

  async countValidated(assigneId) {
    if (!isPostgres) return memory.progressions.filter((p) => p.assigneId === assigneId).length;
    const { rows } = await query("SELECT COUNT(*)::int AS n FROM progressions WHERE assigne_id = $1", [assigneId]);
    return rows[0].n;
  },

  async validateLesson(assigneId, lecon, validantId, at) {
    const when = at || new Date().toISOString();
    if (!isPostgres) {
      let p = memory.progressions.find((x) => x.assigneId === assigneId && x.lecon === lecon);
      if (!p) { p = { id: newUuid(), assigneId, lecon }; memory.progressions.push(p); }
      p.statut = "validee";
      p.validatedAt = when;
      p.validantId = validantId;
      return this.getProgress(assigneId);
    }
    await query(
      `INSERT INTO progressions (assigne_id, lecon, statut, validated_at, validant_id)
       VALUES ($1, $2, 'validee', $4, $3)
       ON CONFLICT (assigne_id, lecon) DO UPDATE SET statut = 'validee', validated_at = $4, validant_id = $3`,
      [assigneId, lecon, validantId, when]
    );
    return this.getProgress(assigneId);
  },
};

// --- Notifications in-app (Module 7) ---------------------------------------
function mapNotificationRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message ?? "",
    link: row.link ?? null,
    isRead: row.is_read,
    createdAt: row.created_at ?? null,
  };
}

const notifications = {
  // Reconcile the recipient's notifications with the current desired set:
  // insert missing (unread), delete the ones no longer relevant. Read-state of
  // still-relevant notifications is preserved.
  async reconcile(recipientId, desired) {
    const keys = desired.map((d) => d.dedupKey);
    if (!isPostgres) {
      const keySet = new Set(keys);
      memory.notifications = memory.notifications.filter(
        (n) => !(n.recipientId === recipientId && !keySet.has(n.dedupKey))
      );
      for (const d of desired) {
        const exists = memory.notifications.some((n) => n.recipientId === recipientId && n.dedupKey === d.dedupKey);
        if (!exists) {
          memory.notifications.push({
            id: newUuid(), recipientId, type: d.type, title: d.title,
            message: d.message ?? "", link: d.link ?? null, dedupKey: d.dedupKey,
            isRead: false, createdAt: new Date().toISOString(),
          });
        }
      }
      return;
    }
    // Delete stale (not in the desired key set).
    if (keys.length) {
      await query(
        `DELETE FROM notifications WHERE recipient_id = $1 AND NOT (dedup_key = ANY($2))`,
        [recipientId, keys]
      );
    } else {
      await query(`DELETE FROM notifications WHERE recipient_id = $1`, [recipientId]);
    }
    for (const d of desired) {
      await query(
        `INSERT INTO notifications (recipient_id, type, title, message, link, dedup_key)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (recipient_id, dedup_key) DO NOTHING`,
        [recipientId, d.type, d.title, d.message ?? "", d.link ?? null, d.dedupKey]
      );
    }
  },

  async list(recipientId) {
    if (!isPostgres) {
      return memory.notifications
        .filter((n) => n.recipientId === recipientId)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
        .map(mapNotificationRow);
    }
    const { rows } = await query(
      `SELECT * FROM notifications WHERE recipient_id = $1 ORDER BY created_at DESC`,
      [recipientId]
    );
    return rows.map(mapNotificationRow);
  },

  async unreadCount(recipientId) {
    if (!isPostgres) {
      return memory.notifications.filter((n) => n.recipientId === recipientId && !n.isRead).length;
    }
    const { rows } = await query(
      `SELECT COUNT(*)::int AS n FROM notifications WHERE recipient_id = $1 AND is_read = FALSE`,
      [recipientId]
    );
    return rows[0].n;
  },

  async markRead(id, recipientId) {
    if (!isPostgres) {
      const n = memory.notifications.find((x) => x.id === id && x.recipientId === recipientId);
      if (n) n.isRead = true;
      return Boolean(n);
    }
    const { rowCount } = await query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND recipient_id = $2`,
      [id, recipientId]
    );
    return rowCount > 0;
  },

  async markAllRead(recipientId) {
    if (!isPostgres) {
      memory.notifications.forEach((n) => { if (n.recipientId === recipientId) n.isRead = true; });
      return;
    }
    await query(`UPDATE notifications SET is_read = TRUE WHERE recipient_id = $1`, [recipientId]);
  },
};

// --- Invitations de compte --------------------------------------------------
function mapInvitationRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    departmentId: row.department_id ?? null,
    departmentName: row.department_name ?? null,
    invitedBy: row.invited_by ?? null,
    invitedByName: row.invited_by_name ?? null,
    status: row.status,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at ?? null,
    createdAt: row.created_at,
  };
}

const invitations = {
  async create({ email, role, departmentId, invitedBy, tokenHash, expiresAt }) {
    if (!isPostgres) {
      const inv = {
        id: newUuid(), email, role, departmentId: departmentId ?? null,
        tokenHash, invitedBy, status: "pending",
        expiresAt, acceptedAt: null, createdAt: new Date().toISOString(),
      };
      memory.invitations.push(inv);
      return this.findById(inv.id);
    }
    const { rows } = await query(
      `INSERT INTO invitations (email, role, department_id, token_hash, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [email, role, departmentId ?? null, tokenHash, invitedBy, expiresAt]
    );
    return this.findById(rows[0].id);
  },

  async findById(id) {
    if (!isPostgres) {
      const inv = memory.invitations.find((x) => x.id === id);
      if (!inv) return null;
      const dept = memory.departments.find((d) => d.id === inv.departmentId);
      const inviter = memory.users.find((u) => u.id === inv.invitedBy);
      return mapInvitationRow({
        id: inv.id, email: inv.email, role: inv.role, department_id: inv.departmentId,
        department_name: dept?.name ?? null, invited_by: inv.invitedBy,
        invited_by_name: inviter?.fullName ?? null, status: inv.status,
        expires_at: inv.expiresAt, accepted_at: inv.acceptedAt, created_at: inv.createdAt,
      });
    }
    const { rows } = await query(
      `SELECT i.*, d.name AS department_name, u.full_name AS invited_by_name
         FROM invitations i
         LEFT JOIN departments d ON d.id = i.department_id
         LEFT JOIN users u ON u.id = i.invited_by
        WHERE i.id = $1`,
      [id]
    );
    return mapInvitationRow(rows[0]);
  },

  async findByTokenHash(tokenHash) {
    if (!isPostgres) {
      const inv = memory.invitations.find((x) => x.tokenHash === tokenHash);
      return inv ? this.findById(inv.id) : null;
    }
    const { rows } = await query(
      `SELECT i.*, d.name AS department_name, u.full_name AS invited_by_name
         FROM invitations i
         LEFT JOIN departments d ON d.id = i.department_id
         LEFT JOIN users u ON u.id = i.invited_by
        WHERE i.token_hash = $1`,
      [tokenHash]
    );
    return mapInvitationRow(rows[0]);
  },

  // Pending invitations, most recent first. Both Pasteur and PR see all
  // (invitations are a shared admin responsibility, not department-scoped).
  async listPending() {
    if (!isPostgres) {
      return memory.invitations
        .filter((i) => i.status === "pending")
        .map((i) => {
          const dept = memory.departments.find((d) => d.id === i.departmentId);
          const inviter = memory.users.find((u) => u.id === i.invitedBy);
          return mapInvitationRow({
            id: i.id, email: i.email, role: i.role, department_id: i.departmentId,
            department_name: dept?.name ?? null, invited_by: i.invitedBy,
            invited_by_name: inviter?.fullName ?? null, status: i.status,
            expires_at: i.expiresAt, accepted_at: i.acceptedAt, created_at: i.createdAt,
          });
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    const { rows } = await query(
      `SELECT i.*, d.name AS department_name, u.full_name AS invited_by_name
         FROM invitations i
         LEFT JOIN departments d ON d.id = i.department_id
         LEFT JOIN users u ON u.id = i.invited_by
        WHERE i.status = 'pending'
        ORDER BY i.created_at DESC`
    );
    return rows.map(mapInvitationRow);
  },

  async setStatus(id, status, extra = {}) {
    if (!isPostgres) {
      const inv = memory.invitations.find((x) => x.id === id);
      if (!inv) return null;
      inv.status = status;
      if (extra.acceptedAt) inv.acceptedAt = extra.acceptedAt;
      return this.findById(id);
    }
    if (extra.acceptedAt) {
      await query("UPDATE invitations SET status = $1, accepted_at = $2 WHERE id = $3", [status, extra.acceptedAt, id]);
    } else {
      await query("UPDATE invitations SET status = $1 WHERE id = $2", [status, id]);
    }
    return this.findById(id);
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
  cellules,
  rapports,
  reports,
  integration,
  notifications,
  invitations,
  ADMIN_ROLES,
  FD_DEPT_NAMES,
  _memory: memory,
};