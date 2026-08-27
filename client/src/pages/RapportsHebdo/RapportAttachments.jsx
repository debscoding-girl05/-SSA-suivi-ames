import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Loader2 } from 'lucide-react';
import { listRapportAttachments, uploadRapportAttachment, deleteRapportAttachment, fetchRapportAttachmentUrl } from '../../api/rapportsHebdo';

// Vignette : va chercher l'image (endpoint protégé par token) et affiche un
// blob URL — nettoyé au démontage pour ne pas fuiter de mémoire.
function Thumb({ rapportId, attachment, onDelete, disabled }) {
  const [url, setUrl] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;
    fetchRapportAttachmentUrl(rapportId, attachment.id).then((u) => {
      if (cancelled) { URL.revokeObjectURL(u); return; }
      objectUrl = u;
      setUrl(u);
    }).catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [rapportId, attachment.id]);

  async function handleDelete() {
    setBusy(true);
    try { await deleteRapportAttachment(rapportId, attachment.id); onDelete(attachment.id); }
    finally { setBusy(false); }
  }

  return (
    <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/40">
      {url ? (
        <img src={url} alt="Fiche papier" className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
      )}
      {!disabled && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          aria-label="Supprimer la photo"
          className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:bg-black/80"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}

// Photo(s) de la fiche papier attachée(s) à un rapport hebdomadaire.
// `ensureId` : si le rapport n'a pas encore d'id (brouillon jamais
// enregistré), sauvegarde d'abord et renvoie l'id — même logique que le
// téléchargement PDF dans chaque formulaire.
export default function RapportAttachments({ rapportId, ensureId, disabled }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const load = useCallback((id) => {
    if (!id) return;
    setLoading(true);
    listRapportAttachments(id).then((res) => setAttachments(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(rapportId), 0);
    return () => clearTimeout(t);
  }, [rapportId, load]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const id = rapportId || (await ensureId?.());
      if (!id) { setError('Enregistrez la fiche avant d’ajouter une photo.'); return; }
      const saved = await uploadRapportAttachment(id, file);
      setAttachments((list) => [...list, saved]);
      if (!rapportId) load(id);
    } catch (err) {
      setError(err?.message || "L'envoi de la photo a échoué.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Photo de la fiche papier</p>
      <div className="flex flex-wrap items-center gap-2">
        {attachments.map((a) => (
          <Thumb key={a.id} rapportId={rapportId} attachment={a} disabled={disabled} onDelete={(id) => setAttachments((list) => list.filter((x) => x.id !== id))} />
        ))}
        {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        {!disabled && (
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
            {uploading ? 'Envoi…' : 'Ajouter une photo'}
          </Button>
        )}
        <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      </div>
      {error && <p role="alert" className="text-xs text-destructive-dark">{error}</p>}
    </div>
  );
}
