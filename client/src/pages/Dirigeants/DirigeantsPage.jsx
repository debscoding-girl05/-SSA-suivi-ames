import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { Users, ChevronRight, UsersRound, Building2, RotateCcw, Plus, Mail, X } from 'lucide-react';
import { listDirigeants } from '../../api/dirigeants';
import { listInvitations, revokeInvitation } from '../../api/invitations';
import { listDepartments } from '../../api/departments';
import ReportStatusBadge from '../../components/ReportStatusBadge';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import DirigeantForm from './DirigeantForm';
import { Avatar } from '@/components/ui/avatar';
import { roleLabel, isAdminRole } from '@/lib/roles';
import { useAuth } from '../../hooks/useAuth';

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'soumis', label: 'À jour' },
  { value: 'manquant', label: 'En retard' },
];

export default function DirigeantsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = isAdminRole(user?.role);
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState(searchParams.get('departmentId') || '');
  const [modalOpen, setModalOpen] = useState(false);
  const [invites, setInvites] = useState([]);

  const loadInvites = useCallback(() => {
    if (!canCreate) return;
    listInvitations().then((res) => setInvites(res.data)).catch(() => setInvites([]));
  }, [canCreate]);

  useEffect(() => { loadInvites(); }, [loadInvites]);

  async function handleRevoke(inv) {
    if (!window.confirm(`Révoquer l'invitation envoyée à ${inv.email} ?`)) return;
    try {
      await revokeInvitation(inv.id);
      loadInvites();
    } catch (err) {
      setError(err?.message || 'Révocation impossible.');
    }
  }

  // Keep the department filter in sync with the URL (?departmentId=).
  const changeDepartment = (value) => {
    setDepartmentFilter(value);
    setSearchParams(value ? { departmentId: value } : {}, { replace: true });
  };
  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    changeDepartment('');
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listDirigeants({ search, departmentId: departmentFilter });
      setData(res.data);
    } catch (err) {
      setError(err?.message || 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, [search, departmentFilter]);

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

  const filtered = useMemo(() => {
    if (!statusFilter) return data;
    return data.filter((d) => (d.reportStatus === 'soumis' ? 'soumis' : 'manquant') === statusFilter);
  }, [data, statusFilter]);

  // Group by department (arborescence département → dirigeants).
  const groups = useMemo(() => {
    const m = new Map();
    for (const d of filtered) {
      const k = d.departmentName || 'Sans département';
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(d);
    }
    return [...m.entries()]
      .map(([name, items]) => ({
        name,
        items,
        soumis: items.filter((x) => x.reportStatus === 'soumis').length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [filtered]);

  const hasFilters = search || statusFilter || departmentFilter;
  const soumis = data.filter((d) => d.reportStatus === 'soumis').length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dirigeants</h1>
          <p className="text-sm text-muted-foreground">Leaders &amp; encadreurs, par département</p>
        </div>
        {!loading && data.length > 0 && (
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="rounded-full bg-success px-3 py-1.5 text-success-foreground">{soumis} à jour</span>
            <span className="rounded-full bg-destructive px-3 py-1.5 text-destructive-foreground">{data.length - soumis} en retard</span>
          </div>
        )}
        {canCreate && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="size-4" /> Inviter un dirigeant
          </Button>
        )}
      </div>

      {/* Barre de filtres (façon maquette) */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-card">
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher…" className="h-9 min-w-[180px] flex-1 border-0 shadow-none" />
        <Select value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} size="sm" className="w-40" />
        <Select value={departmentFilter} onChange={changeDepartment} options={departmentOptions} searchable size="sm" className="w-52" />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <RotateCcw className="size-3.5" /> Réinitialiser
          </Button>
        )}
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      {canCreate && invites.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2">
            <Mail className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">Invitations en attente ({invites.length})</span>
          </div>
          {invites.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{inv.email}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {roleLabel(inv.role)}{inv.departmentName ? ` · ${inv.departmentName}` : ''}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => handleRevoke(inv)} aria-label="Révoquer">
                <X className="size-4 text-destructive-dark" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="h-72 animate-pulse rounded-2xl border border-border bg-card" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="Aucun dirigeant trouvé" description="Ajustez votre recherche ou vos filtres." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {groups.map((g) => (
            <div key={g.name}>
              {/* En-tête de groupe (département) */}
              <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/50 px-4 py-2">
                <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Building2 className="size-3.5" /> {g.name}
                  <span className="text-muted-foreground/70">· {g.items.length}</span>
                </span>
                <span className="text-xs font-medium tabular-nums text-muted-foreground">{g.soumis}/{g.items.length} à jour</span>
              </div>

              {g.items.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => navigate(`/dirigeants/${d.id}`)}
                  className="flex w-full items-center gap-3 border-b border-border px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-muted/50"
                >
                  <Avatar name={d.fullName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">{roleLabel(d.role)}</p>
                  </div>
                  {d.isActive === false && (
                    <span className="hidden shrink-0 rounded-md bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground sm:inline-block">Désactivé</span>
                  )}
                  <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                    <UsersRound className="size-3.5" />{d.assigneCount}
                  </span>
                  <ReportStatusBadge status={d.reportStatus === 'soumis' ? 'soumis' : 'manquant'} />
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Inviter un dirigeant">
        <DirigeantForm onSaved={() => { setModalOpen(false); load(); loadInvites(); }} onCancel={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
