'use client';

import { useEffect, useState } from 'react';

// messages: array di stringhe che descrivono le fasi dell'elaborazione.
// Non riflettono lo stato reale byte-per-byte del server (il modello risponde
// in un unico blocco), ma comunicano onestamente COSA sta considerando la
// generazione, nell'ordine in cui l'AI lo utilizza — utile per capire cosa
// aspettarsi nel risultato finale.
export default function GenerationProgress({ messages, intervalMs = 1800 }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (!messages || messages.length < 2) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1 < messages.length ? i + 1 : i));
    }, intervalMs);
    return () => clearInterval(t);
  }, [messages, intervalMs]);

  return (
    <div className="bg-surface border border-border rounded-2xl card-shadow p-10 flex flex-col items-center justify-center text-center">
      <GearIcon />
      <p className="font-mono text-sm text-ink mt-5 min-h-[1.5em] transition-opacity">
        {messages?.[index]}
      </p>
      <div className="w-full max-w-xs h-1 bg-border rounded-full mt-5 overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-700"
          style={{ width: `${((index + 1) / (messages?.length || 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}

function GearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="36"
      height="36"
      className="text-accent animate-spin"
      style={{ animationDuration: '2.4s' }}
      fill="none"
    >
      <path
        d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
