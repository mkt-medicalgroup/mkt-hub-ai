'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '../../../components/AuthGuard';
import { supabase } from '../../../lib/supabaseClient';

export default function SocialPostsLibraryPage() {
  return (
    <AuthGuard>
      <SocialPostsLibrary />
    </AuthGuard>
  );
}

function SocialPostsLibrary() {
  const [posts, setPosts] = useState([]);
  const [locations, setLocations] = useState({});
  const [loading, setLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState({});

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    const { data: locs } = await supabase.from('locations').select('id, name');
    const locMap = Object.fromEntries((locs || []).map((l) => [l.id, l.name]));
    setLocations(locMap);

    const { data } = await supabase
      .from('social_posts')
      .select('*')
      .order('created_at', { ascending: false });
    setPosts(data || []);

    const urls = {};
    for (const p of data || []) {
      if (!p.image_path) continue;
      if (p.image_path.startsWith('http')) {
        // Foto Pexels: è già un URL pubblico, nessun bisogno di firmarlo.
        urls[p.id] = p.image_path;
      } else {
        const { data: signed } = await supabase.storage
          .from('social-assets')
          .createSignedUrl(p.image_path, 3600);
        if (signed) urls[p.id] = signed.signedUrl;
      }
    }
    setImageUrls(urls);
    setLoading(false);
  }

  async function removeFromLibrary(id) {
    await supabase.from('social_posts').delete().eq('id', id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/dashboard" className="font-mono text-xs text-muted hover:text-ink">
            ← hub
          </Link>
          <Link
            href="/tools/social-post"
            className="font-mono text-xs text-muted hover:text-ink border border-border rounded-lg px-3 py-1.5 transition-colors"
          >
            + nuovo post
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-semibold mb-1">I miei post</h1>
        <p className="text-muted text-sm mb-8">
          Solo i post che hai salvato esplicitamente con "Salva post" nello Step 3.
        </p>

        {loading && <p className="font-mono text-sm text-muted">caricamento...</p>}

        {!loading && posts.length === 0 && (
          <div className="bg-surface border border-border rounded-2xl card-shadow p-8 text-center">
            <p className="text-muted text-sm mb-4">
              Nessun post salvato ancora. Genera un'immagine e premi "Salva post" per vederlo qui.
            </p>
            <Link
              href="/tools/social-post"
              className="inline-block bg-accent hover:bg-accent/90 text-onAccent font-semibold rounded-lg px-5 py-2.5 transition-colors"
            >
              Vai al modulo Social Post
            </Link>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          {posts.map((p) => (
            <div key={p.id} className="bg-surface border border-border rounded-2xl card-shadow overflow-hidden">
              {imageUrls[p.id] && (
                <img src={imageUrls[p.id]} alt="" className="w-full aspect-square object-cover" />
              )}
              <div className="p-4">
                <p className="font-mono text-[10px] text-muted uppercase tracking-wide mb-2">
                  {locations[p.location_id] || 'Sede'} · {new Date(p.created_at).toLocaleDateString('it-IT')}
                </p>
                <p className="text-sm whitespace-pre-wrap mb-2">{p.final_caption}</p>
                {p.image_credit && (
                  <p className="text-[11px] text-muted mb-3">{p.image_credit}</p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(p.final_caption)}
                    className="font-mono text-xs text-muted hover:text-ink border border-border rounded-lg px-3 py-1.5 transition-colors"
                  >
                    copia caption
                  </button>
                  <button
                    onClick={() => removeFromLibrary(p.id)}
                    className="font-mono text-xs text-muted hover:text-accent border border-border rounded-lg px-3 py-1.5 transition-colors"
                  >
                    rimuovi
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
