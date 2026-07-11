import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { Users, Plus, ChevronRight, MapPin, CalendarDays } from 'lucide-react';
import { listCellules } from '../../api/cellules';
import { useAuth } from '../../hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import CelluleForm from './CelluleForm';

export default function CellulesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = isAdminRole(user?.role) || user?.role === 'leader';

  const [cellules, setCellules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listCellules();
      setCellules(data);
      setError('');
    } catch (err) {
      setError(err?.message || 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? cellules.filter((c) => c.nom.toLowerCase().includes(q)) : cellules;
    return [...list].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  }, [cellules, search]);

  function handleCreated() {
    setModalOpen(false);
    load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cellules de prière</h1>
          <p className="text-sm text-muted-foreground">{cellules.length} cellule{cellules.length > 1 ? 's' : ''}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="size-4" /> Nouvelle cellule
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-card">
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher une cellule…" className="h-9 flex-1 border-0 shadow-none" />
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl border border-border bg-card" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucune cellule"
          description={search ? 'Aucun résultat pour cette recherche.' : "Aucune cellule de prière n'a encore été créée."}
          action={canCreate && !search ? <Button onClick={() => setModalOpen(true)}><Plus className="size-4" /> Créer une cellule</Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => navigate(`/cellules/${c.id}`)}
              className="lift flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-card"
            >
              <div className="flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary-transparent text-primary">
                  <Users className="size-5" />
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>

              <div className="min-w-0">
                <p className="truncate font-semibold">{c.nom}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.leaderName || 'Sans leader assigné'}{c.departmentName ? ` · ${c.departmentName}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="size-3.5" />{c.memberCount ?? 0} membre{(c.memberCount ?? 0) > 1 ? 's' : ''}</span>
                {c.jourReunion && <span className="flex items-center gap-1"><CalendarDays className="size-3.5" />{c.jourReunion}</span>}
                {c.lieu && <span className="flex items-center gap-1 truncate"><MapPin className="size-3.5 shrink-0" />{c.lieu}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle cellule">
        <CelluleForm onSaved={handleCreated} onCancel={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
