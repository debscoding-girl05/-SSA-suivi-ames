// Rôles CDC v1.1 (hiérarchie pastorale) — libellés FR + helpers.
export const ROLE_LABELS = {
  pasteur: 'Pasteur',
  pr: 'PR (Première Responsable)',
  secretaire: 'Secrétaire du pasteur',
  leader: 'Leader',
  encadreur: 'Encadreur',
  leader_cellule: 'Leader de cellule',
};

export function roleLabel(role) {
  return ROLE_LABELS[role] || role || '';
}

// Pasteur + PR = vue administrative globale.
export function isAdminRole(role) {
  return role === 'pasteur' || role === 'pr';
}

// Lecture de tout (annuaire complet, toutes les fiches) — Pasteur, PR et
// Secrétaire du pasteur, qui consulte sans administrer.
export function readsAllRole(role) {
  return isAdminRole(role) || role === 'secretaire';
}

// Rôles qui soumettent une fiche/un rapport hebdomadaire.
export function canSubmitReport(role) {
  return role === 'leader' || role === 'encadreur' || role === 'leader_cellule';
}
