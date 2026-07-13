'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '../../../components/AuthGuard';
import FileDropzone from '../../../components/FileDropzone';
import Timeline from '../../../components/Timeline';
import ScoreBar from '../../../components/ScoreBar';
import GenerationProgress from '../../../components/GenerationProgress';
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

  // Proposte automatiche di argomenti (basate sulle query di ricerca del sito)
  const [locations, setLocations] = useState([]);
  const [suggestLocationId, setSuggestLocationId] = useState('');
  const [topicSuggestions, setTopicSuggestions] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [topicsError, setTopicsError] = useState('');

  useEffect(() => {
    supabase
      .from('locations')
      .select('id, name')
      .order('created_at')
      .then(({ data }) => {
        setLocations(data || []);
        if (data?.length) setSuggestLocationId(data[0].id);
      });
  }, []);

  // Step 2
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [keyword, setKeyword] = useState('');
  const [articleType, setArticleType] = useState(ARTICLE_TYPES[0]);
  const [length, setLength] = useState(LENGTHS[1].value);

  // Step 3
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { metaTitle, metaDescription, article, scores, notes }
  const [savedId, setSavedId] = useState(null);
  const [approved, setApproved] = useState(false);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved

  const progressMessages = [
    brandFiles.length
      ? `Analizzo ${brandFiles.length} document${brandFiles.length > 1 ? 'i' : 'o'} del brand caricat${brandFiles.length > 1 ? 'i' : 'o'}...`
      : 'Applico un tono di voce neutro (nessun documento brand caricato)...',
    competitorUrl
      ? 'Studio la struttura dell\'articolo del competitor indicato...'
      : 'Nessun competitor indicato: costruisco la struttura da zero...',
    `Cerco i contenuti migliori già online per "${keyword || 'la keyword indicata'}"...`,
    `Scrivo l'articolo in formato ${articleType.toLowerCase()}, ottimizzato SEO e GEO...`,
    'Calcolo i punteggi di autenticità, SEO e GEO...',
  ];

  async function handleSuggestTopics() {
    setTopicsError('');
    setLoadingTopics(true);
    setTopicSuggestions([]);
    try {
      let queryBuilder = supabase
        .from('site_queries')
        .select('query')
        .order('created_at', { ascending: false })
        .limit(50);

      if (suggestLocationId) {
        queryBuilder = queryBuilder.eq('location_id', suggestLocationId);
      }

      const { data: queries } = await queryBuilder;
      const uniqueQueries = [...new Set((queries || []).map((q) => q.query))];

      const res = await fetch('/api/article/suggest-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteQueries: uniqueQueries, notes }),
      });

      if (!res.ok) throw new Error('suggest-topics-failed');
      const data = await res.json();
      setTopicSuggestions(data.topics || []);
    } catch (e) {
      setTopicsError('Suggerimento non riuscito. Controlla la chiave API Gemini e riprova.');
    } finally {
      setLoadingTopics(false);
    }
  }

  function applySuggestion(topic) {
    setKeyword(topic.keyword || topic.topic);
    if (ARTICLE_TYPES.includes(topic.articleType)) {
      setArticleType(topic.articleType);
    }
    setStep(2);
  }

  async function handleGenerate() {
    setError('');
    setLoading(true);
    setResult(null);
    setSavedId(null);
    setApproved(false);
    setSaveState('idle');
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

      // Salva subito ogni generazione (non approvata di default), così non si
      // perde nulla anche se l'utente non la segna come "buona".
      const { data: userData } = await supabase.auth.getUser();
      const { data: inserted } = await supabase
        .from('article_projects')
        .insert({
          user_id: userData?.user?.id,
          keyword,
          article_type: articleType,
          length,
          competitor_url: competitorUrl,
          notes,
          result: data.article,
          scores: data.scores,
          ai_notes: data.notes,
          approved: false,
        })
        .select()
        .single();

      if (inserted) setSavedId(inserted.id);
    } catch (e) {
      setError('Generazione non riuscita. Controlla la chiave API Gemini e riprova.');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleApproved() {
    if (!savedId) return;
    setSaveState('saving');
    const nextApproved = !approved;
    try {
      await supabase.from('article_projects').update({ approved: nextApproved }).eq('id', savedId);
      setApproved(nextApproved);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1500);
    } catch (e) {
      setSaveState('idle');
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Link href="/dashboard" className="font-mono text-xs text-muted hover:text-ink">
              ← hub
            </Link>
            <Link href="/tools/article/archive" className="font-mono text-xs text-muted hover:text-ink">
              📁 i miei articoli
            </Link>
          </div>
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
            <div className="bg-surface border border-border rounded-2xl card-shadow p-6">
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

            <div className="bg-surface border border-border rounded-2xl card-shadow p-6">
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

            <div className="bg-surface border border-border rounded-2xl card-shadow p-6">
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <h2 className="font-display font-semibold">Argomenti suggeriti</h2>
                <div className="flex items-center gap-2">
                  {locations.length > 0 && (
                    <select
                      value={suggestLocationId}
                      onChange={(e) => setSuggestLocationId(e.target.value)}
                      className="bg-bg border border-border rounded-lg px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
                    >
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={handleSuggestTopics}
                    disabled={loadingTopics}
                    className="text-xs font-mono text-muted hover:text-ink border border-border rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                  >
                    {loadingTopics ? 'suggerisco...' : topicSuggestions.length ? 'rigenera' : 'suggerisci 3 argomenti'}
                  </button>
                </div>
              </div>
              <p className="text-muted text-sm mb-4">
                Basati sulle query di ricerca reali della sede scelta (le stesse del modulo
                Social Post). Se non ti convincono, ignora pure e scegli tu keyword e URL nello
                Step 2.
              </p>
              {locations.length === 0 && (
                <p className="text-muted text-xs font-mono mb-4">
                  nessuna sede configurata ancora — aggiungine una dal modulo Social Post per
                  usare query reali, oppure procedi comunque con argomenti generici.
                </p>
              )}

              {loadingTopics && (
                <p className="font-mono text-xs text-muted">analisi delle query in corso...</p>
              )}
              {topicsError && <p className="text-accent text-sm font-mono">{topicsError}</p>}

              {!loadingTopics && topicSuggestions.length > 0 && (
                <div className="space-y-3">
                  {topicSuggestions.map((t, i) => (
                    <div
                      key={i}
                      className="border border-border rounded-lg p-4 flex items-start justify-between gap-3 flex-wrap"
                    >
                      <div>
                        <p className="font-medium mb-1">{t.topic}</p>
                        <p className="text-muted text-xs mb-1">
                          keyword: <span className="font-mono">{t.keyword}</span> · {t.articleType}
                        </p>
                        {t.rationale && <p className="text-muted text-xs">{t.rationale}</p>}
                      </div>
                      <button
                        onClick={() => applySuggestion(t)}
                        className="shrink-0 bg-accent hover:bg-accent/90 text-onAccent text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
                      >
                        Usa questo →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setStep(2)}
              className="bg-accent hover:bg-accent/90 text-onAccent font-semibold rounded-lg px-5 py-2.5 transition-colors"
            >
              Continua manualmente →
            </button>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6">
            <div className="bg-surface border border-border rounded-2xl card-shadow p-6">
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

            <div className="bg-surface border border-border rounded-2xl card-shadow p-6 grid gap-5 sm:grid-cols-2">
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
                className="bg-accent hover:bg-accent/90 disabled:opacity-50 text-onAccent font-semibold rounded-lg px-5 py-2.5 transition-colors"
              >
                {loading ? 'Generazione in corso...' : 'Genera articolo →'}
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-6">
            {loading && <GenerationProgress messages={progressMessages} />}

            {!loading && error && (
              <div className="bg-surface border border-border rounded-2xl card-shadow p-6">
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
                <div className="bg-surface border border-border rounded-2xl card-shadow p-6">
                  <h2 className="font-display font-semibold mb-5">Qualità dell'articolo</h2>
                  <div className="grid gap-5 sm:grid-cols-3">
                    <ScoreBar label="Autenticità" value={result.scores?.originality} />
                    <ScoreBar label="Livello SEO" value={result.scores?.seo} />
                    <ScoreBar label="Livello GEO" value={result.scores?.geo} />
                  </div>
                </div>

                {/* Articolo */}
                <div className="bg-surface border border-border rounded-2xl card-shadow p-6">
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
                  <div className="bg-surface border border-border rounded-2xl card-shadow p-6">
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

                <div className="bg-surface border border-border rounded-2xl card-shadow p-6 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-display font-semibold">Salva nella libreria</p>
                    <p className="text-muted text-sm">
                      Ogni articolo generato resta comunque disponibile per la sessione corrente,
                      ma solo quelli con il flag attivo compaiono in "I miei articoli".
                    </p>
                  </div>
                  <button
                    onClick={handleToggleApproved}
                    disabled={saveState === 'saving'}
                    className={`shrink-0 flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold transition-colors ${
                      approved
                        ? 'bg-accent text-onAccent hover:bg-accent/90'
                        : 'border border-border text-ink hover:border-muted'
                    }`}
                  >
                    <span>{approved ? '★' : '☆'}</span>
                    {saveState === 'saving' ? 'Salvataggio...' : approved ? 'Salvato in libreria' : 'Salva nella libreria'}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="border border-border hover:border-muted text-ink rounded-lg px-5 py-2.5 transition-colors"
                  >
                    ← Modifica input
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="bg-accent hover:bg-accent/90 text-onAccent font-semibold rounded-lg px-5 py-2.5 transition-colors"
                  >
                    Rigenera
                  </button>
                  <Link
                    href="/library/articles"
                    className="ml-auto font-mono text-xs text-muted hover:text-ink border border-border rounded-lg px-3 py-2 transition-colors"
                  >
                    vai a "I miei articoli" →
                  </Link>
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
