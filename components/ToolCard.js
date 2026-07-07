'use client';

import Link from 'next/link';

export default function ToolCard({ title, description, status, href, index }) {
  const isOnline = status === 'online';

  const content = (
    <div
      className={`group relative bg-surface border border-border rounded-2xl card-shadow p-6 h-full flex flex-col justify-between transition-colors ${
        isOnline ? 'hover:border-accent cursor-pointer' : 'opacity-60'
      }`}
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono text-xs text-muted tracking-widest">
            MODULO {String(index).padStart(2, '0')}
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide">
            <span className={`led ${isOnline ? 'led-online' : 'led-pending'}`} />
            <span className={isOnline ? 'text-online' : 'text-pending'}>
              {isOnline ? 'attivo' : 'in arrivo'}
            </span>
          </span>
        </div>
        <h3 className="font-display text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted text-sm leading-relaxed">{description}</p>
      </div>

      {isOnline && (
        <div className="mt-6 flex items-center text-accent text-sm font-medium">
          Apri modulo
          <span className="ml-1.5 transition-transform group-hover:translate-x-1">→</span>
        </div>
      )}
    </div>
  );

  if (isOnline && href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
