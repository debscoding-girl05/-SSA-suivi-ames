import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { weekOverview, myRapport } from '../../api/rapports';
import { useAuth } from '../../hooks/useAuth';
import { canSubmitReport, isAdminRole } from '@/lib/roles';
import Modal from '../../components/Modal';
import RapportForm from './RapportForm';
import ProgressRing from '../../components/ProgressRing';
import ReportStatusBadge from '../../components/ReportStatusBadge';
import { Avatar } from '@/components/ui/avatar';

const SECTIONS = [
  { key: 'soumis', title: 'À valider' },
  { key: 'a_corriger', title: 'À corriger' },
  { key: 'manquant', title: 'Manquants' },
  { key: 'valide', title: 'Validés' },
];

export default function RapportsPage() {
  const { user } = useAuth();
  const canSubmit = canSubmitReport(user?.role);
  const canReview = isAdminRole(user?.role) || user?.role === 'leader';

  const [overview, setOverview] = useState(null);
  const [mine, setMine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null); // dirigeantId or null (=self edit)

  const load = useCallback(async () => {
    try {
      const ov = await weekOverview();
      setOverview(ov);
      if (canSubmit) {
        const m = await myRapport();
        setMine(m.rapport);
      }
      setError('');
    } catch (err) {
      setError(err?.message || 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, [canSubmit]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  function openSelf() { setReviewTarget(null); setModalOpen(true); }
  function openReview(dirigeantId) { setReviewTarget(dirigeantId); setModalOpen(true); }
  function handleSaved() { setModalOpen(false); setReviewTarget(null); load(); }

  const s = overview?.summary;
  const rendues = (s?.soumis ?? 0) + (s?.valide ?? 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rapports</h1>
          <p className="text-sm text-muted-foreground">
            {overview ? `Semaine ${overview.week.week} · ${overview.week.year}` : 'Suivi hebdomadaire'}
          </p>
        </div>
        {canSubmit && (
          <Button onClick={openSelf}>
            <Send className="size-4" /> {mine ? 'Ma fiche' : 'Soumettre ma fiche'}
          </Button>
        )}
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      {loading || !overview ? (
        <div className="h-24 animate-pulse rounded-2xl border border-border bg-card" />
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="grid flex-1 grid-cols-2 gap-3 text-center sm:grid-cols-4 sm:text-left">
              <Stat value={s.total} label="Dirigeants" />
              <Stat value={s.soumis} label="À valider" tone="text-primary" />
              <Stat value={s.valide} label="Validés" tone="text-success-foreground-light" />
              <Stat value={s.manquant} label="Manquants" tone="text-destructive-dark" />
            </div>
            <ProgressRing value={rendues} total={s.total} label="rendues" size={96} />
          </div>

          {SECTIONS.map(({ key, title }) => {
            const rows = overview.dirigeants.filter((d) => d.status === key);
            if (rows.length === 0) return null;
            return (
              <div key={key} className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground">{title} ({rows.length})</h2>
                <ul className="flex flex-col gap-2">
                  {rows.map((d) => {
                    const actionable = canReview && key !== 'manquant';
                    const inner = (
                      <>
                        <Avatar name={d.fullName} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{d.fullName}</p>
                          <p className="truncate text-xs text-muted-foreground">{d.departmentName || 'Sans département'}</p>
                        </div>
                        <ReportStatusBadge status={d.status} />
                      </>
                    );
                    const cls = 'lift flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-card';
                    return (
                      <li key={d.dirigeantId}>
                        {actionable ? (
                          <button type="button" className={cls} onClick={() => openReview(d.dirigeantId)}>{inner}</button>
                        ) : (
                          <Link to={`/dirigeants/${d.dirigeantId}`} className={cls}>{inner}</Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={reviewTarget ? 'Valider la fiche' : 'Ma fiche de la semaine'}
      >
        <RapportForm
          dirigeantId={reviewTarget || undefined}
          mode={reviewTarget ? 'review' : 'edit'}
          onSaved={handleSaved}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

function Stat({ value, label, tone }) {
  return (
    <div>
      <p className={`text-2xl font-semibold tabular-nums ${tone || ''}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
