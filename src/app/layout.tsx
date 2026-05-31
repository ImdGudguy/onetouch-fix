import type { Metadata } from 'next'
import './globals.css'
import CookieConsent from '@/components/CookieConsent'

export const metadata: Metadata = {
  title: 'IntelliFix AI - Enterprise Device Intelligence Platform',
  description: 'AI-powered endpoint management and autonomous remediation',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <CookieConsent />
      </body>
    </html>
  )
}
