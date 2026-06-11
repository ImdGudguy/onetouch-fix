'use client';

import { useState, useEffect } from 'react';
import {
  ShieldCheck, Loader2, Eye, EyeOff, Activity, Zap, Cpu, Brain, ArrowLeft,
} from 'lucide-react';

type Mode = 'login' | 'register' | 'forgot' | 'reset';

function strength(pw: string): { score: number; label: string; color: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#ef4444', '#f97316', '#facc15', '#10b981', '#10b981'];
  return { score: s, label: labels[s], color: colors[s] };
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [firstRun, setFirstRun] = useState(false);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [accept, setAccept] = useState(false);

  // reset flow
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [devCode, setDevCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/auth/status').then((r) => r.json())
      .then((d) => { if (!d.hasUsers) { setFirstRun(true); setMode('register'); } })
      .catch(() => {});
  }, []);

  function go(next: Mode) { setError(''); setInfo(''); setMode(next); }

  async function post(url: string, body: any) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    try {
      if (mode === 'login') {
        const { ok, data } = await post('/api/auth/login', { username, password });
        if (!ok) return setError(data.error || 'Login failed.');
        window.location.assign(new URLSearchParams(window.location.search).get('next') || '/');
      } else if (mode === 'register') {
        if (!accept) return setError('Please accept the Terms & Privacy Policy.');
        const { ok, data } = await post('/api/auth/register', { username, email, password, acceptTerms: accept });
        if (!ok) return setError(data.error || 'Registration failed.');
        window.location.assign(new URLSearchParams(window.location.search).get('next') || '/');
      } else if (mode === 'forgot') {
        const { ok, data } = await post('/api/auth/forgot', { identifier });
        if (!ok) return setError(data.error || 'Request failed.');
        setInfo('If that account exists, a reset code has been sent. Enter it below.');
        if (data.devCode) setDevCode(data.devCode);
        go('reset'); setInfo('If that account exists, a reset code has been sent.');
      } else if (mode === 'reset') {
        const { ok, data } = await post('/api/auth/reset', { identifier, code, newPassword: password });
        if (!ok) return setError(data.error || 'Reset failed.');
        setPassword(''); setCode(''); setDevCode('');
        go('login'); setInfo('Password updated — sign in with your new password.');
      }
    } catch {
      setError('Network error — please try again.');
    } finally {
      setBusy(false);
    }
  }

  const st = strength(password);
  const inputCls = 'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-neon-cyan/50 transition-colors';

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #07070d 0%, #0a0a12 50%, #07070d 100%)' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="fx-aurora" /><div className="fx-grid" /><div className="fx-beam" /><div className="fx-vignette" />
      </div>

      {/* Left: form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <form onSubmit={submit} className="holo rounded-2xl p-8 w-full max-w-[400px]">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 glow-pulse"
              style={{ background: 'linear-gradient(135deg, #00e5ff 0%, #a855f7 100%)' }}>
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold"><span className="text-glow-cyan">IntelliFix</span> <span className="text-white/70">AI</span></h1>
            <p className="text-xs text-white/40 mt-1">
              {firstRun ? 'Create the first admin account'
                : mode === 'login' ? 'Sign in to your console'
                : mode === 'register' ? 'Create your operator account'
                : mode === 'forgot' ? 'Reset your password'
                : 'Enter the code we sent you'}
            </p>
          </div>

          {(mode === 'forgot' || mode === 'reset') && (
            <button type="button" onClick={() => go('login')} className="flex items-center gap-1 text-xs text-white/50 hover:text-white mb-3">
              <ArrowLeft className="w-3 h-3" /> Back to sign in
            </button>
          )}

          {/* Username (login/register) */}
          {(mode === 'login' || mode === 'register') && (
            <>
              <label className="block text-xxs uppercase tracking-wider text-white/40 mb-1">Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" className={`${inputCls} mb-4`} placeholder="Enter your username" />
            </>
          )}

          {/* Email (register) */}
          {mode === 'register' && (
            <>
              <label className="block text-xxs uppercase tracking-wider text-white/40 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={`${inputCls} mb-4`} placeholder="you@company.com" />
            </>
          )}

          {/* Identifier (forgot/reset) */}
          {(mode === 'forgot' || mode === 'reset') && (
            <>
              <label className="block text-xxs uppercase tracking-wider text-white/40 mb-1">Username or email</label>
              <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} readOnly={mode === 'reset'} className={`${inputCls} mb-4 ${mode === 'reset' ? 'opacity-60' : ''}`} placeholder="you@company.com" />
            </>
          )}

          {/* OTP code (reset) */}
          {mode === 'reset' && (
            <>
              <label className="block text-xxs uppercase tracking-wider text-white/40 mb-1">6-digit code</label>
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" className={`${inputCls} mb-1 tracking-[0.4em] text-center`} placeholder="000000" />
              {devCode && <p className="text-xxs text-neon-yellow mb-3">Dev mode code: <span className="font-mono">{devCode}</span></p>}
              {!devCode && <div className="mb-3" />}
            </>
          )}

          {/* Password (login/register/reset) */}
          {mode !== 'forgot' && (
            <>
              <label className="block text-xxs uppercase tracking-wider text-white/40 mb-1">{mode === 'reset' ? 'New password' : 'Password'}</label>
              <div className="relative mb-2">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className={`${inputCls} pr-10`} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                  {showPw ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
              {(mode === 'register' || mode === 'reset') && password.length > 0 && (
                <div className="mb-3">
                  <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full transition-[width,background-color] duration-300" style={{ width: `${(st.score / 4) * 100}%`, background: st.color }} />
                  </div>
                  <p className="text-xxs mt-1" style={{ color: st.color }}>{st.label}</p>
                </div>
              )}
            </>
          )}

          {/* Terms (register) */}
          {mode === 'register' && (
            <label className="flex items-start gap-2 mb-3 mt-1 cursor-pointer">
              <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 accent-[#00e5ff]" />
              <span className="text-xxs text-white/50 leading-relaxed">
                I agree to the <a href="/terms" target="_blank" className="text-neon-cyan hover:underline">Terms</a> &{' '}
                <a href="/privacy" target="_blank" className="text-neon-cyan hover:underline">Privacy Policy</a>, including the agent's device-data collection.
              </span>
            </label>
          )}

          {error && <p className="text-xs text-neon-red mb-2">{error}</p>}
          {info && <p className="text-xs text-neon-green mb-2">{info}</p>}

          <button type="submit" disabled={busy} className="w-full mt-2 h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #00e5ff 0%, #a855f7 100%)', boxShadow: '0 4px 30px rgba(0,229,255,0.35)' }}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : mode === 'forgot' ? 'Send Reset Code' : 'Reset Password'}
          </button>

          {/* Footer links */}
          {mode === 'login' && (
            <div className="flex items-center justify-between mt-4 text-xs">
              <button type="button" onClick={() => go('forgot')} className="text-white/50 hover:text-neon-cyan">Forgot password?</button>
              <button type="button" onClick={() => go('register')} className="text-neon-cyan hover:underline">Create account</button>
            </div>
          )}
          {mode === 'register' && !firstRun && (
            <p className="text-center text-xs text-white/40 mt-4">
              Already have an account? <button type="button" onClick={() => go('login')} className="text-neon-cyan hover:underline">Sign in</button>
            </p>
          )}

          <p className="text-center text-xxs text-white/25 mt-6">
            <a href="/terms" target="_blank" className="hover:text-white/50">Terms</a> · <a href="/privacy" target="_blank" className="hover:text-white/50">Privacy</a> · Developed by Naveen Singh
          </p>
        </form>
      </div>

      {/* Right: brand / feature panel */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-16 relative z-10 border-l border-white/5">
        <h2 className="text-3xl font-extrabold text-white leading-tight mb-2">
          Autonomous endpoint<br />intelligence, <span className="shimmer-text">from the future</span>.
        </h2>
        <p className="text-white/50 mb-10 max-w-md">Real-time telemetry, predictive insight, and one-touch remediation — with consent, security, and a Claude-powered assistant.</p>
        <div className="space-y-6 max-w-md">
          {[
            { icon: <Activity className="w-5 h-5 text-neon-cyan" />, t: 'Live device intelligence', d: 'CPU, memory, disk, network, Event Viewer and compliance — streamed every few seconds.' },
            { icon: <Zap className="w-5 h-5 text-neon-purple" />, t: 'Autonomous remediation', d: 'A fixed, audited allow-list of fixes — every action gated by your consent.' },
            { icon: <ShieldCheck className="w-5 h-5 text-neon-green" />, t: 'Enterprise security', d: 'Scrypt-hashed credentials, signed sessions, brute-force lockout, token-authed agents.' },
            { icon: <Brain className="w-5 h-5 text-neon-cyan" />, t: 'AI assistant', d: 'Ask about any device and let it queue the right fix for you.' },
          ].map((f) => (
            <div key={f.t} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">{f.icon}</div>
              <div>
                <div className="font-semibold text-white">{f.t}</div>
                <div className="text-sm text-white/50">{f.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
