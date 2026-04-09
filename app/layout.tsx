import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'JARVIS',
  description: 'Your AI. Your rules.',
  manifest: '/manifest.json',
  icons: { icon: '/icon.svg', apple: '/icons/icon-192.png' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#060b14',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi" data-theme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css"/>
        <script src="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.js"/>
      </head>
      <body>{children}</body>
    </html>
  )
}
