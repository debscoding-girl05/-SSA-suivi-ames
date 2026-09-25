import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import { createRapportHebdo, updateRapportHebdo, uploadRapportAttachment } from '../../api/rapportsHebdo';
import RapportAttachments from './RapportAttachments';
import { useAuth } from '../../hooks/useAuth';

const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => today().slice(0, 7);

// Soumettre une fiche en joignant simplement la photo de la fiche papier
// (prise à l'instant ou importée) au lieu de la remplir à l'écran. Les
// fichiers choisis dans l'étape précédente arrivent via `files` : on crée un
// brouillon, on y attache les images, puis l'utilisateur soumet.
export default function PhotoFicheForm({ type, files, onSaved }) {
  const { user } = useAuth();
  const [id, setId] = useState(null);
  const [preparing, setPreparing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // StrictMode : ne pas créer deux brouillons
    started.current = true;
    (async () => {
      try {
        const entete = type === 'leader_mensuel'
          ? { mois: thisMonth(), nomLeader: user?.fullName || '', departement: user?.departmentName || '' }
          : { date: today() };
        const draft = await createRapportHebdo({ type, entete, lignes: [], status: 'brouillon' });
        for (const f of files || []) await uploadRapportAttachment(draft.id, f);
        setId(draft.id);
      } catch (err) {
        setError(err?.message || "L'envoi de la photo a échoué.");
      } finally {
        setPreparing(false);
      }
    })();
  }, [type, files, user]);

  async function submit() {
    setBusy(true); setError('');
    try {
      const saved = await updateRapportHebdo(id, { status: 'soumis' });
      onSaved?.(saved, 'soumis');
    } catch (err) {
      setError(err?.message || 'Soumission impossible.');
    } finally { setBusy(false); }
  }

  if (preparing) {
    return (
      <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Envoi de la photo…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Vérifiez que la photo est lisible, ajoutez-en d'autres si la fiche fait plusieurs pages, puis soumettez.
      </p>
      {id && <RapportAttachments rapportId={id} title="Photo(s) de la fiche" />}
      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => onSaved?.(null, 'brouillon')} disabled={busy}>Garder en brouillon</Button>
        <Button type="button" onClick={submit} disabled={busy || !id}>
          <Send className="size-4" /> {busy ? 'Envoi…' : 'Soumettre la fiche'}
        </Button>
      </div>
    </div>
  );
}
