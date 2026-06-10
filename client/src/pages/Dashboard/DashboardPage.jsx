import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Check, AlertCircle, ArrowRight, ChevronRight } from 'lucide-react';
import { weekOverview } from '../../api/rapports';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '@/components/ui/avatar';
import StatCard from '../../components/StatCard';
import ProgressRing from '../../components/ProgressRing';

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = (user?.fullName || '').split(' ').slice(-1)[0] || '';

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    weekOverview().then(setOverview).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const s = overview?.summary;
  const rendu = (d) => d.status === 'soumis' || d.status === 'valide';
  // À relancer = pas encore rendu (manquant) ou renvoyé pour correction.
  const manquants = overview?.dirigeants.filter((d) => d.status === 'manquant' || d.status === 'a_corriger') || [];
  const rendues = (s?.soumis ?? 0) + (s?.valide ?? 0);
  const enRetard = (s?.manquant ?? 0) + (s?.aCorriger ?? 0);

  const byDept = useMemo(() => {
    const m = new Map();
    for (const d of overview?.dirigeants || []) {
      const k = d.departmentName || 'Sans département';
      const e = m.get(k) || { soumis: 0, total: 0 };
      e.total += 1;
      if (rendu(d)) e.soumis += 1;
      m.set(k, e);
    }
    return [...m.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total);
  }, [overview]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-28 animate-pulse rounded-2xl border border-border bg-card" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-card" />)}
        </div>
        <div className="h-48 animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Bonjour{firstName ? `, ${firstName}` : ''} <span aria-hidden>👋</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          {overview ? `Suivi pastoral · semaine ${overview.week.week}` : 'Aperçu du suivi'}
        </p>
      </div>

      {/* Hero — taux de soumission */}
      <div className="flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fiches de la semaine</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">
            {rendues}<span className="text-xl text-muted-foreground">/{s?.total ?? 0}</span>
          </p>
          <p className="mt-1 text-sm">
            {enRetard ? (
              <span className="font-medium text-destructive-dark">{enRetard} à relancer</span>
            ) : (
              <span className="font-medium text-success-foreground-light">Tout est à jour 🎉</span>
            )}
          </p>
        </div>
        <ProgressRing value={rendues} total={s?.total ?? 0} label="rendues" size={104} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Users} tint="violet" value={s?.total ?? 0} label="Dirigeants" />
        <StatCard icon={Check} tint="emerald" value={rendues} label="Rendues" />
        <StatCard icon={AlertCircle} tint="rose" value={enRetard} label="À relancer" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* À relancer */}
        <div className="rounded-2xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">À relancer</h2>
            <Link to="/rapports" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Rapports <ArrowRight className="size-3.5" />
            </Link>
          </div>
          {manquants.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Tous les rapports sont soumis. 🎉</p>
          ) : (
            <ul>
              {manquants.slice(0, 6).map((d) => (
                <li key={d.dirigeantId}>
                  <Link
                    to={`/dirigeants/${d.dirigeantId}`}
                    className="flex items-center gap-3 border-b border-border px-4 py-2.5 transition-colors last:border-0 hover:bg-muted/60"
                  >
                    <Avatar name={d.fullName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">{d.departmentName || 'Sans département'}</p>
                    </div>
                    <span className="rounded-md bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground">Manquant</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Soumission par département */}
        <div className="rounded-2xl border border-border bg-card shadow-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Soumission par département</h2>
          </div>
          <div className="flex flex-col gap-3 p-4">
            {byDept.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Aucune donnée.</p>
            ) : (
              byDept.map((d) => {
                const pct = d.total ? Math.round((d.soumis / d.total) * 100) : 0;
                return (
                  <div key={d.name}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{d.name}</span>
                      <span className="tabular-nums text-muted-foreground">{d.soumis}/{d.total}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${pct === 100 ? 'bg-success-foreground-light' : 'bg-primary'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
