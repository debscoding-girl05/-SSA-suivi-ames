// Dependency-free donut/ring (conic-gradient) for a rate like submitted/total.
export default function ProgressRing({ value = 0, total = 0, size = 96, label }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const deg = pct * 3.6;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(var(--primary) ${deg}deg, var(--muted) 0deg)` }}
      />
      <div className="absolute inset-[12%] flex flex-col items-center justify-center rounded-full bg-card">
        <span className="text-xl font-semibold tabular-nums text-foreground">{pct}%</span>
        {label && <span className="text-[10px] font-medium text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}
