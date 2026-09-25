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
  { key: 'superviseur', label: 'Fiche des Encadreurs', shortLabel: 'Encadreurs' },
  { key: 'cellule_priere', label: 'Rapport de cellule de prière', shortLabel: 'Cellule de prière' },
  { key: 'choristes', label: 'Fiche de suivi hebdomadaire des choristes', shortLabel: 'Suivi des choristes' },
  { key: 'audiovisuel', label: "Rapport d'assiduité des ouvriers (Audiovisuel)", shortLabel: 'Assiduité ouvriers (AV)' },
  // Remis chaque mois au Pasteur — réservé aux leaders (contrôlé côté serveur).
  { key: 'leader_mensuel', label: 'Rapport mensuel du leader (au Pasteur)', shortLabel: 'Rapport mensuel', roles: ['leader'] },
];

// Types proposés à la création selon le rôle.
export const rhTypesFor = (role) => RH_TYPES.filter((t) => !t.roles || t.roles.includes(role));

export function formatMonthFr(v) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(v || '').trim());
  if (!m) return v || '—';
  return new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export const rhLabel = (t) => (RH_TYPES.find((x) => x.key === t) || {}).label || t;
export const rhShortLabel = (t) => (RH_TYPES.find((x) => x.key === t) || {}).shortLabel || t;

// Configuration de la vue lecture par type : champs d'en-tête + colonnes.
export const RH_VIEW = {
  leader_mensuel: {
    header: (e, r) => [
      ['Mois', formatMonthFr(e.mois)],
      ['Département', e.departement || r.departmentName || '—'],
      ['Nom du leader', e.nomLeader || '—'],
      ['Téléphone', e.telephone || '—'],
    ],
    sections: (e) => {
      const val = (v) => (v != null && v !== '' ? String(v) : '—');
      return [
        { title: 'I — Effectifs du mois', rows: [
          ['Membres suivis', val(e.effectifMembres)],
          ["Nombre d'encadreurs", val(e.effectifEncadreurs)],
          ['Présence moyenne aux cultes', val(e.presenceMoyenne)],
          ['Nouveaux venus / nouvelles âmes', val(e.nouveauxVenus)],
        ] },
        { title: 'II — Bilan du mois', rows: [
          ['Activités réalisées', val(e.activites)],
          ['Difficultés rencontrées', val(e.difficultes)],
          ['Besoins / sujets de prière', val(e.besoins)],
          ['Projets pour le mois prochain', val(e.projets)],
        ] },
      ];
    },
    columns: [
      { key: 'encadreur', label: 'Encadreur' },
      { key: 'nbMembres', label: 'Membres' },
      { key: 'fichesRemises', label: 'Fiches remises' },
      { key: 'observations', label: 'Observations' },
    ],
  },
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
      ['Département', 'Suivi (Encadreurs)'],
      ["Noms & prénoms de l'encadreur", e.nomSuperviseur || '—'],
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
  cellule_priere: {
    header: (e) => [
      ['Date', formatDateFr(e.date)],
      ['Nom de la cellule', e.nomCellule || '—'],
      ['Leader', e.leader || '—'],
      ['Téléphone', e.telephone || '—'],
    ],
    sections: (e) => {
      const total = e.totalPresents != null && e.totalPresents !== ''
        ? e.totalPresents
        : (Number(e.hommes) || 0) + (Number(e.femmes) || 0) + (Number(e.adolescents) || 0) + (Number(e.enfants) || 0);
      const val = (v) => (v != null && v !== '' ? String(v) : '—');
      return [
        { title: 'I — Assiduité aux réunions', rows: [
          ['Hommes présents', val(e.hommes)],
          ['Femmes présentes', val(e.femmes)],
          ['Adolescents (10-19)', val(e.adolescents)],
          ['Enfants (0-9)', val(e.enfants)],
          ['Total des personnes présentes', val(total)],
          ['Dévotionnel : thème du jour', val(e.themeDevotionnel)],
          ['Membres présents au culte du dimanche', val(e.totalMembresCulte)],
          ['Cas à signaler', val(e.casASignaler)],
        ] },
        { title: 'II — Évangélisation', rows: [
          ['Évangélisé cette semaine ?', val(e.aEvangelise)],
          ["Nombre d'âmes évangélisées", val(e.nbAmes)],
          ['Âmes présentes au culte du dimanche', val(e.totalAmesCulte)],
          ["Si non, pourquoi ?", val(e.raisonNon)],
        ] },
      ];
    },
  },
  choristes: {
    header: (e) => [
      ['Département', 'Chorale'],
      ['Encadreur', e.encadreur || '—'],
      ['Groupe de croissance', e.groupe || '—'],
      ['Semaine du', formatDateFr(e.date)],
    ],
    columns: [
      { key: 'membre', label: 'Membre' },
      { key: 'telephone', label: 'Téléphone' },
      { key: 'bible', label: 'Bible (jours)', compute: (r) => String(Object.values(r.croissance || {}).filter((d) => d?.bible).length) },
      { key: 'livret', label: 'Livret (jours)', compute: (r) => String(Object.values(r.croissance || {}).filter((d) => d?.livret).length) },
      { key: 'presences', label: 'Présences', compute: (r) => String(Object.values(r.presence || {}).filter(Boolean).length) },
      { key: 'remarques', label: 'Remarques' },
    ],
  },
  audiovisuel: {
    header: (e) => [
      ['Département', 'Audiovisuel'],
      ['Mois', e.mois || '—'],
      ['Semaine', (e.semaineDu || e.semaineAu) ? `Du ${e.semaineDu || '…'} au ${e.semaineAu || '…'}` : '—'],
      ["Nom de l'encadreur", e.encadreur || '—'],
      ['Nombre de membres', e.nombreMembres != null && e.nombreMembres !== '' ? String(e.nombreMembres) : '—'],
      ['Remarque particulière', e.remarquesParticulieres || '—'],
    ],
    columns: [
      { key: 'nom', label: 'Nom des ouvriers' },
      { key: 'telephone', label: 'Téléphone' },
      { key: 'm', label: 'M' },
      { key: 'j', label: 'J' },
      { key: 'nuitsPrieres', label: 'Nuits de prières' },
      { key: 'progSpecial', label: 'Prog. Spécial' },
      { key: 'dim', label: 'Dim.' },
      { key: 'rem', label: 'Remarques', compute: (r) => `C.P & Samedi = ${r.cpSamedi || ''} · Devo = ${r.devo || ''} · Service = ${r.service || ''} · Xtère = ${r.xtere || ''}` },
    ],
  },
};