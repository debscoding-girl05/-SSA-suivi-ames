import { useCallback, useEffect, useMemo, useState } from 'react';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { Phone, Mail, BookUser, ChevronLeft, ChevronRight } from 'lucide-react';
import { listAnnuaire } from '../../api/annuaire';
import { listDepartments } from '../../api/departments';
import EmptyState from '../../components/EmptyState';
import { Avatar } from '@/components/ui/avatar';

const PAGE_SIZE = 50;

export default function AnnuairePage() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // Une nouvelle recherche/filtre repart toujours de la page 1.
  const changeSearch = (v) => { setSearch(v); setPage(1); };
  const changeDepartmentFilter = (v) => { setDepartmentFilter(v); setPage(1); };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listAnnuaire({ search, departmentId: departmentFilter, page, pageSize: PAGE_SIZE });
      setData(res.data);
      setTotal(res.total ?? res.data.length);
    } catch (err) {
      setError(err?.message || 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, [search, departmentFilter, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    listDepartments().then((res) => setDepartments(res.data)).catch(() => setDepartments([]));
  }, []);

  const departmentOptions = useMemo(
    () => [
      { value: '', label: 'Tous les départements' },
      ...departments.map((d) => ({ value: String(d.id), label: d.name })),
    ],
    [departments]
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Annuaire</h1>
        <p className="text-sm text-muted-foreground">Âmes suivies · {total} contact{total > 1 ? 's' : ''}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-card">
        <SearchInput value={search} onChange={changeSearch} placeholder="Rechercher un nom, un numéro…" className="h-9 min-w-[180px] flex-1 border-0 shadow-none" />
        <Select value={departmentFilter} onChange={changeDepartmentFilter} options={departmentOptions} searchable size="sm" className="w-52" />
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      {loading ? (
        <div className="h-72 animate-pulse rounded-2xl border border-border bg-card" />
      ) : data.length === 0 ? (
        <EmptyState icon={BookUser} title="Aucun contact" description="Ajustez votre recherche ou vos filtres." />
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {data.map((m) => {
            const tel = (m.phone || '').replace(/\s/g, '');
            return (
              <li key={m.id} className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0">
                <Avatar name={`${m.firstName} ${m.lastName}`} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.firstName} {m.lastName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.departmentName || 'Sans département'} · {m.dirigeantName || '—'}
                  </p>
                </div>
                {m.email && !m.phone && (
                  <a href={`mailto:${m.email}`} aria-label="Envoyer un email" className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted">
                    <Mail className="size-4" />
                  </a>
                )}
                {tel ? (
                  <a
                    href={`tel:${tel}`}
                    className="flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-success-foreground transition-opacity hover:opacity-90"
                  >
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
          <span className="text-xs text-muted-foreground">
            Page {page} / {Math.ceil(total / PAGE_SIZE)}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="size-4" /> Précédent
            </Button>
            <Button variant="outline" size="sm" disabled={page * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>
              Suivant <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
