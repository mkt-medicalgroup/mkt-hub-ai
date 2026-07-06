'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '../../../components/AuthGuard';
import Timeline from '../../../components/Timeline';
import FileDropzone from '../../../components/FileDropzone';
import { supabase } from '../../../lib/supabaseClient';

const STEPS = [{ label: 'Proposte' }, { label: 'Immagine' }, { label: 'Anteprima' }];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function SocialPostPage() {
  return (
    <AuthGuard>
      <SocialPostTool />
    </AuthGuard>
  );
}

function SocialPostTool() {
  const [step, setStep] = useState(1);

  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState('');
  const [showLocationPanel, setShowLocationPanel] = useState(false);

  const [proposals, setProposals] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [genError, setGenError] = useState('');

  const [selectedProposal, setSelectedProposal] = useState(null);

  const [visualGuideline, setVisualGuideline] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [imageBase64, setImageBase64] = useState('');
  const [imageMime, setImageMime] = useState('image/png');
  const [imageError, setImageError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    loadLocations();
    loadBrandGuideline();
  }, []);

  useEffect(() => {
    if (locationId) loadProposals(locationId);
  }, [locationId]);

  async function loadLocations() {
    const { data } = await supabase.from('locations').select('*').order('created_at');
    setLocations(data || []);
    if (data?.length && !locationId) setLocationId(data[0].id);
    if (!data?.length) setShowLocationPanel(true);
  }

  async function loadBrandGuideline() {
    const { data } = await supabase.from('brand_settings').select('visual_guideline').eq('id', 1).single();
    if (data?.visual_guideline) setVisualGuideline(data.visual_guideline);
  }

  async function saveBrandGuideline() {
    await supabase.from('brand_settings').update({ visual_guideline: visualGuideline }).eq('id', 1);
    setSavedMessage('Linee guida salvate.');
    setTimeout(() => setSavedMessage(''), 2000);
  }

  async function loadProposals(locId) {
    setLoadingProposals(true);
    const { data } = await supabase
      .from('social_post_proposals')
      .select('*')
      .eq('location_id', locId)
      .eq('generated_on', todayISO())
      .order('created_at');
    setProposals(data || []);
    setLoadingProposals(false);
  }

  async function handleAddLocation(name, city, specialization) {
    if (!name) return;
    const { data } = await supabase
      .from('locations')
      .insert({ name, city, specialization })
      .select()
      .single();
    if (data) {
      setLocations((prev) => [...prev, data]);
      setLocationId(data.id);
    }
  }

  async function handleGenerateProposals() {
    setGenError('');
    setLoadingProposals(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch('/api/social/generate-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ locationId }),
      });

      if (!res.ok) throw new Error('generation-failed');
      await loadProposals(locationId);
    } catch (e) {
      setGenError('Generazione non riuscita. Controlla la chiave API Gemini e riprova.');
    } finally {
      setLoadingProposals(false);
    }
  }

  function openVisualStep(proposal) {
    setSelectedProposal(proposal);
    setImageBase64('');
    setImageError('');
    setStep(2);
  }

  async function handleGenerateImage() {
    setImageError('');
    setImageLoading(true);
    setImageBase64('');
    try {
      const res = await fetch('/api/social/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedProposal.topic,
          hook: selectedProposal.hook,
          caption: selectedProposal.caption,
          visualGuideline,
          extraNotes,
        }),
      });

      if (!res.ok) throw new Error('image-generation-failed');
      const data = await res.json();
      setImageBase64(data.imageBase64);
      setImageMime(data.mimeType || 'image/png');
      setStep(3);
    } catch (e) {
      setImageError('Generazione immagine non riuscita. Controlla la chiave API Gemini.');
    } finally {
      setImageLoading(false);
    }
  }

  async function handleSavePost() {
    setSavedMessage('Salvataggio in corso...');
    try {
      const byteChars = atob(imageBase64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
      const blob = new Blob([new Uint8Array(byteNumbers)], { type: imageMime });

      const path = `${locationId}/${Date.now()}.png`;
      await supabase.storage.from('social-assets').upload(path, blob, { contentType: imageMime });

      await supabase.from('social_posts').insert({
        proposal_id: selectedProposal.id,
        location_id: locationId,
        image_path: path,
        final_caption: `${selectedProposal.caption}\n\n${selectedProposal.hashtags}`,
      });

      setSavedMessage('Post salvato ✓');
      setTimeout(() => setSavedMessage(''), 2500);
    } catch (e) {
      setSavedMessage('Errore nel salvataggio.');
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
            <span className="text-online">modulo social post</span>
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-semibold mb-1">Social Post</h1>
        <p className="text-muted text-sm mb-8">
          Argomenti di tendenza in ambito sanitario, per sede, pronti da trasformare in post.
        </p>

        <Timeline steps={STEPS} current={step} onStepClick={setStep} />

        {/* Selettore sede + gestione sedi */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-ink outline-none focus:border-accent"
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowLocationPanel((s) => !s)}
            className="text-xs font-mono text-muted hover:text-ink border border-border rounded-lg px-3 py-2 transition-colors"
          >
            gestisci sedi &amp; query
          </button>
        </div>

        {showLocationPanel && (
          <LocationPanel
            locations={locations}
            locationId={locationId}
            onAddLocation={handleAddLocation}
          />
        )}

        {step === 1 && (
          <section className="space-y-4">
            {loadingProposals && (
              <div className="bg-surface border border-border rounded-2xl p-10 flex flex-col items-center justify-center text-center">
                <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin mb-4" />
                <p className="font-mono text-sm text-muted">ricerca argomenti in corso...</p>
              </div>
            )}

            {!loadingProposals && proposals.length === 0 && (
              <div className="bg-surface border border-border rounded-2xl p-8 text-center">
                <p className="text-muted text-sm mb-4">
                  Nessuna proposta ancora per oggi per questa sede. Il modulo genera da solo
                  ogni giorno, oppure puoi generarla subito ora.
                </p>
                <button
                  onClick={handleGenerateProposals}
                  disabled={!locationId}
                  className="bg-accent hover:bg-accent/90 disabled:opacity-50 text-bg font-semibold rounded-lg px-5 py-2.5 transition-colors"
                >
                  Genera 3 proposte ora
                </button>
                {genError && <p className="text-accent text-sm font-mono mt-3">{genError}</p>}
              </div>
            )}

            {!loadingProposals && proposals.length > 0 && (
              <>
                <div className="flex justify-end">
                  <button
                    onClick={handleGenerateProposals}
                    className="text-xs font-mono text-muted hover:text-ink border border-border rounded-lg px-3 py-1.5 transition-colors"
                  >
                    rigenera proposte di oggi
                  </button>
                </div>
                {proposals.map((p) => (
                  <div key={p.id} className="bg-surface border border-border rounded-2xl p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-mono text-[10px] text-muted uppercase tracking-wide mb-1">
                          {p.topic}
                        </p>
                        <h3 className="font-display font-semibold mb-2">{p.hook}</h3>
                        <p className="text-sm text-ink/80 whitespace-pre-wrap mb-2">{p.caption}</p>
                        <p className="text-xs text-accent font-mono">{p.hashtags}</p>
                      </div>
                      <button
                        onClick={() => openVisualStep(p)}
                        className="shrink-0 bg-accent hover:bg-accent/90 text-bg font-semibold rounded-lg px-4 py-2 transition-colors"
                      >
                        Visual →
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </section>
        )}

        {step === 2 && selectedProposal && (
          <section className="space-y-6">
            <div className="bg-surface border border-border rounded-2xl p-6">
              <p className="font-mono text-[10px] text-muted uppercase tracking-wide mb-1">
                post selezionato
              </p>
              <h3 className="font-display font-semibold">{selectedProposal.hook}</h3>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-display font-semibold">Linee guida visive del brand</h2>
                <button
                  onClick={saveBrandGuideline}
                  className="text-xs font-mono text-muted hover:text-ink border border-border rounded-lg px-3 py-1.5 transition-colors"
                >
                  salva
                </button>
              </div>
              <p className="text-muted text-sm mb-4">
                Colori, font, stile fotografico, cosa evitare — vengono applicate a ogni
                immagine generata. Vale per tutte le sedi.
              </p>
              <textarea
                value={visualGuideline}
                onChange={(e) => setVisualGuideline(e.target.value)}
                rows={6}
                placeholder="Es: palette blu #0A4F9C e bianco, font sans-serif arrotondato, fotografia luminosa e naturale, mai camici bianchi in primo piano, logo non necessario nell'immagine..."
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-ink outline-none focus:border-accent transition-colors resize-none"
              />
              {savedMessage && <p className="text-online text-xs font-mono mt-2">{savedMessage}</p>}

              <p className="text-muted text-sm mt-4 mb-2">
                Puoi anche caricare qui documenti/immagini di riferimento del brand:
              </p>
              <FileDropzone bucket="brand-assets" pathPrefix="visual-guidelines" onFilesChange={() => {}} />
            </div>

            <div className="bg-surface border border-border rounded-2xl p-6">
              <h2 className="font-display font-semibold mb-1">Note per questa immagine</h2>
              <p className="text-muted text-sm mb-4">Facoltative, valgono solo per questo post.</p>
              <textarea
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
                rows={3}
                placeholder="Es: includi un elemento che richiami l'autunno, evita persone in primo piano..."
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-ink outline-none focus:border-accent transition-colors resize-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep(1)}
                className="border border-border hover:border-muted text-ink rounded-lg px-5 py-2.5 transition-colors"
              >
                ← Indietro
              </button>
              <button
                onClick={handleGenerateImage}
                disabled={imageLoading}
                className="bg-accent hover:bg-accent/90 disabled:opacity-50 text-bg font-semibold rounded-lg px-5 py-2.5 transition-colors"
              >
                {imageLoading ? 'Generazione in corso...' : 'Genera immagine →'}
              </button>
            </div>
            {imageError && <p className="text-accent text-sm font-mono">{imageError}</p>}
          </section>
        )}

        {step === 3 && selectedProposal && (
          <section className="space-y-6">
            {imageLoading && (
              <div className="bg-surface border border-border rounded-2xl p-10 flex flex-col items-center justify-center text-center">
                <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin mb-4" />
                <p className="font-mono text-sm text-muted">generazione immagine in corso...</p>
              </div>
            )}

            {!imageLoading && imageBase64 && (
              <>
                {/* Anteprima stile IG */}
                <div className="bg-surface border border-border rounded-2xl overflow-hidden max-w-sm mx-auto">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                    <span className="w-7 h-7 rounded-full bg-accent" />
                    <span className="text-sm font-medium">
                      {locations.find((l) => l.id === locationId)?.name}
                    </span>
                  </div>
                  <img
                    src={`data:${imageMime};base64,${imageBase64}`}
                    alt={selectedProposal.topic}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="p-4">
                    <p className="text-sm whitespace-pre-wrap mb-2">{selectedProposal.caption}</p>
                    <p className="text-xs text-accent font-mono">{selectedProposal.hashtags}</p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="border border-border hover:border-muted text-ink rounded-lg px-5 py-2.5 transition-colors"
                  >
                    ← Modifica
                  </button>
                  <button
                    onClick={handleGenerateImage}
                    className="border border-border hover:border-muted text-ink rounded-lg px-5 py-2.5 transition-colors"
                  >
                    Rigenera immagine
                  </button>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(
                        `${selectedProposal.caption}\n\n${selectedProposal.hashtags}`
                      )
                    }
                    className="border border-border hover:border-muted text-ink rounded-lg px-5 py-2.5 transition-colors"
                  >
                    Copia caption
                  </button>
                  <button
                    onClick={handleSavePost}
                    className="bg-accent hover:bg-accent/90 text-bg font-semibold rounded-lg px-5 py-2.5 transition-colors"
                  >
                    Salva post
                  </button>
                </div>
                {savedMessage && (
                  <p className="text-center text-online text-xs font-mono">{savedMessage}</p>
                )}
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function LocationPanel({ locations, locationId, onAddLocation }) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [query, setQuery] = useState('');
  const [queries, setQueries] = useState([]);

  useEffect(() => {
    if (locationId) loadQueries();
  }, [locationId]);

  async function loadQueries() {
    const { data } = await supabase
      .from('site_queries')
      .select('*')
      .eq('location_id', locationId)
      .order('created_at', { ascending: false })
      .limit(20);
    setQueries(data || []);
  }

  async function addQuery() {
    if (!query.trim()) return;
    await supabase.from('site_queries').insert({ location_id: locationId, query: query.trim() });
    setQuery('');
    loadQueries();
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 mb-6 space-y-6">
      <div>
        <h3 className="font-display font-semibold mb-3">Aggiungi una sede</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome sede"
            className="bg-bg border border-border rounded-lg px-3 py-2 text-ink outline-none focus:border-accent"
          />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Città"
            className="bg-bg border border-border rounded-lg px-3 py-2 text-ink outline-none focus:border-accent"
          />
          <input
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            placeholder="Specializzazione (es. fisioterapia)"
            className="bg-bg border border-border rounded-lg px-3 py-2 text-ink outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={() => {
            onAddLocation(name, city, specialization);
            setName('');
            setCity('');
            setSpecialization('');
          }}
          className="mt-3 text-sm bg-accent hover:bg-accent/90 text-bg font-semibold rounded-lg px-4 py-2 transition-colors"
        >
          Aggiungi sede
        </button>
      </div>

      {locationId && (
        <div>
          <h3 className="font-display font-semibold mb-1">Query di ricerca del sito</h3>
          <p className="text-muted text-sm mb-3">
            Incolla qui le query più cercate dagli utenti (es. da Google Search Console) per
            questa sede: verranno usate per orientare gli argomenti dei post.
          </p>
          <div className="flex gap-2 mb-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="es: mal di schiena rimedi"
              className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-ink outline-none focus:border-accent"
              onKeyDown={(e) => e.key === 'Enter' && addQuery()}
            />
            <button
              onClick={addQuery}
              className="text-sm border border-border hover:border-muted rounded-lg px-4 py-2 transition-colors"
            >
              Aggiungi
            </button>
          </div>
          {queries.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {queries.map((q) => (
                <span
                  key={q.id}
                  className="text-xs font-mono bg-bg border border-border rounded-full px-3 py-1"
                >
                  {q.query}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
