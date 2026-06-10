import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, AlertCircle, Clock } from 'lucide-react';

const STYLES = {
  soumis: { label: 'Soumis', icon: Check, className: 'bg-success text-success-foreground border-transparent' },
  manquant: { label: 'Manquant', icon: AlertCircle, className: 'bg-destructive text-destructive-foreground border-transparent' },
  brouillon: { label: 'Brouillon', icon: Clock, className: 'bg-warning text-warning-foreground border-transparent' },
};

export default function ReportStatusBadge({ status }) {
  const s = STYLES[status] || STYLES.manquant;
  const Icon = s.icon;
  return (
    <Badge variant="outline" className={cn('gap-1 font-medium', s.className)}>
      <Icon className="size-3" />
      {s.label}
    </Badge>
  );
}
