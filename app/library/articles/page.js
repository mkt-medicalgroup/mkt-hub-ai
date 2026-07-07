'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '../../../components/AuthGuard';
import ScoreBar from '../../../components/ScoreBar';
import { supabase } from '../../../lib/supabaseClient';

export default function ArticlesLibraryPage() {
  return (
    <AuthGuard>
      <ArticlesLibrary />
    </AuthGuard>
  );
}

function ArticlesLibrary() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('article_projects')
      .select('*')
      .eq('approved', true)
      .order('created_at', { ascending: false });
    setArticles(data || []);
    setLoading(false);
  }

  async function removeFromLibrary(id) {
    await supabase.from('article_projects').update({ approved: false }).eq('id', id);
    setArticles((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/dashboard" className="font-mono text-xs text-muted hover:text-ink">
            ← hub
          </Link>
          <Link
            href="/tools/article"
            className="font-mono text-xs text-muted hover:text-ink border border-border rounded-lg px-3 py-1.5 transition-colors"
          >
            + nuovo articolo
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-semibold mb-1">I miei articoli</h1>
        <p className="text-muted text-sm mb-8">
          Solo gli articoli che hai salvato esplicitamente con il flag "Salva nella libreria".
        </p>

        {loading && <p className="font-mono text-sm text-muted">caricamento...</p>}

        {!loading && articles.length === 0 && (
          <div className="bg-surface border border-border rounded-2xl card-shadow p-8 text-center">
            <p className="text-muted text-sm mb-4">
              Nessun articolo salvato ancora. Genera un articolo e attiva il flag "Salva nella
              libreria" per vederlo qui.
            </p>
            <Link
              href="/tools/article"
              className="inline-block bg-accent hover:bg-accent/90 text-onAccent font-semibold rounded-lg px-5 py-2.5 transition-colors"
            >
              Vai al modulo Article
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {articles.map((a) => {
            const isOpen = openId === a.id;
            return (
              <div key={a.id} className="bg-surface border border-border rounded-2xl card-shadow p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-mono text-[10px] text-muted uppercase tracking-wide mb-1">
                      {a.article_type} · {new Date(a.created_at).toLocaleDateString('it-IT')}
                    </p>
                    <h3 className="font-display font-semibold">{a.keyword}</h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => navigator.clipboard.writeText(a.result)}
                      className="font-mono text-xs text-muted hover:text-ink border border-border rounded-lg px-3 py-1.5 transition-colors"
                    >
                      copia testo
                    </button>
                    <button
                      onClick={() => setOpenId(isOpen ? null : a.id)}
                      className="font-mono text-xs text-muted hover:text-ink border border-border rounded-lg px-3 py-1.5 transition-colors"
                    >
                      {isOpen ? 'chiudi' : 'apri'}
                    </button>
                    <button
                      onClick={() => removeFromLibrary(a.id)}
                      className="font-mono text-xs text-muted hover:text-accent border border-border rounded-lg px-3 py-1.5 transition-colors"
                    >
                      rimuovi
                    </button>
                  </div>
                </div>

                {a.scores && (
                  <div className="grid gap-4 sm:grid-cols-3 mt-4">
                    <ScoreBar label="Autenticità" value={a.scores?.originality} />
                    <ScoreBar label="Livello SEO" value={a.scores?.seo} />
                    <ScoreBar label="Livello GEO" value={a.scores?.geo} />
                  </div>
                )}

                {isOpen && (
                  <article className="prose prose-sm max-w-none whitespace-pre-wrap text-ink mt-5 pt-5 border-t border-border">
                    {a.result}
                  </article>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
