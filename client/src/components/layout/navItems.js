import { Home, Users, Building2, BookUser, ClipboardCheck, FileText, Sparkles, HeartHandshake, User, ShieldCheck, ClipboardList } from 'lucide-react';
import { rhTypesFor } from '../../pages/RapportsHebdo/types';
import { readsAllRole } from '@/lib/roles';

// Source unique des menus (barre latérale + barre du bas), alignée sur la
// matrice des accès (docs/ACCES.md) — le serveur applique les mêmes règles.
// `roles` restreint par rôle, `when(user)` par département ; `mobile: false`
// = absent de la barre du bas (accessible depuis Profil → Menu).
const FD_DEPTS = ['Faiseurs de Disciples', 'Suivi'];
const BUREAU = ['pasteur', 'pr', 'secretaire'];

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Accueil', icon: Home },
  { to: '/dirigeants', label: 'Leaders', icon: Users, roles: [...BUREAU, 'leader'], mobile: false },
  { to: '/departements', label: 'Départements', icon: Building2, roles: [...BUREAU, 'leader'], mobile: false },
  { to: '/annuaire', label: 'Annuaire', icon: BookUser, roles: [...BUREAU, 'leader', 'encadreur'] },
  { to: '/nouveaux-venus', label: 'Nouveaux venus', icon: Sparkles, mobile: false, when: (u) => readsAllRole(u?.role) || (['leader', 'encadreur'].includes(u?.role) && FD_DEPTS.includes(u?.departmentName)) },
  { to: '/fiches', label: 'Fiches', icon: ClipboardCheck, roles: [...BUREAU, 'leader', 'encadreur'] },
  { to: '/rapports', label: 'Rapports', icon: FileText, roles: [...BUREAU, 'leader'] },
  // Seulement si l'utilisateur a au moins un modèle de fiche pour son
  // département / rôle (ou lit tout : Pasteur, PR, Secrétaire).
  { to: '/rapports-hebdo', label: 'Fiches hebdo', icon: ClipboardList, mobile: false, when: (u) => readsAllRole(u?.role) || rhTypesFor(u).length > 0 },
  { to: '/cellules', label: 'Cellules', icon: HeartHandshake, roles: [...BUREAU, 'leader_cellule'], mobile: false },
  { to: '/profile', label: 'Profil', icon: User },
  { to: '/connexions', label: 'Connexions', icon: ShieldCheck, roles: ['pasteur', 'pr'], mobile: false },
];

export function visibleNavItems(user) {
  const role = user?.role;
  return NAV_ITEMS.filter((item) => (!item.roles || item.roles.includes(role)) && (!item.when || item.when(user)));
}