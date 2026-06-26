import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Pencil, Trash2, Phone, Mail, Users, FileText, ClipboardCheck, ChevronRight } from 'lucide-react';
import { getDirigeant, deleteAssigne } from '../../api/dirigeants';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import AssigneForm from './AssigneForm';
import DirigeantForm from './DirigeantForm';
import FicheView from './FicheView';
import ReportView from '../Reports/ReportView';
import ReportStatusBadge from '../../components/ReportStatusBadge';
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
  const [viewReport, setViewReport] = useState(null);
  const [viewFiche, setViewFiche] = useState(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  // Mirrors backend: Pasteur/PR, the dirigeant himself, or a leader of the
  // same department may edit assignés.
  const canManage =
    isAdminRole(user?.role) ||
    user?.id === id ||
    (user?.role === 'leader' && user?.departmentId != null && user?.departmentId === data?.dirigeant?.departmentId);
  // Seuls Pasteur/PR éditent le profil (rôle, département, coordonnées).
  const canEditProfile = isAdminRole(user?.role);

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
                {canEditProfile && (
                  <Button variant="outline" size="sm" onClick={() => setEditProfileOpen(true)}>
                    <Pencil className="size-4" /> Modifier
                  </Button>
                )}
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

          {/* Fiches de présence (hebdomadaires) */}
          <div className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ClipboardCheck className="size-4" /> Fiches de présence ({data.fiches.length})
            </h2>
            {data.fiches.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
                Aucune fiche de présence pour le moment.
              </p>
            ) : (
              <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                {data.fiches.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => setViewFiche(f)}
                      className="flex w-full items-center justify-between gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Semaine {f.week} · {f.year}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {f.presentCount} présent{f.presentCount > 1 ? 's' : ''}{f.remarques ? ` · ${f.remarques}` : ''}
                        </p>
                      </div>
                      <ReportStatusBadge status={f.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Rapports hebdomadaires (documents) */}
          <div className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="size-4" /> Rapports hebdomadaires ({data.reports.length})
            </h2>
            {data.reports.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
                Aucun rapport rédigé pour le moment.
              </p>
            ) : (
              <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                {data.reports.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setViewReport(r)}
                      className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.title}</p>
                        <p className="text-xs text-muted-foreground">Semaine {r.week} · {r.year}</p>
                      </div>
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${r.status === 'transmis' ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}`}>
                        {r.status === 'transmis' ? 'Transmis' : 'Brouillon'}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </button>
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

      <Modal open={editProfileOpen} onClose={() => setEditProfileOpen(false)} title="Modifier le dirigeant">
        {data && (
          <DirigeantForm
            dirigeant={data.dirigeant}
            onSaved={() => { setEditProfileOpen(false); load(); }}
            onCancel={() => setEditProfileOpen(false)}
          />
        )}
      </Modal>

      <Modal open={Boolean(viewReport)} onClose={() => setViewReport(null)} title={viewReport?.title || 'Rapport'}>
        {viewReport && <ReportView report={viewReport} canEdit={false} />}
      </Modal>

      <Modal open={Boolean(viewFiche)} onClose={() => setViewFiche(null)} title="Fiche de présence">
        {viewFiche && data && (
          <FicheView dirigeantId={id} year={viewFiche.year} week={viewFiche.week} assignes={data.assignes} />
        )}
      </Modal>
    </div>
  );
}
