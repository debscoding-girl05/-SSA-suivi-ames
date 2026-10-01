import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Plus, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { listAssignes } from '../../api/dirigeants';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../../components/Modal';
import AssigneForm from '../Dirigeants/AssigneForm';

// Accueil de l'encadreur : ses membres et, en un geste, l'ajout d'une
// personne (déjà dans l'annuaire → rattachée à lui ; sinon créée).
export default function MesMembres() {
  const { user } = useAuth();
  const userId = user?.id;
  const [membres, setMembres] = useState(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    if (!userId) return;
    listAssignes(userId).then((res) => setMembres(res.data)).catch(() => setMembres([]));
  }, [userId]);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Users className="size-4 text-primary" /> Mes membres{membres ? ` (${membres.length})` : ''}</h2>
        <Button size="sm" onClick={() => setAdding(true)}><UserPlus className="size-4" /> Ajouter</Button>
      </div>
      {membres === null ? (
        <div className="m-4 h-20 animate-pulse rounded-xl bg-muted" />
      ) : membres.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">Vous ne suivez encore personne.</p>
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="size-4" /> Ajouter mon premier membre</Button>
        </div>
      ) : (
        <ul className="max-h-96 overflow-y-auto">
          {membres.map((m) => {
            const tel = (m.phone || '').replace(/\s/g, '');
            return (
              <li key={m.id} className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0">
                <Avatar name={`${m.firstName} ${m.lastName}`} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.firstName} {m.lastName}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.phone || 'Sans numéro'}{m.zoneResidence ? ` · ${m.zoneResidence}` : ''}</p>
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
      {membres?.length > 0 && (
        <Link to={`/dirigeants/${user?.id}`} className="block border-t border-border px-4 py-2.5 text-center text-xs font-medium text-primary hover:underline">
          Modifier ou retirer un membre
        </Link>
      )}
      <Modal open={adding} onClose={() => setAdding(false)} title="Ajouter un membre">
        <AssigneForm dirigeantId={user?.id} onSaved={() => { setAdding(false); load(); }} onCancel={() => setAdding(false)} />
      </Modal>
    </div>
  );
}
