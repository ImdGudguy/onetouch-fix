import Link from 'next/link';

export const metadata = { title: 'Terms of Service — IntelliFix AI' };

export default function TermsPage() {
  return (
    <div className="min-h-screen text-white" style={{ background: 'linear-gradient(135deg, #07070d 0%, #0a0a12 50%, #07070d 100%)' }}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/login" className="text-neon-cyan text-sm hover:underline">← Back</Link>
        <h1 className="text-3xl font-extrabold mt-4 mb-2">Terms of Service</h1>
        <p className="text-white/40 text-sm mb-8">Last updated: 2026</p>

        <div className="space-y-6 text-white/70 leading-relaxed text-sm">
          <section>
            <h2 className="text-white font-semibold mb-1">1. Acceptance</h2>
            <p>By creating an account or installing the IntelliFix agent you agree to these terms. If you are using IntelliFix on behalf of an organization, you confirm you are authorized to do so.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold mb-1">2. The service</h2>
            <p>IntelliFix provides endpoint telemetry, compliance reporting, and autonomous remediation. Remediations are limited to a fixed, audited allow-list and require your explicit consent before they run on a device.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold mb-1">3. Device data collection</h2>
            <p>When installed, the agent collects system metrics (CPU, memory, disk, network), recent Windows Event Log entries, and security/compliance posture, and transmits them to your IntelliFix backend to power the dashboard and remediation. You are responsible for installing the agent only on devices you own or manage, and for informing end users as required by law.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold mb-1">4. Acceptable use</h2>
            <p>You will not use IntelliFix to access devices without authorization, to disrupt systems, or in violation of applicable law. The remediation allow-list is provided "as is"; you are responsible for validating fixes against your change-control policy.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold mb-1">5. Accounts &amp; security</h2>
            <p>You are responsible for safeguarding your credentials. Passwords are stored salted and hashed; sessions are signed. Notify us of any unauthorized use.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold mb-1">6. Disclaimer &amp; liability</h2>
            <p>The software is provided without warranty to the extent permitted by law. IntelliFix is not liable for indirect or consequential damages arising from its use.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold mb-1">7. Contact</h2>
            <p>Questions about these terms can be directed to the platform administrator.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
