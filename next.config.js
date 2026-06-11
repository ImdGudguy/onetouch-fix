/** @type {import('next').NextConfig} */

// Security headers applied to every response. These are the high-value,
// low-risk hardening headers for a production web app. The CSP is intentionally
// pragmatic (allows the inline styles/bootstrap Next.js + Framer Motion emit);
// it can be tightened to nonces later. Fonts are self-hosted by next/font, and
// the Anthropic call is server-side, so no third-party origins are needed.
const ContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self' https:",
  "upgrade-insecure-requests",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: ContentSecurityPolicy },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const nextConfig = {
  // Standalone output is for Docker / VM deploys. On Netlify the
  // @netlify/plugin-nextjs runtime manages output itself and breaks if
  // 'standalone' is set, so disable it when building on Netlify.
  output: process.env.NETLIFY ? undefined : 'standalone',

  // Don't leak the framework version in the Server/X-Powered-By header.
  poweredByHeader: false,

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = nextConfig;
