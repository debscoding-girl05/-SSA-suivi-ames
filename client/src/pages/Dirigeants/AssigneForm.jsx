import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchInput } from '@/components/ui/search-input';
import { UserPlus } from 'lucide-react';
import { createAssigne, updateAssigne, attachAssigne } from '../../api/dirigeants';
import { listAnnuaire } from '../../api/annuaire';

const LABEL = 'text-sm font-medium';
const TEXTAREA =
  'border-input bg-background text-foreground flex w-full rounded-lg border px-3 py-2 text-base shadow-xs outline-none resize-y focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 md:text-sm';

// Search step: pick someone already in the annuaire instead of retyping
// their info. Only offered on create — an existing assigné is already
// attached to someone.
function AnnuaireSearch({ dirigeantId, onAttached }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [attachingId, setAttachingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      if (query.trim().length < 2) { setResults([]); return; }
      setLoading(true);
      listAnnuaire({ search: query, pageSize: 20 })
        .then((res) => { if (!cancelled) setResults(res.data.filter((m) => m.dirigeantId !== dirigeantId)); })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, dirigeantId]);

  async function attach(m) {
    setError('');
    setAttachingId(m.id);
    try {
      const saved = await attachAssigne(dirigeantId, m.id);
      onAttached?.(saved);
    } catch (err) {
      setError(err?.message || 'Rattachement impossible.');
    } finally {
      setAttachingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-3">
      <label className={LABEL}>Déjà dans l'annuaire ?</label>
      <SearchInput value={query} onChange={setQuery} placeholder="Chercher un nom, un numéro…" className="bg-background" />
      {loading && <p className="px-1 text-xs text-muted-foreground">Recherche…</p>}
      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}
      {!loading && query.trim().length >= 2 && results.length === 0 && (
        <p className="px-1 text-xs text-muted-foreground">Aucun résultat — c'est probablement une nouvelle personne, remplissez le formulaire ci-dessous.</p>
      )}
      {results.length > 0 && (
        <ul className="overflow-hidden rounded-lg border border-border bg-background">
          {results.map((m) => (
            <li key={m.id} className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.firstName} {m.lastName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.phone || m.email || 'Sans contact'}{m.dirigeantName ? ` · actuellement suivi par ${m.dirigeantName}` : ''}
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" disabled={attachingId === m.id} onClick={() => attach(m)}>
                {attachingId === m.id ? 'Rattachement…' : 'Rattacher à moi'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Add/edit an assigné for a given dirigeant. `assigne` null = create mode.
export default function AssigneForm({ dirigeantId, assigne, onSaved, onCancel }) {
  const isEdit = Boolean(assigne);
  const [form, setForm] = useState({
    firstName: assigne?.firstName || '',
    lastName: assigne?.lastName || '',
    phone: assigne?.phone || '',
    email: assigne?.email || '',
    dateNaissance: assigne?.dateNaissance || '',
    sexe: assigne?.sexe || '',
    adresse: assigne?.adresse || '',
    zoneResidence: assigne?.zoneResidence || '',
    notes: assigne?.notes || '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [duplicate, setDuplicate] = useState(null); // { ...existing } on a 409

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function doSubmit(force) {
    setError('');
    setSubmitting(true);
    try {
      const saved = isEdit
        ? await updateAssigne(dirigeantId, assigne.id, form)
        : await createAssigne(dirigeantId, { ...form, force });
      onSaved?.(saved);
    } catch (err) {
      if (!isEdit && err?.code === 'DUPLICATE') {
        setDuplicate(err.data?.existing || {});
      } else {
        setError(err?.message || 'Enregistrement impossible.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function attachExisting() {
    setError('');
    setSubmitting(true);
    try {
      const saved = await attachAssigne(dirigeantId, duplicate.id);
      onSaved?.(saved);
    } catch (err) {
      setError(err?.message || 'Rattachement impossible.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    setDuplicate(null);
    doSubmit(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!isEdit && <AnnuaireSearch dirigeantId={dirigeantId} onAttached={onSaved} />}
      {!isEdit && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <UserPlus className="size-3.5" /> Ou nouvelle personne :
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="firstName" className={LABEL}>Prénom *</label>
          <Input id="firstName" value={form.firstName} onChange={setField('firstName')} required autoFocus />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lastName" className={LABEL}>Nom *</label>
          <Input id="lastName" value={form.lastName} onChange={setField('lastName')} required />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className={LABEL}>Téléphone</label>
          <Input id="phone" type="tel" inputMode="tel" value={form.phone} onChange={setField('phone')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={LABEL}>Email</label>
          <Input id="email" type="email" value={form.email} onChange={setField('email')} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dateNaissance" className={LABEL}>Date de naissance</label>
          <Input id="dateNaissance" type="date" value={form.dateNaissance} onChange={setField('dateNaissance')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sexe" className={LABEL}>Sexe</label>
          <select id="sexe" value={form.sexe} onChange={setField('sexe')} className={TEXTAREA}>
            <option value="">—</option>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="adresse" className={LABEL}>Adresse</label>
        <Input id="adresse" value={form.adresse} onChange={setField('adresse')} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="zoneResidence" className={LABEL}>Zone de résidence</label>
        <Input id="zoneResidence" value={form.zoneResidence} onChange={setField('zoneResidence')} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className={LABEL}>Notes</label>
        <textarea id="notes" rows={3} value={form.notes} onChange={setField('notes')} className={TEXTAREA} />
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      {duplicate && (
        <div className="rounded-lg border border-warning-foreground/20 bg-warning px-3 py-2.5 text-sm text-warning-foreground">
          <p className="font-medium">Doublon possible : ce numéro est déjà enregistré.</p>
          <p className="mt-0.5 text-xs">
            {duplicate.firstName} {duplicate.lastName}
            {duplicate.dirigeantName ? ` · suivi par ${duplicate.dirigeantName}` : ''}
            {duplicate.departmentName ? ` (${duplicate.departmentName})` : ''}.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>Annuler</Button>
        {duplicate ? (
          <>
            <Button type="button" variant="secondary" onClick={() => doSubmit(true)} disabled={submitting}>
              Créer un doublon quand même
            </Button>
            <Button type="button" onClick={attachExisting} disabled={submitting}>
              {submitting ? 'Rattachement…' : 'Rattacher cette personne à moi'}
            </Button>
          </>
        ) : (
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
          </Button>
        )}
      </div>
    </form>
  );
}
