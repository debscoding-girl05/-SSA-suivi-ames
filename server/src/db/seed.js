const bcrypt = require("bcryptjs");
const db = require("./index");
const { currentWeek } = require("../utils/week");

/**
 * Seed dirigeants (comptes), their assignés, and weekly reports.
 * Idempotent: existing users/assignés/reports are skipped.
 * Runs automatically on boot in non-production.
 */

// Comptes de démonstration — 6 rôles du CDC (le Pasteur et la PR ne sont pas
// des "dirigeants" : ils n'ont ni assignés ni rapport).
// report: null = pas encore soumis (apparaît comme "manquant" cette semaine).
const DIRIGEANTS = [
  {
    email: "pasteur@ssa.app", phone: "+237 6 00 00 00 01", password: "pasteur1234",
    fullName: "Pasteur Emmanuel", role: "pasteur", department: null, assignes: [], report: null,
  },
  {
    email: "pr@ssa.app", phone: "+237 6 00 00 00 02", password: "pr1234",
    fullName: "Sœur Bernadette", role: "pr", department: null, assignes: [], report: null,
  },
  {
    email: "leader@ssa.app", phone: "+237 6 99 11 22 33", password: "leader1234",
    fullName: "Marie Nkolo", role: "leader", department: "Chorale",
    assignes: [
      { firstName: "Samuel", lastName: "Eboa", phone: "+237 6 55 66 77 88", notes: "À recontacter." },
      { firstName: "Ruth", lastName: "Ndongo", phone: "+237 6 71 23 45 67" },
      { firstName: "Carine", lastName: "Manga", email: "carine.manga@example.com" },
    ],
    report: { presentCount: 2, absents: "Carine Manga", remarques: "Bonne semaine, un absent." },
  },
  {
    email: "encadreur@ssa.app", phone: "+237 6 77 44 55 66", password: "encadreur1234",
    fullName: "Jean Mballa", role: "encadreur", department: "Chorale",
    assignes: [
      { firstName: "Pierre", lastName: "Kamga", phone: "+237 6 77 44 55 66" },
      { firstName: "Sandrine", lastName: "Abena", email: "sandrine.abena@example.com" },
    ],
    report: { presentCount: 2, absents: "", remarques: "Tous présents à la répétition." },
  },
  {
    email: "esther@ssa.app", phone: "+237 6 90 12 34 56", password: "dirigeant1234",
    fullName: "Esther Fotso", role: "encadreur", department: "Jeunes",
    assignes: [
      { firstName: "Yannick", lastName: "Tchoua", phone: "+237 6 90 12 34 57" },
      { firstName: "Laure", lastName: "Bessala" },
      { firstName: "Hervé", lastName: "Ngono", phone: "+237 6 81 11 22 33" },
    ],
    report: { presentCount: 3, absents: "", remarques: "Groupe dynamique cette semaine." },
  },
  {
    email: "daniel@ssa.app", phone: "+237 6 55 66 77 89", password: "dirigeant1234",
    fullName: "Daniel Owona", role: "encadreur", department: "Intercession / Prière",
    assignes: [
      { firstName: "Brigitte", lastName: "Essomba", phone: "+237 6 98 76 54 32" },
      { firstName: "Marc", lastName: "Atangana" },
    ],
    report: null, // manquant
  },
  {
    email: "grace@ssa.app", phone: "+237 6 70 00 11 22", password: "dirigeant1234",
    fullName: "Grâce Tchami", role: "leader", department: "Évangélisation",
    assignes: [
      { firstName: "Joseph", lastName: "Belinga", phone: "+237 6 70 00 11 23" },
      { firstName: "Nadia", lastName: "Foe", email: "nadia.foe@example.com" },
    ],
    report: null, // manquant
  },
  {
    email: "paul@ssa.app", phone: "+237 6 80 90 10 20", password: "dirigeant1234",
    fullName: "Paul Atangana", role: "encadreur", department: "Chorale",
    assignes: [
      { firstName: "Sylvie", lastName: "Ze", phone: "+237 6 80 90 10 21" },
    ],
    report: null, // manquant
  },
  {
    // Encadreur du département "Suivi" (intégration des nouveaux venus, 7 leçons).
    email: "suivi@ssa.app", phone: "+237 6 11 22 33 44", password: "dirigeant1234",
    fullName: "Ruth Onana", role: "encadreur", department: "Suivi",
    assignes: [
      { firstName: "Aline", lastName: "Mbarga", phone: "+237 6 12 00 00 01", statut: "nouveau", firstSeenAt: "2026-05-24", lessons: 0 },
      { firstName: "Boris", lastName: "Kana", phone: "+237 6 12 00 00 02", statut: "nouveau", firstSeenAt: "2026-05-03", lessons: 3, daysAgo: 4 },
      { firstName: "Clarisse", lastName: "Eto'o", phone: "+237 6 12 00 00 03", statut: "nouveau", firstSeenAt: "2026-04-05", lessons: 6, daysAgo: 28 },
    ],
    report: null,
  },
];

async function seed({ silent = false } = {}) {
  const log = (...args) => {
    if (!silent) console.log(...args); // eslint-disable-line no-console
  };

  await db.init();
  const { year, week } = currentWeek();
  const departments = await db.departments.list();
  const deptByName = new Map(departments.map((d) => [d.name, d.id]));

  let createdUsers = 0;
  let createdAssignes = 0;
  let createdReports = 0;

  for (const d of DIRIGEANTS) {
    let user = await db.users.findByEmail(d.email);
    if (!user) {
      const role = await db.roles.findByName(d.role);
      if (!role) {
        log(`  ! rôle introuvable: ${d.role} — ${d.email} ignoré`);
        continue;
      }
      const passwordHash = await bcrypt.hash(d.password, 12);
      user = await db.users.create({
        email: d.email,
        passwordHash,
        fullName: d.fullName,
        phone: d.phone ?? null,
        roleId: role.id,
        departmentId: d.department ? deptByName.get(d.department) ?? null : null,
      });
      createdUsers += 1;
      log(`  + dirigeant: ${d.fullName} (${d.role}${d.department ? ` · ${d.department}` : ""})`);
    }

    // Assignés (only if none yet).
    const existingAssignes = await db.assignes.listByDirigeant(user.id);
    if (existingAssignes.length === 0 && d.assignes.length) {
      for (const a of d.assignes) {
        const { lessons, daysAgo, ...fields } = a;
        const created = await db.assignes.create({ ...fields, dirigeantId: user.id });
        createdAssignes += 1;
        // Seed lesson progress for nouveaux venus (FD/Suivi).
        if (lessons) {
          const at = new Date(Date.now() - (daysAgo || 0) * 86400000).toISOString();
          for (let n = 1; n <= lessons; n += 1) {
            await db.integration.validateLesson(created.id, n, user.id, at);
          }
        }
      }
    }

    // Report for current week.
    if (d.report) {
      const existing = await db.rapports.findByDirigeantWeek(user.id, year, week);
      if (!existing) {
        await db.rapports.submit({ dirigeantId: user.id, year, week, ...d.report });
        createdReports += 1;
      }
    }
  }

  log(
    `Seed terminé — ${createdUsers} dirigeant(s), ${createdAssignes} assigné(s), ${createdReports} rapport(s) (sem. ${week}/${year}, backend: ${db.isPostgres ? "postgres" : "memory"}).`
  );
  return { createdUsers, createdAssignes, createdReports };
}

module.exports = { seed, DIRIGEANTS };

if (require.main === module) {
  seed()
    .then(() => db.close())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Seed échoué:", error); // eslint-disable-line no-console
      process.exit(1);
    });
}
