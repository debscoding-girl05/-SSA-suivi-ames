import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Pencil, Trash2, Phone, Mail, Users, FileText } from 'lucide-react';
import { getDirigeant, deleteAssigne } from '../../api/dirigeants';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import AssigneForm from './AssigneForm';
import { Avatar } from '@/components/ui/avatar';
import { roleLabel, isAdminRole } from '@/lib/roles';

export default function DirigeantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Mirrors backend: Pasteur/PR, the dirigeant himself, or a leader of the
  // same department may edit assignés.
  const canManage =
    isAdminRole(user?.role) ||
    user?.id === id ||
    (user?.role === 'leader' && user?.departmentId != null && user?.departmentId === data?.dirigeant?.departmentId);

  const load = useCallback(async () => {
    try {
      const d = await getDirigeant(id);
      setData(d);
      setError('');
    } catch (err) {
      setError(err?.message || 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(a) { setEditing(a); setModalOpen(true); }
  function handleSaved() { setModalOpen(false); setEditing(null); load(); }
  async function handleDelete(a) {
    if (!window.confirm(`Retirer ${a.firstName} ${a.lastName} ?`)) return;
    try {
      await deleteAssigne(id, a.id);
      load();
    } catch (err) {
      setError(err?.message || 'Suppression impossible.');
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <button type="button" onClick={() => navigate('/dirigeants')} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Dirigeants
      </button>

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl border border-border bg-card" />
      ) : error ? (
        <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>
      ) : !data ? null : (
        <>
          {/* Header */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <div className="h-16 bg-primary-gradient" />
            <div className="px-5 pb-5">
              <div className="-mt-8 flex items-end gap-4">
                <Avatar name={data.dirigeant.fullName} size="lg" className="ring-4 ring-card" />
                <div className="min-w-0 flex-1 pb-1">
                  <h1 className="truncate text-xl font-semibold tracking-tight">{data.dirigeant.fullName}</h1>
                  <p className="text-sm text-muted-foreground">
                    {roleLabel(data.dirigeant.role)} · {data.dirigeant.departmentName || 'Sans département'}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                {data.dirigeant.phone && (
                  <a href={`tel:${data.dirigeant.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 font-medium text-primary transition-colors hover:bg-muted">
                    <Phone className="size-3.5" />{data.dirigeant.phone}
                  </a>
                )}
                {data.dirigeant.email && (
                  <span className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-muted-foreground">
                    <Mail className="size-3.5" />{data.dirigeant.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Assignés */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users className="size-4" /> Assignés ({data.assignes.length})
              </h2>
              {canManage && (
                <Button size="sm" onClick={openCreate}><Plus className="size-4" /> Ajouter</Button>
              )}
            </div>

            {data.assignes.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Aucun assigné"
                description="Ce dirigeant n'a pas encore d'âme suivie."
                action={canManage ? <Button size="sm" onClick={openCreate}><Plus className="size-4" /> Ajouter un assigné</Button> : null}
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {data.assignes.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-card">
                    <Avatar name={`${a.firstName} ${a.lastName}`} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{a.firstName} {a.lastName}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.phone || a.email || '—'}</p>
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(a)} aria-label="Modifier"><Pencil className="size-4" /></Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(a)} aria-label="Retirer"><Trash2 className="size-4 text-destructive-dark" /></Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Historique des rapports */}
          <div className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="size-4" /> Rapports ({data.rapports.length})
            </h2>
            {data.rapports.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
                Aucun rapport soumis pour le moment.
              </p>
            ) : (
              <ul className="overflow-hidden rounded-xl border border-border bg-card">
                {data.rapports.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0">
                    <div>
                      <p className="text-sm font-medium">Semaine {r.week} · {r.year}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.presentCount} présent{r.presentCount > 1 ? 's' : ''}{r.remarques ? ` · ${r.remarques}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-success px-2 py-0.5 text-xs font-medium text-success-foreground">Soumis</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier l’assigné' : 'Ajouter un assigné'}>
        <AssigneForm dirigeantId={id} assigne={editing} onSaved={handleSaved} onCancel={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
