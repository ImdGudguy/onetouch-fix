'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [firstRun, setFirstRun] = useState(false);

  useEffect(() => {
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((d) => { if (!d.hasUsers) { setFirstRun(true); setMode('register'); } })
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        return;
      }
      const next = new URLSearchParams(window.location.search).get('next') || '/';
      window.location.assign(next);
    } catch {
      setError('Network error — please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #07070d 0%, #0a0a12 50%, #07070d 100%)' }}>
      {/* animated backdrop */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="fx-aurora" />
        <div className="fx-grid" />
        <div className="fx-beam" />
        <div className="fx-vignette" />
      </div>

      <form onSubmit={submit} className="holo rounded-2xl p-8 w-[380px] relative z-10">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 glow-pulse"
            style={{ background: 'linear-gradient(135deg, #00e5ff 0%, #a855f7 100%)' }}>
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold">
            <span className="text-glow-cyan">IntelliFix</span> <span className="text-white/70">AI</span>
          </h1>
          <p className="text-xs text-white/40 mt-1">
            {firstRun ? 'Create the first admin account' : mode === 'login' ? 'Sign in to your console' : 'Create your operator account'}
          </p>
        </div>

        <label className="block text-xxs uppercase tracking-wider text-white/40 mb-1">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          className="w-full mb-4 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-neon-cyan/50 transition-colors"
          placeholder="naveen"
        />

        <label className="block text-xxs uppercase tracking-wider text-white/40 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          className="w-full mb-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-neon-cyan/50 transition-colors"
          placeholder="••••••••"
        />

        {error && <p className="text-xs text-neon-red mb-2">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full mt-3 h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #00e5ff 0%, #a855f7 100%)', boxShadow: '0 4px 30px rgba(0,229,255,0.35)' }}
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>

        {!firstRun && <p className="text-center text-xs text-white/40 mt-5">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="text-neon-cyan hover:underline"
          >
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </button>
        </p>}
      </form>
    </div>
  );
}
