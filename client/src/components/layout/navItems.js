import { Home, Users, Building2, BookUser, FileText, User } from 'lucide-react';

// Single source of truth for navigation (sidebar + bottom nav).
// `roles` (optional) restricts visibility; `mobile: false` hides from the
// mobile bottom bar (kept in the desktop sidebar only).
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Accueil', icon: Home },
  { to: '/dirigeants', label: 'Dirigeants', icon: Users },
  { to: '/departements', label: 'Départements', icon: Building2, mobile: false },
  { to: '/annuaire', label: 'Annuaire', icon: BookUser },
  { to: '/rapports', label: 'Rapports', icon: FileText },
  { to: '/profile', label: 'Profil', icon: User },
];

export function visibleNavItems(role) {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
