import { Home, Users, Users2, Building2, BookUser, ClipboardCheck, FileText, Sparkles, User } from 'lucide-react';

// Single source of truth for navigation (sidebar + bottom nav).
// `roles` (optional) restricts visibility; `mobile: false` hides from the
// mobile bottom bar (kept in the desktop sidebar only).
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Accueil', icon: Home },
  { to: '/dirigeants', label: 'Dirigeants', icon: Users, mobile: false },
  { to: '/departements', label: 'Départements', icon: Building2, mobile: false },
  { to: '/annuaire', label: 'Annuaire', icon: BookUser },
  { to: '/nouveaux-venus', label: 'Nouveaux venus', icon: Sparkles, roles: ['pasteur', 'pr', 'leader', 'encadreur'], mobile: false },
  { to: '/fiches', label: 'Fiches', icon: ClipboardCheck },
  { to: '/cellules', label: 'Cellules', icon: Users2, mobile: false },
  { to: '/rapports', label: 'Rapports', icon: FileText, roles: ['leader', 'pr', 'pasteur'] },
  { to: '/profile', label: 'Profil', icon: User },
];

export function visibleNavItems(role) {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}