'use client';

import { useEffect, useState } from 'react';
import { Cookie } from 'lucide-react';

const KEY = 'intellifix_cookie_consent';

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try { if (!localStorage.getItem(KEY)) setShow(true); } catch {}
  }, []);

  function choose(value: 'accepted' | 'rejected') {
    try {
      localStorage.setItem(KEY, value);
      document.cookie = `intellifix_cookie_consent=${value}; path=/; max-age=${365 * 86400}; samesite=lax`;
    } catch {}
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-2xl">
      <div className="holo rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-9 h-9 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center flex-shrink-0">
            <Cookie className="w-5 h-5 text-neon-cyan" />
          </div>
          <p className="text-xs text-white/60 leading-relaxed">
            We use a strictly-necessary session cookie to keep you signed in, and optional cookies to remember
            preferences and improve the product. See our{' '}
            <a href="/privacy" className="text-neon-cyan hover:underline">Privacy Policy</a> and{' '}
            <a href="/terms" className="text-neon-cyan hover:underline">Terms</a>.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => choose('rejected')}
            className="px-4 py-2 rounded-lg text-xs font-medium text-white/70 bg-white/5 border border-white/10 hover:bg-white/10">
            Essential only
          </button>
          <button onClick={() => choose('accepted')}
            className="px-4 py-2 rounded-lg text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #00e5ff 0%, #a855f7 100%)' }}>
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
