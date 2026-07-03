'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthGuard from '../../../components/AuthGuard';
import FileDropzone from '../../../components/FileDropzone';
import { supabase } from '../../../lib/supabaseClient';

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  async function handleGenerate() {
    setError('');
    setLoading(true);
    setResult('');

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
      setResult(data.article);

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

        {/* Stepper */}
        <div className="flex items-center gap-3 mb-8 font-mono text-xs uppercase tracking-wide">
          <StepPill active={step === 1} done={step > 1} label="1 · brand" onClick={() => setStep(1)} />
          <span className="text-border">—</span>
          <StepPill active={step === 2} done={false} label="2 · articolo" onClick={() => setStep(2)} />
        </div>

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
                {loading ? 'Generazione in corso...' : 'Genera articolo'}
              </button>
            </div>

            {error && <p className="text-accent text-sm font-mono">{error}</p>}

            {result && (
              <div className="bg-surface border border-border rounded-2xl p-6">
                <h2 className="font-display font-semibold mb-4">Risultato</h2>
                <article className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-ink">
                  {result}
                </article>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function StepPill({ active, done, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? 'border-accent text-accent'
          : done
          ? 'border-online text-online'
          : 'border-border text-muted'
      }`}
    >
      {label}
    </button>
  );
}
