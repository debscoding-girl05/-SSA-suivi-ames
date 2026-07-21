import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldX } from 'lucide-react';
import { listConnexions } from '../../api/connexions';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

// EF-08 — historique des tentatives de connexion, Pasteur/PR uniquement.
export default function ConnexionsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listConnexions()
      .then((r) => setData(r.data))
      .catch((err) => setError(err?.message || 'Impossible de charger le journal.'));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Journal de connexions</h1>
        <p className="text-sm text-muted-foreground">Historique des tentatives de connexion, les plus récentes en premier.</p>
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      {!data && !error ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Compte</th>
                <th className="px-4 py-2.5">Résultat</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data || []).map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{c.userFullName || c.identifiant}</div>
                    {c.userFullName && <div className="text-xs text-muted-foreground">{c.identifiant}</div>}
                  </td>
                  <td className="px-4 py-2.5">
                    {c.reussie ? (
                      <span className="inline-flex items-center gap-1 text-primary"><ShieldCheck className="size-3.5" /> Réussie</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-destructive-dark"><ShieldX className="size-3.5" /> Échouée</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.ip || '—'}</td>
                </tr>
              ))}
              {data && data.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Aucune tentative enregistrée.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
