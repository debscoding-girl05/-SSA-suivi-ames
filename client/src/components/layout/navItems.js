import { Home, Users, Building2, BookUser, ClipboardCheck, FileText, Sparkles, HeartHandshake, User, ShieldCheck, ClipboardList } from 'lucide-react';
import { rhTypesFor } from '../../pages/RapportsHebdo/types';
import { readsAllRole } from '@/lib/roles';

// Single source of truth for navigation (sidebar + bottom nav).
// `roles` (optional) restricts visibility; `mobile: false` hides from the
// mobile bottom bar (kept in the desktop sidebar only).
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Accueil', icon: Home },
  { to: '/dirigeants', label: 'Leaders', icon: Users, mobile: false },
  { to: '/departements', label: 'Départements', icon: Building2, mobile: false },
  { to: '/annuaire', label: 'Annuaire', icon: BookUser },
  { to: '/nouveaux-venus', label: 'Nouveaux venus', icon: Sparkles, roles: ['pasteur', 'pr', 'leader', 'encadreur'], mobile: false },
  { to: '/fiches', label: 'Fiches', icon: ClipboardCheck },
  { to: '/rapports', label: 'Rapports', icon: FileText, roles: ['leader', 'pr', 'pasteur'] },
  // Seulement si l'utilisateur a au moins un modèle de fiche pour son
  // département / rôle (ou lit tout : Pasteur, PR, Secrétaire).
  { to: '/rapports-hebdo', label: 'Fiches hebdo', icon: ClipboardList, mobile: false, when: (u) => readsAllRole(u?.role) || rhTypesFor(u).length > 0 },
  { to: '/cellules', label: 'Cellules', icon: HeartHandshake, roles: ['pasteur', 'pr', 'leader_cellule'], mobile: false },
  { to: '/profile', label: 'Profil', icon: User },
  { to: '/connexions', label: 'Connexions', icon: ShieldCheck, roles: ['pasteur', 'pr'], mobile: false },
];

export function visibleNavItems(user) {
  const role = user?.role;
  return NAV_ITEMS.filter((item) => (!item.roles || item.roles.includes(role)) && (!item.when || item.when(user)));
}