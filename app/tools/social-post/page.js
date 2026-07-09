'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '../../../components/AuthGuard';
import Timeline from '../../../components/Timeline';
import FileDropzone from '../../../components/FileDropzone';
import GenerationProgress from '../../../components/GenerationProgress';
import { supabase } from '../../../lib/supabaseClient';

const STEPS = [{ label: 'Proposte' }, { label: 'Immagine' }, { label: 'Anteprima' }];

const PROPOSAL_PROGRESS_MESSAGES = [
  'Ricerca degli argomenti sanitari più discussi oggi...',
  'Analisi di articoli scientifici e fonti di settore...',
  'Lettura delle query di ricerca del sito per questa sede...',
  'Confronto tra gli argomenti trovati e la specializzazione della sede...',
  'Scrittura di hook e caption per ciascuna proposta...',
  'Selezione delle 3 idee più rilevanti...',
];

const IMAGE_PROGRESS_MESSAGES = [
  'Lettura delle linee guida visive del brand...',
  'Traduzione dell\'argomento in parole chiave di ricerca...',
  'Ricerca di foto pertinenti su Pexels...',
  'Selezione delle immagini più adatte...',
];

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
  const [imageLoading, setImageLoading] = useState(false);
  const [photoOptions, setPhotoOptions] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
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

  async function handleUpdateLocation(id, fields) {
    const { data } = await supabase.from('locations').update(fields).eq('id', id).select().single();
    if (data) {
      setLocations((prev) => prev.map((l) => (l.id === id ? data : l)));
    }
  }

  async function handleDeleteLocation(id) {
    await supabase.from('locations').delete().eq('id', id);
    setLocations((prev) => {
      const next = prev.filter((l) => l.id !== id);
      if (locationId === id) setLocationId(next[0]?.id || '');
      return next;
    });
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
    setPhotoOptions([]);
    setSelectedPhoto(null);
    setImageError('');
    setStep(2);
  }

  async function handleSearchImages() {
    setImageError('');
    setImageLoading(true);
    setPhotoOptions([]);
    setSelectedPhoto(null);
    try {
      const res = await fetch('/api/social/search-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedProposal.topic,
          hook: selectedProposal.hook,
          visualGuideline,
        }),
      });

      if (!res.ok) throw new Error('image-search-failed');
      const data = await res.json();
      setPhotoOptions(data.photos || []);
    } catch (e) {
      setImageError('Ricerca immagini non riuscita. Controlla le chiavi API Gemini e Pexels.');
    } finally {
      setImageLoading(false);
    }
  }

  function choosePhoto(photo) {
    setSelectedPhoto(photo);
    setStep(3);
  }

  async function handleSavePost() {
    setSavedMessage('Salvataggio in corso...');
    try {
      await supabase.from('social_posts').insert({
        proposal_id: selectedProposal.id,
        location_id: locationId,
        image_path: selectedPhoto.large,
        image_credit: `Foto di ${selectedPhoto.photographer} su Pexels`,
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
            onUpdateLocation={handleUpdateLocation}
            onDeleteLocation={handleDeleteLocation}
          />
        )}

        {step === 1 && (
          <section className="space-y-4">
            {loadingProposals && (
              <GenerationProgress messages={PROPOSAL_PROGRESS_MESSAGES} />
            )}

            {!loadingProposals && proposals.length === 0 && (
              <div className="bg-surface border border-border rounded-2xl card-shadow p-8 text-center">
                <p className="text-muted text-sm mb-4">
                  Nessuna proposta ancora per oggi per questa sede. Il modulo genera da solo
                  ogni giorno, oppure puoi generarla subito ora.
                </p>
                <button
                  onClick={handleGenerateProposals}
                  disabled={!locationId}
                  className="bg-accent hover:bg-accent/90 disabled:opacity-50 text-onAccent font-semibold rounded-lg px-5 py-2.5 transition-colors"
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
                  <div key={p.id} className="bg-surface border border-border rounded-2xl card-shadow p-6">
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
                        className="shrink-0 bg-accent hover:bg-accent/90 text-onAccent font-semibold rounded-lg px-4 py-2 transition-colors"
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
            <div className="bg-surface border border-border rounded-2xl card-shadow p-6">
              <p className="font-mono text-[10px] text-muted uppercase tracking-wide mb-1">
                post selezionato
              </p>
              <h3 className="font-display font-semibold">{selectedProposal.hook}</h3>
            </div>

            <div className="bg-surface border border-border rounded-2xl card-shadow p-6">
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
                Colori, stile fotografico, cosa evitare — vengono usate per orientare la ricerca
                delle foto su Pexels. Vale per tutte le sedi.
              </p>
              <textarea
                value={visualGuideline}
                onChange={(e) => setVisualGuideline(e.target.value)}
                rows={6}
                placeholder="Es: fotografia luminosa e naturale, mai camici bianchi in primo piano, preferire mani/gesti quotidiani o ambienti caldi..."
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-ink outline-none focus:border-accent transition-colors resize-none"
              />
              {savedMessage && <p className="text-online text-xs font-mono mt-2">{savedMessage}</p>}

              <p className="text-muted text-sm mt-4 mb-2">
                Puoi anche caricare qui documenti/immagini di riferimento del brand:
              </p>
              <FileDropzone bucket="brand-assets" pathPrefix="visual-guidelines" onFilesChange={() => {}} />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep(1)}
                className="border border-border hover:border-muted text-ink rounded-lg px-5 py-2.5 transition-colors"
              >
                ← Indietro
              </button>
              <button
                onClick={handleSearchImages}
                disabled={imageLoading}
                className="bg-accent hover:bg-accent/90 disabled:opacity-50 text-onAccent font-semibold rounded-lg px-5 py-2.5 transition-colors"
              >
                {imageLoading ? 'Ricerca in corso...' : 'Cerca foto su Pexels →'}
              </button>
            </div>
            {imageError && <p className="text-accent text-sm font-mono">{imageError}</p>}

            {imageLoading && <GenerationProgress messages={IMAGE_PROGRESS_MESSAGES} />}

            {!imageLoading && photoOptions.length > 0 && (
              <div className="bg-surface border border-border rounded-2xl card-shadow p-6">
                <h2 className="font-display font-semibold mb-1">Scegli una foto</h2>
                <p className="text-muted text-sm mb-4">
                  Clicca quella più adatta: passerai subito all'anteprima del post.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photoOptions.map((photo) => (
                    <button
                      key={photo.id}
                      onClick={() => choosePhoto(photo)}
                      className="group relative rounded-xl overflow-hidden border border-border hover:border-accent transition-colors aspect-square"
                    >
                      <img src={photo.thumb} alt={photo.alt} className="w-full h-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[10px] px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {photo.photographer}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {step === 3 && selectedProposal && selectedPhoto && (
          <section className="space-y-6">
            <>
              {/* Anteprima stile IG */}
              <div className="bg-surface border border-border rounded-2xl card-shadow overflow-hidden max-w-sm mx-auto">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                  <span className="w-7 h-7 rounded-full bg-accent" />
                  <span className="text-sm font-medium">
                    {locations.find((l) => l.id === locationId)?.name}
                  </span>
                </div>
                <img
                  src={selectedPhoto.large}
                  alt={selectedProposal.topic}
                  className="w-full aspect-square object-cover"
                />
                <div className="p-4">
                  <p className="text-sm whitespace-pre-wrap mb-2">{selectedProposal.caption}</p>
                  <p className="text-xs text-accent font-mono mb-2">{selectedProposal.hashtags}</p>
                  <p className="text-[11px] text-muted">
                    Foto di{' '}
                    <a
                      href={selectedPhoto.photographerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:text-ink"
                    >
                      {selectedPhoto.photographer}
                    </a>{' '}
                    su Pexels
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button
                  onClick={() => setStep(2)}
                  className="border border-border hover:border-muted text-ink rounded-lg px-5 py-2.5 transition-colors"
                >
                  ← Cambia foto
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
                  className="bg-accent hover:bg-accent/90 text-onAccent font-semibold rounded-lg px-5 py-2.5 transition-colors"
                >
                  Salva post
                </button>
              </div>
              {savedMessage && (
                <p className="text-center text-online text-xs font-mono">{savedMessage}</p>
              )}
              <div className="text-center">
                <Link
                  href="/library/social-posts"
                  className="font-mono text-xs text-muted hover:text-ink border border-border rounded-lg px-3 py-2 transition-colors"
                >
                  vai a "I miei post" →
                </Link>
              </div>
            </>
          </section>
        )}
      </main>
    </div>
  );
}

function LocationPanel({ locations, locationId, onAddLocation, onUpdateLocation, onDeleteLocation }) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [query, setQuery] = useState('');
  const [queries, setQueries] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [gscStatus, setGscStatus] = useState({ connected: false });
  const [syncMessage, setSyncMessage] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (locationId) loadQueries();
  }, [locationId]);

  useEffect(() => {
    fetch('/api/gsc/status')
      .then((r) => r.json())
      .then(setGscStatus)
      .catch(() => {});
  }, []);

  async function loadQueries() {
    const { data } = await supabase
      .from('site_queries')
      .select('*')
      .eq('location_id', locationId)
      .order('created_at', { ascending: false })
      .limit(30);
    setQueries(data || []);
  }

  async function addQuery() {
    if (!query.trim()) return;
    await supabase
      .from('site_queries')
      .insert({ location_id: locationId, query: query.trim(), source: 'manual' });
    setQuery('');
    loadQueries();
  }

  async function removeQuery(id) {
    await supabase.from('site_queries').delete().eq('id', id);
    setQueries((prev) => prev.filter((q) => q.id !== id));
  }

  function startEdit(loc) {
    setEditingId(loc.id);
    setEditDraft({
      name: loc.name || '',
      city: loc.city || '',
      specialization: loc.specialization || '',
      gsc_site_url: loc.gsc_site_url || '',
    });
  }

  async function saveEdit(id) {
    await onUpdateLocation(id, editDraft);
    setEditingId(null);
  }

  async function handleSyncNow(locId) {
    setSyncing(true);
    setSyncMessage('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch('/api/gsc/sync-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ locationId: locId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'errore');
      setSyncMessage(`Sincronizzate ${data.synced ?? 0} query da Search Console ✓`);
      if (locId === locationId) loadQueries();
    } catch (e) {
      setSyncMessage(`Errore: ${String(e.message || e)}`);
    } finally {
      setSyncing(false);
    }
  }

  const currentLocation = locations.find((l) => l.id === locationId);

  return (
    <div className="bg-surface border border-border rounded-2xl card-shadow p-6 mb-6 space-y-6">
      {/* Google Search Console */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-6 border-b border-border">
        <div>
          <h3 className="font-display font-semibold mb-1">Google Search Console</h3>
          <p className="text-muted text-sm">
            {gscStatus.connected
              ? 'Collegato — le query di ogni sede con un URL di proprietà impostato si aggiornano da sole ogni giorno.'
              : 'Non ancora collegato: le query vanno inserite a mano finché non lo colleghi.'}
          </p>
        </div>
        {gscStatus.connected ? (
          <span className="font-mono text-xs text-online border border-border rounded-lg px-3 py-1.5">
            ✓ connesso
          </span>
        ) : (
          <a
            href="/api/gsc/auth"
            className="bg-accent hover:bg-accent/90 text-onAccent font-semibold rounded-lg px-4 py-2 transition-colors text-sm"
          >
            Collega Search Console
          </a>
        )}
      </div>

      {/* Elenco sedi con modifica/elimina */}
      <div>
        <h3 className="font-display font-semibold mb-3">Le tue sedi</h3>
        <div className="space-y-2 mb-4">
          {locations.map((loc) => {
            const isEditing = editingId === loc.id;
            return (
              <div key={loc.id} className="border border-border rounded-lg p-3">
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <input
                        value={editDraft.name}
                        onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                        placeholder="Nome sede"
                        className="bg-bg border border-border rounded-lg px-3 py-2 text-ink outline-none focus:border-accent"
                      />
                      <input
                        value={editDraft.city}
                        onChange={(e) => setEditDraft((d) => ({ ...d, city: e.target.value }))}
                        placeholder="Città"
                        className="bg-bg border border-border rounded-lg px-3 py-2 text-ink outline-none focus:border-accent"
                      />
                      <input
                        value={editDraft.specialization}
                        onChange={(e) => setEditDraft((d) => ({ ...d, specialization: e.target.value }))}
                        placeholder="Specializzazione"
                        className="bg-bg border border-border rounded-lg px-3 py-2 text-ink outline-none focus:border-accent"
                      />
                    </div>
                    <input
                      value={editDraft.gsc_site_url}
                      onChange={(e) => setEditDraft((d) => ({ ...d, gsc_site_url: e.target.value }))}
                      placeholder="URL proprietà Search Console (es. https://www.tuosito.it/ oppure sc-domain:tuosito.it)"
                      className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-ink outline-none focus:border-accent font-mono text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(loc.id)}
                        className="text-sm bg-accent hover:bg-accent/90 text-onAccent font-semibold rounded-lg px-4 py-1.5 transition-colors"
                      >
                        Salva
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-sm border border-border hover:border-muted rounded-lg px-4 py-1.5 transition-colors"
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-medium">
                        {loc.name}
                        {loc.city ? ` · ${loc.city}` : ''}
                      </p>
                      <p className="text-muted text-xs font-mono">
                        {loc.gsc_site_url ? `GSC: ${loc.gsc_site_url}` : 'nessuna proprietà GSC impostata'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {gscStatus.connected && loc.gsc_site_url && (
                        <button
                          onClick={() => handleSyncNow(loc.id)}
                          disabled={syncing}
                          className="text-xs font-mono border border-border hover:border-muted rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                        >
                          {syncing ? 'sincronizzo...' : 'sincronizza ora'}
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(loc)}
                        className="text-xs font-mono text-muted hover:text-ink border border-border rounded-lg px-3 py-1.5 transition-colors"
                      >
                        modifica
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Eliminare la sede "${loc.name}"? Verranno eliminate anche le sue proposte e i suoi post salvati.`)) {
                            onDeleteLocation(loc.id);
                          }
                        }}
                        className="text-xs font-mono text-muted hover:text-accent border border-border rounded-lg px-3 py-1.5 transition-colors"
                      >
                        elimina
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {syncMessage && <p className="text-xs font-mono text-muted mb-4">{syncMessage}</p>}

        <h4 className="font-display font-semibold mb-3 text-sm">Aggiungi una nuova sede</h4>
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
          className="mt-3 text-sm bg-accent hover:bg-accent/90 text-onAccent font-semibold rounded-lg px-4 py-2 transition-colors"
        >
          Aggiungi sede
        </button>
      </div>

      {locationId && (
        <div className="pt-6 border-t border-border">
          <h3 className="font-display font-semibold mb-1">
            Query di ricerca del sito {currentLocation ? `— ${currentLocation.name}` : ''}
          </h3>
          <p className="text-muted text-sm mb-3">
            {gscStatus.connected && currentLocation?.gsc_site_url
              ? 'Aggiornate automaticamente da Search Console ogni giorno. Puoi comunque aggiungerne a mano.'
              : 'Incolla qui le query più cercate dagli utenti per questa sede: verranno usate per orientare gli argomenti dei post.'}
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
                  className="group flex items-center gap-1.5 text-xs font-mono bg-bg border border-border rounded-full pl-3 pr-1.5 py-1"
                >
                  {q.source === 'gsc' && <span className="text-accent">●</span>}
                  {q.query}
                  <button
                    onClick={() => removeQuery(q.id)}
                    className="text-muted hover:text-accent opacity-60 group-hover:opacity-100 px-1"
                    title="rimuovi"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
