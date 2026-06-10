import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Check, AlertCircle, Send } from 'lucide-react';
import { weekOverview, myRapport } from '../../api/rapports';
import { useAuth } from '../../hooks/useAuth';
import { canSubmitReport } from '@/lib/roles';
import Modal from '../../components/Modal';
import RapportForm from './RapportForm';
import ProgressRing from '../../components/ProgressRing';
import { Avatar } from '@/components/ui/avatar';

export default function RapportsPage() {
  const { user } = useAuth();
  const canSubmit = canSubmitReport(user?.role);

  const [overview, setOverview] = useState(null);
  const [mine, setMine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

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

  function handleSaved() { setModalOpen(false); load(); }

  const manquants = overview?.dirigeants.filter((d) => d.status === 'manquant') || [];
  const soumis = overview?.dirigeants.filter((d) => d.status === 'soumis') || [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rapports</h1>
          <p className="text-sm text-muted-foreground">
            {overview ? `Semaine ${overview.week.week} · ${overview.week.year}` : 'Suivi hebdomadaire'}
          </p>
        </div>
        {canSubmit && (
          <Button onClick={() => setModalOpen(true)}>
            <Send className="size-4" /> {mine ? 'Modifier mon rapport' : 'Soumettre mon rapport'}
          </Button>
        )}
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      {loading || !overview ? (
        <div className="h-24 animate-pulse rounded-xl border border-border bg-card" />
      ) : (
        <>
          {/* Summary — anneau + chiffres */}
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="grid flex-1 grid-cols-3 gap-3 text-center sm:text-left">
              <div>
                <p className="text-2xl font-semibold tabular-nums">{overview.summary.total}</p>
                <p className="text-xs text-muted-foreground">Dirigeants</p>
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums text-success-foreground-light">{overview.summary.soumis}</p>
                <p className="text-xs text-muted-foreground">Soumis</p>
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums text-destructive-dark">{overview.summary.manquant}</p>
                <p className="text-xs text-muted-foreground">Manquants</p>
              </div>
            </div>
            <ProgressRing value={overview.summary.soumis} total={overview.summary.total} label="soumis" size={96} />
          </div>

          {/* Manquants — à relancer */}
          {manquants.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <AlertCircle className="size-4 text-destructive-dark" /> À relancer ({manquants.length})
              </h2>
              <ul className="flex flex-col gap-2">
                {manquants.map((d) => (
                  <li key={d.dirigeantId}>
                    <Link
                      to={`/dirigeants/${d.dirigeantId}`}
                      className="lift flex items-center gap-3 rounded-2xl border border-destructive-dark/30 bg-destructive/50 p-3.5"
                    >
                      <Avatar name={d.fullName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{d.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">{d.departmentName || 'Sans département'}</p>
                      </div>
                      <span className="shrink-0 rounded-md bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground">Manquant</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Soumis */}
          <div className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Check className="size-4 text-success-foreground-light" /> Soumis ({soumis.length})
            </h2>
            {soumis.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
                Aucun rapport soumis cette semaine.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {soumis.map((d) => (
                  <li key={d.dirigeantId}>
                    <Link to={`/dirigeants/${d.dirigeantId}`} className="lift flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-card">
                      <Avatar name={d.fullName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{d.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">{d.departmentName || 'Sans département'}</p>
                      </div>
                      <span className="shrink-0 rounded-md bg-success px-2 py-0.5 text-xs font-medium text-success-foreground">Soumis</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Fiche de la semaine">
        <RapportForm onSaved={handleSaved} onCancel={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
