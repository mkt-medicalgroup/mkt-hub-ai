'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError('Accesso non riuscito. Controlla email e password.');
      return;
    }

    router.replace('/dashboard');
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <span className="led led-online" />
          <span className="font-mono text-xs tracking-widest text-muted uppercase">
            control room
          </span>
        </div>

        <div className="bg-surface border border-border rounded-2xl card-shadow p-8">
          <h1 className="font-display text-2xl font-semibold mb-1">Accedi all'hub</h1>
          <p className="text-muted text-sm mb-6">
            Marketing &amp; comunicazione, in un unico posto.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-muted mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-ink outline-none focus:border-accent transition-colors"
                placeholder="nome@azienda.com"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-muted mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-ink outline-none focus:border-accent transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-accent font-mono">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-onAccent font-semibold rounded-lg py-2.5 transition-colors"
            >
              {loading ? 'Accesso...' : 'Entra'}
            </button>
          </form>
        </div>

        <p className="text-center text-muted text-xs font-mono mt-6">
          gli utenti si creano da Supabase → Authentication
        </p>
      </div>
    </div>
  );
}
