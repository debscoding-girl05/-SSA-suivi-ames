import { listRapportsHebdo } from '../../api/rapportsHebdo';
import { listAssignes } from '../../api/dirigeants';

// Renvoie la fiche la plus récente (peu importe son statut) d'un type donné
// pour l'auteur courant, ou null s'il n'y en a aucune. Sert à reprendre une
// liste de noms déjà saisie la semaine précédente plutôt que de la retaper.
export async function fetchLastRapportHebdo(type, excludeId) {
  const { data } = await listRapportsHebdo({ type });
  const candidates = (data || []).filter((r) => r.id !== excludeId);
  if (!candidates.length) return null;
  candidates.sort((a, b) => (b.year * 100 + b.week) - (a.year * 100 + a.week));
  return candidates[0];
}

// Liste des assignés du dirigeant connecté — sert à pré-remplir une fiche à
// roster (huissier, faiseur de disciples, choristes, audiovisuel) avec les
// personnes qu'il suit réellement aujourd'hui, plutôt que des lignes vides.
export async function fetchOwnAssignes(dirigeantId) {
  try {
    const { data } = await listAssignes(dirigeantId);
    return data || [];
  } catch {
    return [];
  }
}
