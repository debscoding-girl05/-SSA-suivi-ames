const db = require("../db");
const ApiError = require("../utils/ApiError");
const { currentWeek } = require("../utils/week");

const isAdmin = (role) => db.ADMIN_ROLES.includes(role);
const weeksSince = (iso) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / (7 * 24 * 3600 * 1000)) : null);

// Compute the current set of notifications for a user, based on live state.
async function computeDesired(user) {
  const { year, week } = currentWeek();
  const wk = `${year}-${week}`;
  const desired = [];
  const admin = isAdmin(user.role);

  // 1. Le dirigeant (leader/encadreur) lui-même : fiche non soumise / à corriger.
  if (user.role === "leader" || user.role === "encadreur") {
    const f = await db.rapports.findByDirigeantWeek(user.sub, year, week);
    const st = f?.status;
    if (!st || st === "brouillon") {
      desired.push({ dedupKey: `self_manquante:${wk}`, type: "fiche_manquante", title: "Fiche non soumise", message: `Votre fiche de la semaine ${week} n'est pas encore soumise.`, link: "/fiches" });
    } else if (st === "a_corriger") {
      desired.push({ dedupKey: `self_corriger:${wk}`, type: "a_corriger", title: "Fiche à corriger", message: f.reviewComment ? `Correction demandée : ${f.reviewComment}` : "Votre fiche doit être corrigée.", link: "/fiches" });
    }
  }

  // 2. Leader : fiches manquantes / à valider dans son département.
  if (user.role === "leader") {
    const dirs = await db.dirigeants.list({ year, week, scope: { departmentId: user.departmentId ?? -1 } });
    for (const d of dirs) {
      if (d.id === user.sub) continue;
      if (!d.reportStatus || d.reportStatus === "brouillon") {
        desired.push({ dedupKey: `manquante:${d.id}:${wk}`, type: "fiche_manquante", title: "Fiche manquante", message: `${d.fullName} n'a pas soumis sa fiche.`, link: `/dirigeants/${d.id}` });
      } else if (d.reportStatus === "soumis") {
        desired.push({ dedupKey: `valider:${d.id}:${wk}`, type: "a_valider", title: "Fiche à valider", message: `${d.fullName} a soumis sa fiche.`, link: "/fiches" });
      }
    }
  }

  // 3. Pasteur / PR : synthèse globale.
  if (admin) {
    const dirs = await db.dirigeants.list({ year, week });
    const manquantes = dirs.filter((d) => !d.reportStatus || d.reportStatus === "brouillon").length;
    const aValider = dirs.filter((d) => d.reportStatus === "soumis").length;
    if (manquantes) desired.push({ dedupKey: `global_manquantes:${wk}`, type: "fiche_manquante", title: "Fiches manquantes", message: `${manquantes} fiche(s) non soumise(s) cette semaine.`, link: "/fiches" });
    if (aValider) desired.push({ dedupKey: `global_valider:${wk}`, type: "a_valider", title: "Fiches à valider", message: `${aValider} fiche(s) en attente de validation.`, link: "/fiches" });
  }

  // 3b. Cellules de prière : fiche de présence manquante cette semaine.
  if (user.role === "leader_cellule") {
    const cells = await db.cellules.list({ year, week, scope: { leaderId: user.sub } });
    for (const c of cells) {
      if (c.ficheStatus !== "soumis") {
        desired.push({ dedupKey: `cellule_manquante:${c.id}:${wk}`, type: "cellule_manquante", title: "Fiche de cellule manquante", message: `La fiche de « ${c.nom} » n'est pas soumise.`, link: `/cellules/${c.id}` });
      }
    }
  }
  if (admin) {
    const cells = await db.cellules.list({ year, week });
    const manq = cells.filter((c) => c.ficheStatus !== "soumis").length;
    if (manq) desired.push({ dedupKey: `cellules_manquantes:${wk}`, type: "cellule_manquante", title: "Cellules sans fiche", message: `${manq} cellule(s) n'ont pas soumis leur fiche cette semaine.`, link: "/cellules" });
  }

  // 4. Stagnation des nouveaux venus (périmètre FD/Suivi).
  const fdScope = admin ? undefined : user.role === "leader" ? { departmentId: user.departmentId ?? -1 } : { dirigeantId: user.sub };
  let venus = [];
  try { venus = await db.integration.listNouveaux({ scope: fdScope }); } catch { venus = []; }
  for (const v of venus) {
    const w = weeksSince(v.lastProgressAt || v.firstSeenAt);
    if (v.lessonsValidated < 7 && w != null && w >= 2) {
      desired.push({ dedupKey: `stagnation:${v.id}`, type: "stagnation", title: "Stagnation d'un nouveau venu", message: `${v.firstName} ${v.lastName} : ${v.lessonsValidated}/7 leçons, ${w} sem. sans progrès.`, link: "/nouveaux-venus" });
    }
  }

  return desired;
}

// GET /api/notifications — regenerate (idempotent) then return the feed.
async function list(req, res) {
  await db.notifications.reconcile(req.user.sub, await computeDesired(req.user));
  const [data, unread] = await Promise.all([
    db.notifications.list(req.user.sub),
    db.notifications.unreadCount(req.user.sub),
  ]);
  res.json({ data, unread });
}

// POST /api/notifications/:id/read
async function markRead(req, res) {
  const ok = await db.notifications.markRead(req.params.id, req.user.sub);
  if (!ok) throw ApiError.notFound("Notification introuvable");
  res.status(204).end();
}

// POST /api/notifications/read-all
async function markAllRead(req, res) {
  await db.notifications.markAllRead(req.user.sub);
  res.status(204).end();
}

module.exports = { list, markRead, markAllRead };
