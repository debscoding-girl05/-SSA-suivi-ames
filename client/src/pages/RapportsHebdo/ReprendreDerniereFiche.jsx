import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { fetchLastRapportHebdo } from './carryForward';

// Bouton "reprendre la liste de la semaine dernière" — évite de retaper les
// mêmes noms chaque semaine pour les fiches à roster (huissier, faiseur de
// disciples, superviseurs, choristes, audiovisuel). `resetRow` garde
// l'identité (nom/téléphone/...) et efface les champs propres à la semaine.
export default function ReprendreDerniereFiche({ type, currentId, resetRow, onApply }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleClick() {
    setBusy(true);
    setMsg('');
    try {
      const last = await fetchLastRapportHebdo(type, currentId);
      if (!last || !(last.lignes || []).length) {
        setMsg('Aucune fiche précédente trouvée.');
        return;
      }
      onApply(last.lignes.map(resetRow));
    } catch (err) {
      setMsg(err?.message || 'Impossible de récupérer la fiche précédente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={busy}>
        <RotateCcw className="size-3.5" /> {busy ? 'Chargement…' : 'Reprendre la liste de la semaine dernière'}
      </Button>
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </div>
  );
}
