import { FileText } from 'lucide-react';
import EmptyState from '../../components/EmptyState';

export default function SheetsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fiches de suivi</h1>
        <p className="text-sm text-muted-foreground">Fiches hebdomadaires par groupe.</p>
      </div>
      <EmptyState
        icon={FileText}
        title="Bientôt disponible"
        description="La saisie des fiches hebdomadaires arrive au prochain sprint."
      />
    </div>
  );
}
