import { cn } from '@/lib/utils';

const TINTS = {
  violet: 'bg-violet-100 text-violet-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
  sky: 'bg-sky-100 text-sky-700',
};

// Compact KPI card: colored icon tile + value + label (+ optional sub).
export default function StatCard({ icon: Icon, label, value, sub, tint = 'violet', className }) {
  return (
    <div className={cn('rounded-2xl border border-border bg-card p-4 shadow-card', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className={cn('flex size-10 items-center justify-center rounded-xl', TINTS[tint] || TINTS.violet)}>
          {Icon && <Icon className="size-5" />}
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground/80">{sub}</p>}
    </div>
  );
}
