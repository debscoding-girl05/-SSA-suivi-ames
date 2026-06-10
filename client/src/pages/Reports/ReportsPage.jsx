import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';
import { listReports, transmitReport, deleteReport } from '../../api/reports';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import ReportEditor from './ReportEditor';
import ReportView from './ReportView';

export default function ReportsPage() {
  const { user } = useAuth();
  const canAuthor = user?.role === 'leader' || user?.role === 'pr';

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // { mode:'view'|'edit'|'create', report }

  const load = useCallback(async () => {
    try {
      const res = await listReports();
      setData(res.data);
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

  function close() { setModal(null); }
  function afterSave() { close(); load(); }

  async function onTransmit(report) {
    try { await transmitReport(report.id); afterSave(); } catch (e) { setError(e?.message || 'Action impossible.'); }
  }
  async function onDelete(report) {
    if (!window.confirm(`Supprimer « ${report.title} » ?`)) return;
    try { await deleteReport(report.id); afterSave(); } catch (e) { setError(e?.message || 'Suppression impossible.'); }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rapports</h1>
          <p className="text-sm text-muted-foreground">Synthèses & documents transmis à la hiérarchie</p>
        </div>
        {canAuthor && (
          <Button onClick={() => setModal({ mode: 'create' })}>
            <Plus className="size-4" /> Nouveau rapport
          </Button>
        )}
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl border border-border bg-card" />
      ) : data.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucun rapport"
          description={canAuthor ? 'Rédigez un rapport ou pré-remplissez-le depuis les fiches.' : 'Aucun rapport transmis pour le moment.'}
          action={canAuthor ? <Button size="sm" onClick={() => setModal({ mode: 'create' })}><Plus className="size-4" /> Nouveau rapport</Button> : null}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {data.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setModal({ mode: 'view', report: r })}
                className="lift flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-card"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-transparent text-primary">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {r.departmentName ? `${r.departmentName} · ` : ''}Semaine {r.week} · {r.authorName}
                  </p>
                </div>
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${r.status === 'transmis' ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {r.status === 'transmis' ? 'Transmis' : 'Brouillon'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(modal)}
        onClose={close}
        title={modal?.mode === 'view' ? modal.report.title : modal?.mode === 'edit' ? 'Éditer le rapport' : 'Nouveau rapport'}
      >
        {modal?.mode === 'view' && (
          <ReportView
            report={modal.report}
            canEdit={modal.report.authorId === user?.id && modal.report.status === 'brouillon'}
            onEdit={() => setModal({ mode: 'edit', report: modal.report })}
            onTransmit={() => onTransmit(modal.report)}
            onDelete={() => onDelete(modal.report)}
          />
        )}
        {(modal?.mode === 'edit' || modal?.mode === 'create') && (
          <ReportEditor report={modal.report} onSaved={afterSave} onCancel={close} />
        )}
      </Modal>
    </div>
  );
}
