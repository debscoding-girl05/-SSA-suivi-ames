import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, Phone, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { getEquipe } from '../../api/dirigeants';
import { useAuth } from '../../hooks/useAuth';
import StatCard from '../../components/StatCard';
import ReportStatusBadge from '../../components/ReportStatusBadge';
import Modal from '../../components/Modal';
import AssigneForm from '../Dirigeants/AssigneForm';

// Accueil du leader : les personnes dont il est responsable — ses encadreurs
// et l'ensemble des membres suivis (les siens + ceux de ses encadreurs).
export default function LeaderEquipe() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    getEquipe().then(setData).catch(() => setData({ encadreurs: [], membres: [], membresTotal: 0 }));
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  if (!data) return <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Users} tint="violet" value={data.membresTotal} label="Membres" />
        <StatCard icon={UserCheck} tint="emerald" value={data.encadreurs.length} label="Encadreurs" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card shadow-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Mes encadreurs</h2>
          </div>
          {data.encadreurs.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun encadreur rattaché pour l'instant.</p>
          ) : (
            <ul>
              {data.encadreurs.map((e) => (
                <li key={e.id} className="border-b border-border last:border-0">
                  <Link to={`/dirigeants/${e.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60">
                    <Avatar name={e.fullName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">{e.assigneCount} membre{e.assigneCount > 1 ? 's' : ''}</p>
                    </div>
                    <ReportStatusBadge status={e.reportStatus === 'soumis' || e.reportStatus === 'valide' ? e.reportStatus : 'manquant'} />
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Membres ({data.membresTotal})</h2>
            <Button size="sm" variant="ghost" onClick={() => setAdding(true)}><Plus className="size-4" /> Ajouter</Button>
          </div>
          {data.membres.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun membre suivi pour l'instant.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {data.membres.map((m) => {
                const tel = (m.phone || '').replace(/\s/g, '');
                return (
                  <li key={m.id} className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0">
                    <Avatar name={`${m.firstName} ${m.lastName}`} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.firstName} {m.lastName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.dirigeantId === user?.id ? 'Suivi par moi' : `Suivi par ${m.dirigeantName || '—'}`}
                      </p>
                    </div>
                    {tel && (
                      <a href={`tel:${tel}`} aria-label={`Appeler ${m.firstName}`} className="flex size-9 items-center justify-center rounded-lg bg-success text-success-foreground">
                        <Phone className="size-4" />
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {data.membresTotal > data.membres.length && (
            <Link to="/annuaire" className="block border-t border-border px-4 py-2.5 text-center text-xs font-medium text-primary hover:underline">
              Voir tout l'annuaire
            </Link>
          )}
        </div>
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Ajouter un membre">
        <AssigneForm dirigeantId={user?.id} onSaved={() => { setAdding(false); load(); }} onCancel={() => setAdding(false)} />
      </Modal>
    </div>
  );
}
