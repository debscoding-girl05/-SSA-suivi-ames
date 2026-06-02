const bcrypt = require("bcryptjs");
const db = require("./index");

/**
 * Seed base roles + demo users. Idempotent: existing users are skipped.
 * Runs automatically on boot in non-production so the demo "first view"
 * works immediately. Can also be run standalone: `node src/db/seed.js`.
 */

const DEMO_USERS = [
  { email: "admin@ssa.app", password: "admin1234", fullName: "Admin SSA", role: "admin" },
  { email: "leader@ssa.app", password: "leader1234", fullName: "Leader SSA", role: "leader" },
  { email: "volunteer@ssa.app", password: "volunteer1234", fullName: "Bénévole SSA", role: "volunteer" },
];

// Realistic demo members across departments (department by name → resolved to id).
const DEMO_MEMBERS = [
  { firstName: "Marie", lastName: "Nkolo", phone: "+237 6 99 11 22 33", email: "marie.nkolo@example.com", department: "Accueil", status: "actif", notes: "Très impliquée dans l'accueil du dimanche." },
  { firstName: "Jean", lastName: "Mballa", phone: "+237 6 77 44 55 66", email: "jean.mballa@example.com", department: "Louange", status: "actif", notes: "Guitariste." },
  { firstName: "Esther", lastName: "Fotso", phone: "+237 6 90 12 34 56", email: "esther.fotso@example.com", department: "Jeunesse", status: "actif", notes: "" },
  { firstName: "Daniel", lastName: "Owona", phone: "+237 6 55 66 77 88", email: "", department: "Intercession", status: "actif", notes: "Disponible le mercredi soir." },
  { firstName: "Grâce", lastName: "Tchami", phone: "+237 6 98 76 54 32", email: "grace.tchami@example.com", department: "Évangélisation", status: "nouveau", notes: "Nouvelle convertie, à suivre." },
  { firstName: "Samuel", lastName: "Eboa", phone: "", email: "samuel.eboa@example.com", department: "Accueil", status: "inactif", notes: "Déménagé, à recontacter." },
  { firstName: "Ruth", lastName: "Ndongo", phone: "+237 6 71 23 45 67", email: "", department: "Jeunesse", status: "nouveau", notes: "" },
  { firstName: "Paul", lastName: "Atangana", phone: "+237 6 80 90 10 20", email: "paul.atangana@example.com", department: "Louange", status: "actif", notes: "Responsable technique son." },
];

async function seed({ silent = false } = {}) {
  const log = (...args) => {
    if (!silent) console.log(...args); // eslint-disable-line no-console
  };

  await db.init();

  let created = 0;
  for (const u of DEMO_USERS) {
    const existing = await db.users.findByEmail(u.email);
    if (existing) continue;

    const role = await db.roles.findByName(u.role);
    if (!role) {
      log(`  ! role introuvable: ${u.role} — utilisateur ${u.email} ignoré`);
      continue;
    }

    const passwordHash = await bcrypt.hash(u.password, 10);
    await db.users.create({
      email: u.email,
      passwordHash,
      fullName: u.fullName,
      roleId: role.id,
    });
    created += 1;
    log(`  + utilisateur créé: ${u.email} (${u.role})`);
  }

  // Members — only seed when the table is empty, to stay idempotent.
  let membersCreated = 0;
  const { total: existingMembers } = await db.members.list({ limit: 1 });
  if (existingMembers === 0) {
    const departments = await db.departments.list();
    const deptByName = new Map(departments.map((d) => [d.name, d.id]));
    for (const m of DEMO_MEMBERS) {
      await db.members.create({
        firstName: m.firstName,
        lastName: m.lastName,
        phone: m.phone || null,
        email: m.email || null,
        departmentId: deptByName.get(m.department) ?? null,
        status: m.status,
        notes: m.notes || null,
      });
      membersCreated += 1;
    }
    log(`  + ${membersCreated} membre(s) créé(s)`);
  }

  log(
    `Seed terminé (${created} utilisateur(s), ${membersCreated} membre(s), backend: ${db.isPostgres ? "postgres" : "memory"}).`
  );
  return { created, membersCreated };
}

module.exports = { seed, DEMO_USERS, DEMO_MEMBERS };

// Allow standalone execution.
if (require.main === module) {
  seed()
    .then(() => db.close())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Seed échoué:", error); // eslint-disable-line no-console
      process.exit(1);
    });
}
