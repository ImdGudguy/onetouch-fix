import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import CookieConsent from '@/components/CookieConsent'

// Actually load the UI font (previously named in CSS but never loaded, so it
// fell back to a system font). `swap` avoids invisible text while loading.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

// Monospaced figures for telemetry / data readouts so numbers don't jitter.
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'IntelliFix AI - Enterprise Device Intelligence Platform',
  description: 'AI-powered endpoint management and autonomous remediation',
}

// Cross-browser + mobile: real viewport (never disables zoom), dark color-scheme
// so native controls/scrollbars render dark, theme-color for mobile browser chrome,
// and viewport-fit=cover for notched devices.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'dark',
  themeColor: '#0a0a12',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        {children}
        <CookieConsent />
      </body>
    </html>
  )
}
