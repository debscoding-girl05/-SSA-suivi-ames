import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  nouveau: { label: 'Nouveau', className: 'bg-primary-transparent text-primary border-transparent' },
  actif: { label: 'Actif', className: 'bg-success text-success-foreground border-transparent' },
  inactif: { label: 'Inactif', className: 'bg-muted text-muted-foreground border-transparent' },
};

export default function MemberStatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.nouveau;
  return (
    <Badge variant="outline" className={cn('font-medium', style.className)}>
      <span className="mr-1 inline-block size-1.5 rounded-full bg-current opacity-70" />
      {style.label}
    </Badge>
  );
}

export { STATUS_STYLES };
