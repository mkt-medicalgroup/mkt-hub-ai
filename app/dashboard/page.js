'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthGuard from '../../components/AuthGuard';
import ToolCard from '../../components/ToolCard';
import { supabase } from '../../lib/supabaseClient';

// Elenco dei moduli dell'hub. Per aggiungere un nuovo tool in futuro,
// basta aggiungere un nuovo oggetto a questo array (e creare la relativa
// pagina in app/tools/<nome>/page.js).
const TOOLS = [
  {
    title: 'Article',
    description:
      'Genera articoli ottimizzati SEO e GEO a partire da brand kit, competitor e keyword.',
    status: 'online',
    href: '/tools/article',
  },
  {
    title: 'Social Post',
    description:
      'Ogni giorno propone 5 idee di post per sede, basate su tendenze sanitarie e ricerche del sito. Genera anche l\'immagine coerente col brand.',
    status: 'online',
    href: '/tools/social-post',
  },
  {
    title: 'Newsletter',
    description: 'Bozze di email editoriali e promozionali coerenti con lo stile del brand.',
    status: 'coming-soon',
    href: null,
  },
  {
    title: 'Ads Copy',
    description: 'Varianti di copy pubblicitario per Meta e Google Ads pronte al test.',
    status: 'coming-soon',
    href: null,
  },
];

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardContent() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="led led-online" />
            <span className="font-mono text-xs tracking-widest text-muted uppercase">
              control room
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-muted hover:text-ink text-sm font-mono transition-colors"
          >
            esci →
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="font-display text-3xl font-semibold mb-2">Hub marketing &amp; comunicazione</h1>
        <p className="text-muted mb-10 max-w-xl">
          Ogni modulo è un tool AI dedicato. Nuovi moduli verranno aggiunti nel tempo:
          questa griglia è pensata per crescere.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TOOLS.map((tool, i) => (
            <ToolCard
              key={tool.title}
              index={i + 1}
              title={tool.title}
              description={tool.description}
              status={tool.status}
              href={tool.href}
            />
          ))}

          {/* Placeholder per far capire dove finiranno i prossimi tool */}
          <div className="border border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center text-muted min-h-[180px]">
            <span className="font-mono text-2xl mb-2">+</span>
            <span className="text-sm">Il prossimo modulo va qui</span>
          </div>
        </div>

        <h2 className="font-display text-xl font-semibold mt-14 mb-2">La tua libreria</h2>
        <p className="text-muted mb-6 max-w-xl">
          Solo i contenuti che hai salvato esplicitamente restano archiviati qui.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Link
            href="/library/articles"
            className="bg-surface border border-border rounded-2xl card-shadow p-6 hover:border-accent transition-colors"
          >
            <h3 className="font-display font-semibold mb-1">I miei articoli</h3>
            <p className="text-muted text-sm">Gli articoli salvati dal modulo Article.</p>
          </Link>
          <Link
            href="/library/social-posts"
            className="bg-surface border border-border rounded-2xl card-shadow p-6 hover:border-accent transition-colors"
          >
            <h3 className="font-display font-semibold mb-1">I miei post</h3>
            <p className="text-muted text-sm">I post salvati dal modulo Social Post.</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
