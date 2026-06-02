import { BarChart3 } from 'lucide-react';
import EmptyState from '../../components/EmptyState';

export default function StatsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Statistiques</h1>
        <p className="text-sm text-muted-foreground">Synthèse et tendances du suivi.</p>
      </div>
      <EmptyState
        icon={BarChart3}
        title="Bientôt disponible"
        description="Les graphiques et rapports arrivent dans un prochain sprint."
      />
    </div>
  );
}
