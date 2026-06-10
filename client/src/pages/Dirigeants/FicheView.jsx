import { useEffect, useState } from 'react';
import { getFiche } from '../../api/rapports';
import { Avatar } from '@/components/ui/avatar';
import ReportStatusBadge from '../../components/ReportStatusBadge';

const P = {
  present: { label: 'Présent', cls: 'bg-success text-success-foreground' },
  absent: { label: 'Absent', cls: 'bg-destructive text-destructive-foreground' },
  justifie: { label: 'Justifié', cls: 'bg-warning text-warning-foreground' },
};

// Read-only presence breakdown of a dirigeant's fiche for a given week.
export default function FicheView({ dirigeantId, year, week, assignes = [] }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const nameById = Object.fromEntries(assignes.map((a) => [a.id, `${a.firstName} ${a.lastName}`]));

  useEffect(() => {
    let on = true;
    getFiche(dirigeantId, { year, week })
      .then((d) => { if (on) setData(d); })
      .catch(() => {})
      .finally(() => { if (on) setLoading(false); });
    return () => { on = false; };
  }, [dirigeantId, year, week]);

  if (loading) return <div className="h-32 animate-pulse rounded-lg bg-muted" />;
  if (!data?.rapport) return <p className="py-6 text-center text-sm text-muted-foreground">Aucune fiche pour cette semaine.</p>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Semaine {week} · {year} · {data.rapport.presentCount} présent(s)</span>
        <ReportStatusBadge status={data.rapport.status} />
      </div>
      <ul className="overflow-hidden rounded-xl border border-border">
        {data.presences.length === 0 ? (
          <li className="px-3 py-4 text-center text-sm text-muted-foreground">Pas de pointage détaillé.</li>
        ) : (
          data.presences.map((p) => {
            const s = P[p.statut] || P.present;
            return (
              <li key={p.assigneId} className="flex items-center gap-2 border-b border-border px-3 py-2 last:border-0">
                <Avatar name={nameById[p.assigneId] || '?'} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm">{nameById[p.assigneId] || 'Assigné'}</span>
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>
              </li>
            );
          })
        )}
      </ul>
      {data.rapport.remarques && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Remarques :</span> {data.rapport.remarques}
        </p>
      )}
    </div>
  );
}
