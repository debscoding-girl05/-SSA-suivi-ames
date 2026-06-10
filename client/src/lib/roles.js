// Rôles CDC v1.1 (hiérarchie pastorale) — libellés FR + helpers.
export const ROLE_LABELS = {
  pasteur: 'Pasteur',
  pr: 'PR (Première Responsable)',
  leader: 'Leader principal',
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

// Rôles qui soumettent une fiche/un rapport hebdomadaire.
export function canSubmitReport(role) {
  return role === 'leader' || role === 'encadreur' || role === 'leader_cellule';
}
