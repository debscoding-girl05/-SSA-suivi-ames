// Une fiche ne peut être SOUMISE que si elle contient réellement quelque
// chose : une photo de la fiche papier, ou au moins une saisie propre à la
// semaine. Les champs pré-remplis automatiquement (liste des noms reprise des
// assignés, nom du leader, effectifs calculés…) ne comptent pas — sinon une
// fiche ouverte puis soumise telle quelle passerait pour remplie.

const filled = (v) => {
  if (v === true || v === false) return true; // P/A coché
  if (typeof v === "number") return Number.isFinite(v);
  return typeof v === "string" && v.trim() !== "";
};

const anyTrue = (obj) =>
  Object.values(obj || {}).some((v) => (v && typeof v === "object" ? anyTrue(v) : v === true));

// Par type : ce qui, dans une ligne, relève de la saisie de la semaine.
const ROW_CONTENT = {
  huissier: (r) => filled(r.present) || filled(r.numeroCulte),
  faiseur_disciples: (r) => filled(r.present) || filled(r.lecon) || filled(r.observations),
  superviseur: (r) => filled(r.faiseur) || filled(r.nomsAme) || filled(r.telephone) || filled(r.commentaires),
  choristes: (r) => anyTrue(r.croissance) || anyTrue(r.presence) || filled(r.remarques),
  audiovisuel: (r) => ["m", "j", "nuitsPrieres", "progSpecial", "dim", "cpSamedi", "devo", "service", "xtere"].some((k) => filled(r[k])),
  leader_mensuel: (r) => filled(r.fichesRemises) || filled(r.observations),
};

// Par type : champs d'en-tête qui constituent du contenu.
const ENTETE_CONTENT = {
  cellule_priere: [
    "hommes", "femmes", "adolescents", "enfants", "themeDevotionnel", "totalMembresCulte",
    "casASignaler", "aEvangelise", "nbAmes", "totalAmesCulte", "raisonNon",
  ],
  audiovisuel: ["remarquesParticulieres"],
  leader_mensuel: ["presenceMoyenne", "nouveauxVenus", "activites", "difficultes", "besoins", "projets"],
};

function hasFicheContent({ type, entete, lignes, attachmentCount = 0 }) {
  if (attachmentCount > 0) return true;
  const rowFn = ROW_CONTENT[type];
  if (rowFn && Array.isArray(lignes) && lignes.some((r) => r && rowFn(r))) return true;
  const keys = ENTETE_CONTENT[type] || [];
  return keys.some((k) => filled((entete || {})[k]));
}

module.exports = { hasFicheContent };
