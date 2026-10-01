import { Link } from 'react-router-dom';
import { ClipboardCheck, ArrowRight } from 'lucide-react';
import ReportStatusBadge from '../../components/ReportStatusBadge';

const MESSAGES = {
  manquant: 'Pas encore soumise : pointez vos membres avant la fin de la semaine.',
  brouillon: 'Brouillon enregistré : pensez à la soumettre.',
  soumis: 'Soumise : en attente de validation par votre leader.',
  a_corriger: 'Votre leader demande une correction.',
  valide: 'Validée. Merci !',
};

// Accueil de l'encadreur : l'état de SA fiche de présence de la semaine.
export default function MaFiche({ overview }) {
  const me = overview?.dirigeants?.[0];
  if (!overview || !me) return null;
  const status = me.status || 'manquant';
  const todo = status === 'manquant' || status === 'brouillon' || status === 'a_corriger';
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-transparent text-primary"><ClipboardCheck className="size-5" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">Ma fiche · semaine {overview.week.week}</p>
          <ReportStatusBadge status={status} />
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{MESSAGES[status] || MESSAGES.manquant}</p>
      </div>
      <Link to="/fiches" className={`inline-flex min-h-[40px] shrink-0 items-center gap-1 rounded-lg px-3 text-sm font-medium ${todo ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'}`}>
        {todo ? 'Remplir' : 'Voir'} <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
