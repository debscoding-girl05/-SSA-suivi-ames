import { useEffect, useState } from 'react';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import Modal from '../../components/Modal';
import { listAnnuaire } from '../../api/annuaire';

// Choisir une âme déjà présente dans l'annuaire (fiche des encadreurs).
export default function AmePicker({ open, onClose, onPick }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const t = setTimeout(() => {
      if (query.trim().length < 2) { setResults([]); return; }
      setLoading(true);
      listAnnuaire({ search: query, pageSize: 20 })
        .then((res) => { if (!cancelled) { setResults(res.data); setError(''); } })
        .catch((err) => { if (!cancelled) setError(err?.message || 'Recherche impossible.'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, open]);

  return (
    <Modal open={open} onClose={onClose} title="Choisir dans l'annuaire">
      <div className="flex flex-col gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Nom ou numéro de l’âme…" />
        {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}
        {loading && <p className="text-xs text-muted-foreground">Recherche…</p>}
        {!loading && query.trim().length >= 2 && results.length === 0 && (
          <p className="text-sm text-muted-foreground">Personne trouvée. Fermez et saisissez le nom : elle sera ajoutée à l'annuaire à la soumission.</p>
        )}
        {results.length > 0 && (
          <ul className="max-h-80 overflow-y-auto rounded-lg border border-border">
            {results.map((m) => (
              <li key={m.id} className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.firstName} {m.lastName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.phone || 'Sans numéro'}{m.dirigeantName ? ` · suivie par ${m.dirigeantName}` : ''}
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => onPick(m)}>Choisir</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
