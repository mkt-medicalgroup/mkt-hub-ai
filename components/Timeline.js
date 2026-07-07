'use client';

// step corrente: 1, 2 o 3. steps: array di { label, sublabel }
export default function Timeline({ steps, current, onStepClick }) {
  return (
    <div className="flex items-center mb-10">
      {steps.map((s, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < current;
        const isCurrent = stepNum === current;
        const clickable = isDone; // si può tornare indietro, non saltare avanti

        return (
          <div key={s.label} className="flex items-center flex-1 last:flex-initial">
            <button
              onClick={() => clickable && onStepClick?.(stepNum)}
              className={`flex items-center gap-3 shrink-0 ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span
                className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-sm font-medium border-2 transition-colors ${
                  isDone
                    ? 'bg-online border-online text-onAccent'
                    : isCurrent
                    ? 'border-accent text-accent'
                    : 'border-border text-muted'
                }`}
              >
                {isDone ? '✓' : stepNum}
              </span>
              <span className="text-left">
                <span
                  className={`block font-mono text-[10px] uppercase tracking-wide ${
                    isCurrent ? 'text-accent' : isDone ? 'text-online' : 'text-muted'
                  }`}
                >
                  Step {stepNum}
                </span>
                <span className={`block text-sm font-medium ${isCurrent || isDone ? 'text-ink' : 'text-muted'}`}>
                  {s.label}
                </span>
              </span>
            </button>

            {stepNum < steps.length && (
              <span
                className={`h-0.5 flex-1 mx-4 rounded-full transition-colors ${
                  isDone ? 'bg-online' : 'bg-border'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
