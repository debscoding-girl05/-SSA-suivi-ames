// Registre des types de fiches hebdomadaires (labels, en-tête & colonnes pour
// la vue lecture). Ajouter un type ici + son formulaire + son rendu PDF suffit.

export function formatDateFr(v) {
  if (!v) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v).trim());
  if (!m) return String(v);
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export const RH_TYPES = [
  { key: 'huissier', label: "Rapport d'assiduité (Huissier)", shortLabel: "Rapport d'assiduité" },
  { key: 'faiseur_disciples', label: 'Rapport du Faiseur de Disciples', shortLabel: 'Faiseur de Disciples' },
  { key: 'superviseur', label: 'Fiche des Superviseurs', shortLabel: 'Superviseurs' },
];

export const rhLabel = (t) => (RH_TYPES.find((x) => x.key === t) || {}).label || t;
export const rhShortLabel = (t) => (RH_TYPES.find((x) => x.key === t) || {}).shortLabel || t;

// Configuration de la vue lecture par type : champs d'en-tête + colonnes.
export const RH_VIEW = {
  huissier: {
    header: (e, r) => [
      ['Département', e.departement || r.departmentName || '—'],
      ['Date', formatDateFr(e.date)],
      ['Nom du leader', e.nomLeader || '—'],
      ['Total de membres présents', e.totalPresents != null && e.totalPresents !== '' ? String(e.totalPresents) : '—'],
    ],
    columns: [
      { key: 'nom', label: 'Nom' },
      { key: 'telephone', label: 'Téléphone' },
      { key: 'lieu', label: 'Lieu' },
      { key: 'numeroCulte', label: 'N° Culte' },
      { key: 'present', label: 'Présence', kind: 'presence' },
    ],
  },
  faiseur_disciples: {
    header: (e) => [
      ['Département', 'Suivi (Faiseurs de Disciples)'],
      ['Nom du faiseur de disciples', e.nomFaiseur || '—'],
      ['Rapport de la semaine du', formatDateFr(e.date)],
    ],
    columns: [
      { key: 'nom', label: 'Noms & Prénoms' },
      { key: 'quartier', label: 'Quartier' },
      { key: 'telephone', label: 'Téléphone' },
      { key: 'lecon', label: 'Leçon' },
      { key: 'observations', label: 'Observations' },
      { key: 'present', label: 'Prés./Abs.', kind: 'presence' },
    ],
  },
  superviseur: {
    header: (e) => [
      ['Département', 'Suivi (Superviseurs)'],
      ['Noms & prénoms du superviseur', e.nomSuperviseur || '—'],
      ['Téléphone', e.telephone || '—'],
      ['Rapport de la semaine du', formatDateFr(e.date)],
    ],
    columns: [
      { key: 'faiseur', label: 'Faiseur de Disciples' },
      { key: 'telephone', label: "Téléphone (âme)" },
      { key: 'nomsAme', label: "Noms de l'âme" },
      { key: 'commentaires', label: 'Commentaires / Observations' },
    ],
  },
};