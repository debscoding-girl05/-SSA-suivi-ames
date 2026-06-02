import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserPlus, UserCheck, UserX, ArrowRight } from 'lucide-react';
import { listMembers } from '../../api/members';
import { useAuth } from '../../hooks/useAuth';
import MemberStatusBadge from '../../components/MemberStatusBadge';

const STAT_CARDS = [
  { key: 'total', label: 'Membres', icon: Users, tint: 'bg-primary-transparent text-primary' },
  { key: 'actif', label: 'Actifs', icon: UserCheck, tint: 'bg-success text-success-foreground' },
  { key: 'nouveau', label: 'Nouveaux', icon: UserPlus, tint: 'bg-warning text-warning-foreground' },
  { key: 'inactif', label: 'Inactifs', icon: UserX, tint: 'bg-muted text-muted-foreground' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = (user?.fullName || '').split(' ')[0] || '';

  const [members, setMembers] = useState([]);
  const [counts, setCounts] = useState({ total: 0, actif: 0, nouveau: 0, inactif: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMembers({ limit: 100 })
      .then((res) => {
        const data = res.data || [];
        setMembers(data);
        setCounts({
          total: res.total ?? data.length,
          actif: data.filter((m) => m.status === 'actif').length,
          nouveau: data.filter((m) => m.status === 'nouveau').length,
          inactif: data.filter((m) => m.status === 'inactif').length,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const recent = members.slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Bonjour{firstName ? `, ${firstName}` : ''} <span aria-hidden>👋</span>
        </h1>
        <p className="text-sm text-muted-foreground">Voici un aperçu du suivi.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, tint }) => (
          <div key={key} className="rounded-xl border border-border bg-card p-4">
            <div className={`mb-3 flex size-9 items-center justify-center rounded-lg ${tint}`}>
              <Icon className="size-5" />
            </div>
            <p className="text-2xl font-semibold">{loading ? '—' : counts[key]}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium">Membres récents</h2>
          <Link to="/members" className="flex items-center gap-1 text-xs font-medium text-primary">
            Voir tout <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun membre pour le moment.</p>
        ) : (
          <ul>
            {recent.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-transparent text-xs font-medium text-primary">
                  {(m.firstName[0] || '') + (m.lastName[0] || '')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.firstName} {m.lastName}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.departmentName || 'Sans département'}</p>
                </div>
                <MemberStatusBadge status={m.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
