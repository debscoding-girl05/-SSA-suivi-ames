const { Client } = require("@notionhq/client");
require("dotenv").config({ path: "../.env" });

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const dsId = process.env.NOTION_DATABASE_ID;

const DEV_A = "Dev A – Backend";
const DEV_B = "Dev B – Frontend";
const DEV_C = "Dev C – Full-stack";

// Tâches d'alignement CDC v1.1 — uniquement les manques réels (pas de doublon du board).
const TASKS = [
  // Module 1 — RBAC / sécurité auth (précisions CDC)
  ["[M1] Modèle 6 rôles (Pasteur/PR/Leader/Encadreur/Leader cellule) + matrice droits", "Sprint 1", DEV_A, "Backend", "Critique", "CDC v1.1 · Module 1 · EF-03 · Annexe D (matrice contractuelle). Remplace le modèle 3 rôles actuel."],
  ["[M1] Login par email OU téléphone + blocage après 5 tentatives", "Sprint 1", DEV_A, "Backend", "Haute", "CDC v1.1 · EF-02 · UC-01 (E1). Actuellement: email seulement."],
  ["[M1] Durcissement auth: bcrypt coût ≥12, politique MDP, session 30 min + refresh token", "Sprint 1", DEV_A, "Backend", "Haute", "CDC v1.1 · ENF-12/13/14. Actuellement bcrypt coût 10, pas de refresh token."],
  ["[M1] Journal des connexions et des actions (rétention 90 jours)", "Sprint 4", DEV_A, "Backend", "Normale", "CDC v1.1 · EF-08 · ENF-16."],

  // Module 2 / 3 — départements & membres (précisions CDC)
  ["[M2] Seed des 13 départements officiels + arborescence dépt→leaders→encadreurs→membres", "Sprint 1", DEV_A, "Database", "Haute", "CDC v1.1 · Tableau 5 · EF-11. Actuellement 5 départements fictifs."],
  ["[M3] Modèle Membre complet (naissance, sexe, adresse, zone_residence, statut, date intégration) + traçabilité", "Sprint 1", DEV_A, "Database", "Haute", "CDC v1.1 · EF-14/15/18 · §2.5 (zone_residence)."],
  ["[M3] Annuaire des membres: recherche/filtres + clic-to-call (lien tel:)", "Sprint 2", DEV_B, "Frontend", "Haute", "CDC v1.1 · EF-16 · EF-19 · UC-09."],

  // Module 5 — fiches de suivi (précisions CDC)
  ["[M5] Modèles de fiches configurables par département (champs dynamiques)", "Sprint 2", DEV_C, "Backend", "Haute", "CDC v1.1 · EF-27 · entités ModeleFiche/ChampFiche."],
  ["[M5] Fiche hebdo: présence par membre (Présent/Absent/Justifié) + brouillon/soumis", "Sprint 2", DEV_B, "Frontend", "Critique", "CDC v1.1 · EF-17/28/29/32 · table presences. Distinct du 'rapport'."],

  // Module 6 — rapports (précisions CDC)
  ["[M6] Rapport pastoral propre du leader (suivi direct des âmes)", "Sprint 3", DEV_A, "Backend", "Haute", "CDC v1.1 · EF-33b (distinct de l'agrégation des fiches encadreurs)."],
  ["[M6] Agrégation auto fiches→rapport leader→PR→Pasteur + validation/transmission", "Sprint 3", DEV_A, "Backend", "Critique", "CDC v1.1 · EF-33/34/35 · UC-04."],
  ["[M6] Génération PDF des rapports (Puppeteer, en-tête église)", "Sprint 3", DEV_C, "Backend", "Haute", "CDC v1.1 · EF-36 · ENF-02 (<10s)."],

  // Module 4 — Faiseurs de Disciples / nouveaux venus / 7 leçons (ABSENT du board)
  ["[M4] Migration DB: nouveaux venus + parcours_fd + validations_lecons", "Sprint 3", DEV_A, "Database", "Critique", "CDC v1.1 · Module 4 · entités ParcoursFD/ValidationLecon."],
  ["[M4] API enregistrement nouveau venu (champs min, détection doublon)", "Sprint 3", DEV_A, "Backend", "Haute", "CDC v1.1 · EF-21 · UC-06."],
  ["[M4] API parcours 7 leçons séquentiel + transition « membre régulier »", "Sprint 3", DEV_A, "Backend", "Haute", "CDC v1.1 · EF-22/25 · UC-07 (validation séquentielle)."],
  ["[M4] Écran enregistrement nouveau venu (mobile, < 2 min)", "Sprint 3", DEV_B, "Frontend", "Haute", "CDC v1.1 · EF-21 · critère recette: < 2 min."],
  ["[M4] Fiche nouveau venu + indicateur visuel progression 7 leçons", "Sprint 3", DEV_B, "Frontend", "Haute", "CDC v1.1 · EF-22/23 · maquette §9.5 (pastilles)."],
  ["[M4] Vue synthétique nouveaux venus + alerte stagnation (2 sem.)", "Sprint 3", DEV_C, "Frontend", "Haute", "CDC v1.1 · EF-24/26."],

  // Module 8 — Cellules de prière (ABSENT du board)
  ["[M8] Migration DB cellules de prière + rôle leader de cellule", "Sprint 3", DEV_A, "Database", "Haute", "CDC v1.1 · Module 8 · EF-46/47 (cellules indépendantes — v1.1 à clarifier)."],
  ["[M8] API CRUD cellules + fiche cellule + remontée au département", "Sprint 3", DEV_A, "Backend", "Haute", "CDC v1.1 · EF-46/48/49/50."],
  ["[M8] Écrans cellules + soumission fiche cellule (leader de cellule)", "Sprint 3", DEV_B, "Frontend", "Haute", "CDC v1.1 · EF-48/49."],
];

async function main() {
  let ok = 0;
  for (const [tache, sprint, dev, cat, prio, notes] of TASKS) {
    try {
      await notion.pages.create({
        parent: { type: "data_source_id", data_source_id: dsId },
        properties: {
          "Tâche": { title: [{ text: { content: tache } }] },
          "Sprint": { select: { name: sprint } },
          "Statut": { select: { name: "À faire" } },
          "Développeur": { select: { name: dev } },
          "Catégorie": { select: { name: cat } },
          "Priorité": { select: { name: prio } },
          "Notes": { rich_text: [{ text: { content: notes } }] },
        },
      });
      ok += 1;
      console.log(`✓ ${tache}`);
    } catch (e) {
      console.error(`✗ ${tache}: ${e.message}`);
    }
  }
  console.log(`\n${ok}/${TASKS.length} tâches créées.`);
}

main().catch((e) => console.error(e.message));
