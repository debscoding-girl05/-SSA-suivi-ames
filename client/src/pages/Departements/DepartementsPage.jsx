import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchInput } from '@/components/ui/search-input';
import { Building2, UsersRound, UserCheck, ChevronRight } from 'lucide-react';
import { departmentsOverview } from '../../api/departments';
import EmptyState from '../../components/EmptyState';

export default function DepartementsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    departmentsOverview()
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.message || 'Chargement impossible.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? data.filter((d) => d.name.toLowerCase().includes(q)) : data;
    // Départements actifs (avec dirigeants) d'abord.
    return [...list].sort((a, b) => b.dirigeantCount - a.dirigeantCount || a.name.localeCompare(b.name, 'fr'));
  }, [data, search]);

  const totalDir = data.reduce((s, d) => s + d.dirigeantCount, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Départements</h1>
          <p className="text-sm text-muted-foreground">{data.length} départements · {totalDir} dirigeants</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-card">
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un département…" className="h-9 flex-1 border-0 shadow-none" />
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl border border-border bg-card" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Building2} title="Aucun département" description="Aucun résultat pour cette recherche." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => {
            const pct = d.total ? Math.round((d.soumis / d.total) * 100) : 0;
            const empty = d.dirigeantCount === 0;
            return (
              <button
                key={d.id}
                type="button"
                disabled={empty}
                onClick={() => navigate(`/dirigeants?departmentId=${d.id}`)}
                className="lift flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-card disabled:cursor-default disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-card"
              >
                <div className="flex items-start justify-between">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary-transparent text-primary">
                    <Building2 className="size-5" />
                  </div>
                  {!empty && <ChevronRight className="size-4 text-muted-foreground" />}
                </div>

                <div className="min-w-0">
                  <p className="truncate font-semibold">{d.name}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><UserCheck className="size-3.5" />{d.dirigeantCount} dirigeant{d.dirigeantCount > 1 ? 's' : ''}</span>
                    <span className="flex items-center gap-1"><UsersRound className="size-3.5" />{d.assigneCount} assigné{d.assigneCount > 1 ? 's' : ''}</span>
                  </div>
                </div>

                {empty ? (
                  <p className="text-xs text-muted-foreground/70">Aucun dirigeant assigné</p>
                ) : (
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Fiches semaine</span>
                      <span className="tabular-nums font-medium">{d.soumis}/{d.total}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${pct === 100 ? 'bg-success-foreground-light' : 'bg-primary'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
