import type { Metadata } from 'next'
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
