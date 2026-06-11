// Programme d'intégration — 7 leçons (titres indicatifs, ajustables par l'église).
export const LECONS = [
  'Le salut',
  'La prière',
  'La Parole de Dieu',
  'Le baptême',
  'Le Saint-Esprit',
  "La vie d'église",
  'Le service & la mission',
];

export const lessonTitle = (n) => LECONS[n - 1] || `Leçon ${n}`;

// Semaines depuis une date ISO (pour l'alerte de stagnation).
export function weeksSince(iso) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (7 * 24 * 3600 * 1000));
}
