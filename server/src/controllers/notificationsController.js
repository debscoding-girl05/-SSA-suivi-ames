const db = require("../db");
const ApiError = require("../utils/ApiError");
const { currentWeek } = require("../utils/week");

const isAdmin = (role) => db.ADMIN_ROLES.includes(role);

// Libellés des types de rapports hebdo structurés (pour les notifications).
const RH_LABELS = {
  huissier: "rapport d'assiduité",
  faiseur_disciples: "rapport du faiseur de disciples",
  superviseur: "fiche des superviseurs",
  cellule_priere: "rapport de cellule de prière",
  choristes: "fiche de suivi des choristes",
};
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

  // 1b. Absences consécutives parmi mes assignés (EF-41).
  if (user.role === "leader" || user.role === "encadreur") {
    const abs = await db.rapports.listConsecutiveAbsences(user.sub, 2);
    for (const a of abs) {
      desired.push({
        dedupKey: `absences:${a.id}`,
        type: "absence_consecutive",
        title: "Absences consécutives",
        message: `${a.firstName} ${a.lastName} a été absent(e) lors des 2 derniers cultes suivis.`,
        link: `/dirigeants/${user.sub}`,
      });
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

  // 2b. Leader de cellule : rappel pour sa propre fiche.
  if (user.role === "leader_cellule") {
    const mine = await db.cellules.list({ scope: { leaderId: user.sub } });
    for (const c of mine.filter((c) => c.actif !== false)) {
      const f = await db.cellules.getFiche(c.id, year, week);
      if (!f || f.status === "brouillon") {
        desired.push({ dedupKey: `self_cellule_manquante:${c.id}:${wk}`, type: "fiche_manquante", title: "Fiche de cellule non soumise", message: `La fiche de ${c.nom} pour la semaine ${week} n'est pas encore soumise.`, link: `/cellules/${c.id}` });
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

    // Synthèse globale des fiches de cellule.
    const cellulesAll = await db.cellules.list({});
    const fichesAll = await db.cellules.listFichesByWeek(year, week);
    const activesCellules = cellulesAll.filter((c) => c.actif !== false);
    const manquantesCellules = activesCellules.filter((c) => {
      const f = fichesAll.find((x) => x.celluleId === c.id);
      return !f || f.status === "brouillon";
    }).length;
    const aValiderCellules = fichesAll.filter((f) => f.status === "soumis").length;
    if (manquantesCellules) desired.push({ dedupKey: `global_cellules_manquantes:${wk}`, type: "fiche_manquante", title: "Fiches de cellule manquantes", message: `${manquantesCellules} cellule(s) n'ont pas soumis leur fiche cette semaine.`, link: "/cellules" });
    if (aValiderCellules) desired.push({ dedupKey: `global_cellules_valider:${wk}`, type: "a_valider", title: "Fiches de cellule à valider", message: `${aValiderCellules} fiche(s) de cellule en attente de validation.`, link: "/cellules" });

    // Rapports hebdomadaires structurés soumis (par département) — un par fiche.
    let rhSoumis = [];
    try { rhSoumis = await db.rapportsHebdo.list({ year, week }); } catch { rhSoumis = []; }
    for (const rh of rhSoumis.filter((x) => x.status === "soumis")) {
      const label = RH_LABELS[rh.type] || "rapport hebdomadaire";
      // Département : uniquement celui saisi dans la fiche (pas celui du compte).
      const dept = rh.entete?.departement;
      const nom = rh.entete?.nomLeader || rh.entete?.nomFaiseur || rh.entete?.nomSuperviseur || rh.authorName || "Un responsable";
      desired.push({
        dedupKey: `rh_soumis:${rh.id}`,
        type: "rapport_soumis",
        title: "Rapport hebdomadaire soumis",
        message: `${nom} a soumis : ${label}${dept ? " — " + dept : ""}.`,
        link: "/rapports-hebdo",
      });
    }
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

module.exports = { list, markRead, markAllRead, computeDesired };