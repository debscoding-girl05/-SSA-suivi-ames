import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { downloadRapportHebdoPdf } from '../../api/rapportsHebdo';
import { RH_VIEW } from '../RapportsHebdo/types';

// Vue lecture (Pasteur/PR) d'une fiche hebdomadaire soumise, + téléchargement
// PDF. Le rendu (en-tête + colonnes) est piloté par RH_VIEW selon le type.
export default function RapportHebdoView({ rapport }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const e = rapport.entete || {};
  const lignes = Array.isArray(rapport.lignes) ? rapport.lignes : [];
  const conf = RH_VIEW[rapport.type] || RH_VIEW.huissier;
  const header = conf.header(e, rapport);
  const columns = conf.columns;
  const sections = conf.sections ? conf.sections(e, rapport) : null;
  const nomAffiche = e.nomLeader || e.nomFaiseur || e.nomSuperviseur || e.leader || rapport.authorName;

  async function download() {
    setBusy(true); setError('');
    try { await downloadRapportHebdoPdf(rapport.id, 'rapport'); }
    catch (err) { setError(err?.message || 'Téléchargement impossible.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        {nomAffiche ? `Soumis par ${nomAffiche}` : 'Soumis'}
        {' · '}{rapport.status === 'valide' ? 'Validé' : 'Soumis'}
      </p>

      <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-2">
        {header.map(([label, val]) => (
          <div key={label} className="flex justify-between gap-3 text-sm sm:block">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{val}</dd>
          </div>
        ))}
      </dl>

      {sections ? (
        <div className="flex flex-col gap-4">
          {sections.map((sec) => (
            <div key={sec.title} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">{sec.title}</h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
                {sec.rows.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3 text-sm">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 w-10">N°</th>
                {columns.map((col) => (
                  <th key={col.key} className={`px-3 py-2 ${col.kind === 'presence' ? 'w-24 text-center' : ''}`}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lignes.map((row, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-center text-muted-foreground">{i + 1}</td>
                  {columns.map((col) => {
                    if (col.kind === 'presence') {
                      return (
                        <td key={col.key} className="px-3 py-2 text-center">
                          {row.present === true ? <span className="font-medium text-primary">Présent</span>
                            : row.present === false ? <span className="font-medium text-destructive-dark">Absent</span>
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                      );
                    }
                    const v = col.compute ? col.compute(row) : row[col.key];
                    return <td key={col.key} className="px-3 py-2">{v}</td>;
                  })}
                </tr>
              ))}
              {lignes.length === 0 && (
                <tr><td colSpan={columns.length + 1} className="px-3 py-6 text-center text-muted-foreground">Aucune ligne.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={download} disabled={busy}>
          <Download className="size-4" /> {busy ? 'Génération…' : 'Télécharger le PDF'}
        </Button>
      </div>
    </div>
  );
}
