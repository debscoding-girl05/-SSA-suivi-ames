import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, UsersRound, UserCheck, ChevronRight, Plus, Pencil } from 'lucide-react';
import { departmentsOverview, createDepartment, updateDepartment } from '../../api/departments';
import { useAuth } from '../../hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';

const TEXTAREA =
  'border-input bg-background text-foreground flex w-full rounded-lg border px-3 py-2 text-base shadow-xs outline-none resize-y focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 md:text-sm';

export default function DepartementsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = isAdminRole(user?.role);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null); // dept being renamed, or null = create
  const [form, setForm] = useState({ name: '', description: '' });
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    departmentsOverview()
      .then((res) => { setData(res.data); setError(''); })
      .catch((err) => setError(err?.message || 'Chargement impossible.'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  function openCreate() { setEditing(null); setForm({ name: '', description: '' }); setFormError(''); setOpen(true); }
  function openEdit(d) { setEditing(d); setForm({ name: d.name, description: d.description || '' }); setFormError(''); setOpen(true); }

  async function submit(e) {
    e.preventDefault();
    setFormError(''); setBusy(true);
    try {
      if (editing) await updateDepartment(editing.id, form);
      else await createDepartment(form);
      setOpen(false);
      load();
    } catch (err) {
      setFormError(err?.message || 'Enregistrement impossible.');
    } finally { setBusy(false); }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? data.filter((d) => d.name.toLowerCase().includes(q)) : data;
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
        {canManage && <Button onClick={openCreate}><Plus className="size-4" /> Nouveau département</Button>}
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
        <EmptyState icon={Building2} title="Aucun département" description={canManage ? 'Créez un département pour démarrer.' : 'Aucun résultat pour cette recherche.'} action={canManage ? <Button size="sm" onClick={openCreate}><Plus className="size-4" /> Nouveau département</Button> : null} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => {
            const pct = d.total ? Math.round((d.soumis / d.total) * 100) : 0;
            const empty = d.dirigeantCount === 0;
            return (
              <div key={d.id} className="relative">
                <button
                  type="button"
                  disabled={empty}
                  onClick={() => navigate(`/dirigeants?departmentId=${d.id}`)}
                  className="lift flex h-full w-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-card disabled:cursor-default disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-card"
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

                {canManage && (
                  <button
                    type="button"
                    onClick={() => openEdit(d)}
                    aria-label={`Modifier ${d.name}`}
                    className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-lg bg-card/80 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Modifier le département' : 'Nouveau département'}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dep-nom" className="text-sm font-medium">Nom *</label>
            <Input id="dep-nom" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dep-desc" className="text-sm font-medium">Description</label>
            <textarea id="dep-desc" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={TEXTAREA} />
          </div>

          {formError && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{formError}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>Annuler</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
