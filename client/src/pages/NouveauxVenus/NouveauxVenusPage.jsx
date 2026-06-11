import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Plus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listNouveauxVenus } from '../../api/integration';
import { useAuth } from '../../hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import { weeksSince } from '@/lib/lecons';
import { Avatar } from '@/components/ui/avatar';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import NouveauVenuForm from './NouveauVenuForm';
import NouveauVenuDetail from './NouveauVenuDetail';

const FD_DEPTS = ['Faiseurs de Disciples', 'Suivi'];

function Pastilles({ validated }) {
  return (
    <div className="flex gap-1" aria-label={`${validated}/7 leçons`}>
      {Array.from({ length: 7 }, (_, i) => {
        const n = i + 1;
        const done = n <= validated;
        const current = n === validated + 1;
        return <span key={n} title={`Leçon ${n}`} className={cn('size-2.5 rounded-full', done ? 'bg-success-foreground-light' : current ? 'bg-warning-foreground-light' : 'bg-muted')} />;
      })}
    </div>
  );
}

export default function NouveauxVenusPage() {
  const { user } = useAuth();
  const canManage = isAdminRole(user?.role) || FD_DEPTS.includes(user?.departmentName);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // { mode:'create'|'view', id }

  const load = useCallback(async () => {
    try { setData((await listNouveauxVenus()).data); setError(''); }
    catch (e) { setError(e?.message || 'Chargement impossible.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  function afterChange() { load(); }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nouveaux venus</h1>
          <p className="text-sm text-muted-foreground">Intégration · parcours des 7 leçons</p>
        </div>
        {canManage && (
          <Button onClick={() => setModal({ mode: 'create' })}>
            <Plus className="size-4" /> Enregistrer un nouveau venu
          </Button>
        )}
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-card" />)}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Aucun nouveau venu"
          description={canManage ? 'Enregistrez la première personne pour démarrer son parcours de 7 leçons.' : 'Aucun nouveau venu dans votre périmètre.'}
          action={canManage ? <Button size="sm" onClick={() => setModal({ mode: 'create' })}><Plus className="size-4" /> Enregistrer</Button> : null}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.map((v) => {
            const w = weeksSince(v.lastProgressAt || v.firstSeenAt);
            const stagnant = v.lessonsValidated < 7 && w != null && w >= 2;
            return (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => setModal({ mode: 'view', id: v.id })}
                  className="lift flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-card"
                >
                  <Avatar name={`${v.firstName} ${v.lastName}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{v.firstName} {v.lastName}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Pastilles validated={v.lessonsValidated} />
                      <span className="text-xs tabular-nums text-muted-foreground">{v.lessonsValidated}/7</span>
                    </div>
                  </div>
                  {stagnant && (
                    <span className="flex shrink-0 items-center gap-1 rounded-md bg-warning px-2 py-0.5 text-xs font-medium text-warning-foreground">
                      <AlertTriangle className="size-3" /> Stagnation
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal?.mode === 'create' ? 'Nouveau venu' : 'Parcours des 7 leçons'}
      >
        {modal?.mode === 'create' && (
          <NouveauVenuForm onSaved={() => { setModal(null); load(); }} onCancel={() => setModal(null)} />
        )}
        {modal?.mode === 'view' && (
          <NouveauVenuDetail id={modal.id} canManage={canManage} onChanged={afterChange} onClose={() => setModal(null)} />
        )}
      </Modal>
    </div>
  );
}
