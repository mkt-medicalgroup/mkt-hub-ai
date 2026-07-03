'use client';

// value: 0-100. Colore automatico stile semaforo.
export default function ScoreBar({ label, value }) {
  const v = Math.max(0, Math.min(100, Math.round(value ?? 0)));

  let color = '#F87171'; // rosso
  let textColor = 'text-red-400';
  if (v >= 80) {
    color = '#4ADE80'; // verde
    textColor = 'text-online';
  } else if (v >= 50) {
    color = '#FBBF24'; // giallo
    textColor = 'text-amber-400';
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-xs text-muted uppercase tracking-wide">{label}</span>
        <span className={`font-mono text-xs font-semibold ${textColor}`}>{v}%</span>
      </div>
      <div className="h-2 w-full bg-bg border border-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${v}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
