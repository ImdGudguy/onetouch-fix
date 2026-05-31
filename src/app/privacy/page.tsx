import Link from 'next/link';

export const metadata = { title: 'Privacy Policy — IntelliFix AI' };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen text-white" style={{ background: 'linear-gradient(135deg, #07070d 0%, #0a0a12 50%, #07070d 100%)' }}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/login" className="text-neon-cyan text-sm hover:underline">← Back</Link>
        <h1 className="text-3xl font-extrabold mt-4 mb-2">Privacy Policy</h1>
        <p className="text-white/40 text-sm mb-8">Last updated: 2026</p>

        <div className="space-y-6 text-white/70 leading-relaxed text-sm">
          <section>
            <h2 className="text-white font-semibold mb-1">What we collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><b>Account data</b> — username and email (email is used only for password reset).</li>
              <li><b>Device telemetry</b> — from the agent: CPU/RAM/disk/network metrics, active process count, recent Windows Event Log (Critical/Error/Warning), and compliance posture (antivirus, firewall, BitLocker, UAC, Secure Boot, updates, screen lock).</li>
              <li><b>Remediation history</b> — which fixes were run and their results.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-white font-semibold mb-1">How we use it</h2>
            <p>To render the dashboard, derive issues and health scores, run consented remediations, and power the in-app assistant. We do not sell your data.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold mb-1">Cookies &amp; cache</h2>
            <p>We set a <b>strictly-necessary</b>, HTTP-only session cookie to keep you signed in. With your consent we may store optional preferences in your browser's local storage to improve the experience. You can choose "Essential only" in the cookie banner; the app still functions. We do not use third-party advertising cookies.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold mb-1">Where it's stored</h2>
            <p>Data lives in your IntelliFix backend store (local SQLite in development; your configured cloud store in production). Credentials are salted and scrypt-hashed; reset codes are short-lived and hashed.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold mb-1">Your choices</h2>
            <p>You can change your password at any time from Settings, decline optional cookies, and uninstall the agent to stop device-data collection. Contact your administrator for data-deletion requests.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold mb-1">Email delivery</h2>
            <p>Password-reset codes are delivered via our email provider (Resend) when configured; otherwise they are shown in-app for development only.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
