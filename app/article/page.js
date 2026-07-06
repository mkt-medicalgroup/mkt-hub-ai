'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthGuard from '../../components/AuthGuard';
import FileDropzone from '../../components/FileDropzone';
import Timeline from '../../components/Timeline';
import ScoreBar from '../../components/ScoreBar';
import { supabase } from '../../lib/supabaseClient';

const ARTICLE_TYPES = [
  'Informativo',
  'Comparativo',
  'Scientifico / dati alla mano',
  'Guida pratica (how-to)',
  'Opinione / editoriale',
  'Case study',
];

const LENGTHS = [
  { label: 'Breve (~600 parole)', value: 600 },
  { label: 'Medio (~1200 parole)', value: 1200 },
  { label: 'Lungo (~2000 parole)', value: 2000 },
  { label: 'Pillar page (~3000+ parole)', value: 3000 },
];

const STEPS = [
  { label: 'Brand voice' },
  { label: 'Contenuti & fonti' },
  { label: 'Anteprima articolo' },
];

export default function ArticleToolPage() {
  return (
    <AuthGuard>
      <ArticleTool />
    </AuthGuard>
  );
}

function ArticleTool() {
  const [step, setStep] = useState(1);

  // Step 1
  const [brandFiles, setBrandFiles] = useState([]);
  const [notes, setNotes] = useState('');

  // Step 2
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [keyword, setKeyword] = useState('');
  const [articleType, setArticleType] = useState(ARTICLE_TYPES[0]);
  const [length, setLength] = useState(LENGTHS[1].value);

  // Step 3
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { metaTitle, metaDescription, article, scores, notes }

  async function handleGenerate() {
    setError('');
    setLoading(true);
    setResult(null);
    setStep(3);

    try {
      const res = await fetch('/api/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes,
          brandFileNames: brandFiles.map((f) => f.name),
          competitorUrl,
          keyword,
          articleType,
          length,
        }),
      });

      if (!res.ok) throw new Error('generation-failed');
      const data = await res.json();
      setResult(data);

      // Salva il progetto nello storico (facoltativo ma utile)
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from('article_projects').insert({
        user_id: userData?.user?.id,
        keyword,
        article_type: articleType,
        length,
        competitor_url: competitorUrl,
        notes,
        result: data.article,
        scores: data.scores,
        ai_notes: data.notes,
      });
    } catch (e) {
      setError('Generazione non riuscita. Controlla la chiave API Gemini e riprova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/dashboard" className="font-mono text-xs text-muted hover:text-ink">
            ← hub
          </Link>
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide">
            <span className="led led-online" />
            <span className="text-online">modulo article</span>
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-semibold mb-1">Article</h1>
        <p className="text-muted text-sm mb-8">
          Genera articoli sempre in ottica SEO e GEO, coerenti con il brand.
        </p>

        <Timeline steps={STEPS} current={step} onStepClick={setStep} />

        {step === 1 && (
          <section className="space-y-6">
            <div className="bg-surface border border-border rounded-2xl p-6">
              <h2 className="font-display font-semibold mb-1">Documenti del brand</h2>
              <p className="text-muted text-sm mb-4">
                Tono di voce, brand manual, guideline: tutto ciò che serve per scrivere come il brand.
              </p>
              <FileDropzone
                bucket="brand-assets"
                pathPrefix="article-tool"
                onFilesChange={setBrandFiles}
              />
            </div>

            <div className="bg-surface border border-border rounded-2xl p-6">
              <h2 className="font-display font-semibold mb-1">Note</h2>
              <p className="text-muted text-sm mb-4">
                Accorgimenti specifici su cosa deve contenere l'articolo.
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder="Es: cita sempre la garanzia 24 mesi, evita paragoni diretti con il competitor X, tono amichevole ma autorevole..."
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-ink outline-none focus:border-accent transition-colors resize-none"
              />
            </div>

            <button
              onClick={() => setStep(2)}
              className="bg-accent hover:bg-accent/90 text-bg font-semibold rounded-lg px-5 py-2.5 transition-colors"
            >
              Continua →
            </button>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6">
            <div className="bg-surface border border-border rounded-2xl p-6">
              <h2 className="font-display font-semibold mb-1">Competitor di riferimento</h2>
              <p className="text-muted text-sm mb-4">
                URL di un articolo a cui ispirarsi per struttura e livello di approfondimento.
              </p>
              <input
                type="url"
                value={competitorUrl}
                onChange={(e) => setCompetitorUrl(e.target.value)}
                placeholder="https://competitor.com/articolo-di-riferimento"
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-ink outline-none focus:border-accent transition-colors"
              />
            </div>

            <div className="bg-surface border border-border rounded-2xl p-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-mono text-muted mb-1.5 uppercase tracking-wide">
                  Keyword principale
                </label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="es: materassi in memory foam"
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-ink outline-none focus:border-accent transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-muted mb-1.5 uppercase tracking-wide">
                  Tipologia di articolo
                </label>
                <select
                  value={articleType}
                  onChange={(e) => setArticleType(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-ink outline-none focus:border-accent transition-colors"
                >
                  {ARTICLE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-muted mb-1.5 uppercase tracking-wide">
                  Lunghezza
                </label>
                <select
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-ink outline-none focus:border-accent transition-colors"
                >
                  {LENGTHS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs font-mono text-muted">
              ogni articolo viene generato ottimizzato per SEO (motori di ricerca) e GEO
              (generative engine optimization, per essere citato dalle AI)
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep(1)}
                className="border border-border hover:border-muted text-ink rounded-lg px-5 py-2.5 transition-colors"
              >
                ← Indietro
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading || !keyword}
                className="bg-accent hover:bg-accent/90 disabled:opacity-50 text-bg font-semibold rounded-lg px-5 py-2.5 transition-colors"
              >
                {loading ? 'Generazione in corso...' : 'Genera articolo →'}
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-6">
            {loading && (
              <div className="bg-surface border border-border rounded-2xl p-10 flex flex-col items-center justify-center text-center">
                <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin mb-4" />
                <p className="font-mono text-sm text-muted">ottimizzazione SEO / GEO in corso...</p>
              </div>
            )}

            {!loading && error && (
              <div className="bg-surface border border-border rounded-2xl p-6">
                <p className="text-accent text-sm font-mono">{error}</p>
                <button
                  onClick={() => setStep(2)}
                  className="mt-4 border border-border hover:border-muted text-ink rounded-lg px-5 py-2.5 transition-colors"
                >
                  ← Torna indietro e riprova
                </button>
              </div>
            )}

            {!loading && result && (
              <>
                {/* Punteggi semaforici */}
                <div className="bg-surface border border-border rounded-2xl p-6">
                  <h2 className="font-display font-semibold mb-5">Qualità dell'articolo</h2>
                  <div className="grid gap-5 sm:grid-cols-3">
                    <ScoreBar label="Autenticità" value={result.scores?.originality} />
                    <ScoreBar label="Livello SEO" value={result.scores?.seo} />
                    <ScoreBar label="Livello GEO" value={result.scores?.geo} />
                  </div>
                </div>

                {/* Articolo */}
                <div className="bg-surface border border-border rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display font-semibold">Articolo</h2>
                    <button
                      onClick={() => navigator.clipboard.writeText(result.article)}
                      className="font-mono text-xs text-muted hover:text-ink border border-border rounded-lg px-3 py-1.5 transition-colors"
                    >
                      copia testo
                    </button>
                  </div>

                  {result.metaTitle && (
                    <div className="mb-4 pb-4 border-b border-border">
                      <p className="font-mono text-[10px] text-muted uppercase tracking-wide mb-1">
                        Meta title
                      </p>
                      <p className="text-sm mb-3">{result.metaTitle}</p>
                      <p className="font-mono text-[10px] text-muted uppercase tracking-wide mb-1">
                        Meta description
                      </p>
                      <p className="text-sm text-muted">{result.metaDescription}</p>
                    </div>
                  )}

                  <article className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-ink">
                    {result.article}
                  </article>
                </div>

                {/* Note e suggerimenti dell'AI */}
                {result.notes?.length > 0 && (
                  <div className="bg-surface border border-border rounded-2xl p-6">
                    <h2 className="font-display font-semibold mb-4">Note &amp; suggerimenti</h2>
                    <div className="space-y-3">
                      {result.notes.map((n, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 bg-bg border border-border rounded-lg px-4 py-3"
                        >
                          <span className="text-accent font-mono text-xs mt-0.5">•</span>
                          <p className="text-sm text-ink/90">{n}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="border border-border hover:border-muted text-ink rounded-lg px-5 py-2.5 transition-colors"
                  >
                    ← Modifica input
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="bg-accent hover:bg-accent/90 text-bg font-semibold rounded-lg px-5 py-2.5 transition-colors"
                  >
                    Rigenera
                  </button>
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
