import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Phone, BookUser, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { Avatar } from '@/components/ui/avatar';
import { listDepartments } from '../../api/departments';
import { listDirigeants } from '../../api/dirigeants';
import { listAnnuaire } from '../../api/annuaire';
import EmptyState from '../../components/EmptyState';
import { roleLabel } from '@/lib/roles';

const PAGE_SIZE = 50;

// Annuaire d'un département : ses leaders (un ou plusieurs), ses encadreurs
// et tous les membres suivis par eux, avec appel en un clic.
export default function DepartementDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dept, setDept] = useState(null);
  const [equipe, setEquipe] = useState([]);
  const [membres, setMembres] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listDepartments().then((res) => setDept(res.data.find((d) => String(d.id) === String(id)) || null)).catch(() => {});
    listDirigeants({ departmentId: id }).then((res) => setEquipe(res.data)).catch(() => setEquipe([]));
  }, [id]);

  const loadMembres = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAnnuaire({ departmentId: id, search, page, pageSize: PAGE_SIZE });
      setMembres(res.data);
      setTotal(res.total ?? res.data.length);
      setError('');
    } catch (err) {
      setError(err?.message || 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, [id, search, page]);

  useEffect(() => { const t = setTimeout(loadMembres, 250); return () => clearTimeout(t); }, [loadMembres]);

  const leaders = equipe.filter((d) => d.role === 'leader');
  const encadreurs = equipe.filter((d) => d.role === 'encadreur');

  return (
    <div className="flex flex-col gap-5">
      <button type="button" onClick={() => navigate('/departements')} className="flex min-h-[44px] items-center gap-1.5 self-start text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Départements
      </button>

      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary-transparent text-primary"><Building2 className="size-5" /></div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{dept?.name || 'Département'}</h1>
          <p className="text-sm text-muted-foreground">
            {leaders.length} leader{leaders.length > 1 ? 's' : ''} · {encadreurs.length} encadreur{encadreurs.length > 1 ? 's' : ''} · {total} membre{total > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {[['Leaders', leaders], ['Encadreurs', encadreurs]].map(([title, list]) => list.length > 0 && (
        <div key={title} className="rounded-2xl border border-border bg-card shadow-card">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">{title} ({list.length})</h2>
          <ul>
            {list.map((d) => (
              <li key={d.id} className="border-b border-border last:border-0">
                <Link to={`/dirigeants/${d.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60">
                  <Avatar name={d.fullName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {roleLabel(d.role)}{d.leaderName ? ` · leader : ${d.leaderName}` : ''} · {d.assigneCount} membre{d.assigneCount > 1 ? 's' : ''}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Annuaire du département</h2>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Rechercher un nom, un numéro…" className="h-9 w-full sm:w-72" />
        </div>
        {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}
        {loading ? (
          <div className="h-48 animate-pulse rounded-2xl border border-border bg-card" />
        ) : membres.length === 0 ? (
          <EmptyState icon={BookUser} title="Aucun membre" description="Aucun membre n'est encore suivi dans ce département." />
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            {membres.map((m) => {
              const tel = (m.phone || '').replace(/\s/g, '');
              return (
                <li key={m.id} className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0">
                  <Avatar name={`${m.firstName} ${m.lastName}`} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.firstName} {m.lastName}</p>
                    <p className="truncate text-xs text-muted-foreground">Suivi par {m.dirigeantName || '—'}{m.zoneResidence ? ` · ${m.zoneResidence}` : ''}</p>
                  </div>
                  {tel ? (
                    <a href={`tel:${tel}`} className="flex min-h-[36px] items-center gap-1.5 rounded-lg bg-success px-3 text-xs font-medium text-success-foreground">
                      <Phone className="size-3.5" /> Appeler
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground/60">Sans numéro</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {!loading && total > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-xs text-muted-foreground">Page {page} / {Math.ceil(total / PAGE_SIZE)}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="size-4" /> Précédent</Button>
              <Button variant="outline" size="sm" disabled={page * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>Suivant <ChevronRight className="size-4" /></Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
