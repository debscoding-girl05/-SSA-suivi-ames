import { Home, Users, FileText, BarChart3, User } from 'lucide-react';

// Single source of truth for navigation (sidebar + bottom nav).
// `roles` (optional) restricts visibility; omit = visible to everyone.
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Accueil', icon: Home },
  { to: '/members', label: 'Membres', icon: Users },
  { to: '/sheets', label: 'Fiches', icon: FileText },
  { to: '/stats', label: 'Stats', icon: BarChart3, roles: ['admin', 'leader'] },
  { to: '/profile', label: 'Profil', icon: User },
];

export function visibleNavItems(role) {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
