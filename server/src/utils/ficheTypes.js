// Qui peut remplir quel modèle de fiche hebdo. Chaque fiche papier appartient
// à un département (ou à un rôle) : un encadreur de la Chorale n'a pas à voir
// la fiche des ouvriers de l'Audiovisuel. Pasteur et PR peuvent tout remplir
// (saisie pour le compte de quelqu'un) ; la Secrétaire du pasteur lit tout
// mais ne remplit rien.
//
// ⚠️ Même table côté client : client/src/pages/RapportsHebdo/types.js
// (TYPE_ACCESS) — la garder synchronisée.
const FD_DEPTS = ["Faiseurs de Disciples", "Suivi"];

const TYPE_ACCESS = {
  huissier: { departments: ["Protocole"] },
  faiseur_disciples: { departments: FD_DEPTS },
  superviseur: { departments: FD_DEPTS },
  choristes: { departments: ["Chorale"] },
  audiovisuel: { departments: ["Audiovisuel", "Sécurité Audiovisuelle"] },
  chaine_priere: { departments: ["Intercession / Prière"] },
  cellule_priere: { roles: ["leader_cellule"] },
  leader_mensuel: { roles: ["leader"] },
};

const FILLING_ROLES = ["leader", "encadreur", "leader_cellule"];

// user = { role, departmentName }
function canFillType(user, type) {
  const rule = TYPE_ACCESS[type];
  if (!rule || !user) return false;
  if (user.role === "pasteur" || user.role === "pr") return true;
  if (!FILLING_ROLES.includes(user.role)) return false;
  if (rule.roles) return rule.roles.includes(user.role);
  return Boolean(user.departmentName && rule.departments.includes(user.departmentName));
}

function typesFor(user) {
  return Object.keys(TYPE_ACCESS).filter((t) => canFillType(user, t));
}

module.exports = { TYPE_ACCESS, canFillType, typesFor };
