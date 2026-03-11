// app/layout.tsx — v17
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'JARVIS — Jons Bhai',
  description: 'Your sarcastic, caring, proactive AI companion. Hinglish. Free forever.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'JARVIS' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
  keywords: ['AI', 'assistant', 'Hinglish', 'JARVIS', 'voice', 'PWA'],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#090d18',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Noto+Sans+Devanagari:wght@400;500&display=swap" rel="stylesheet" />
        {/* KaTeX — Math rendering for formulas */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css" crossOrigin="anonymous" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js" crossOrigin="anonymous" async={false}/>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js" crossOrigin="anonymous" async={false}/>
        {/* Puter.js — Free GPT-4o + 1GB Cloud Storage */}
        <script src="https://js.puter.com/v2/" async={true}/>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js')
                .catch(e => console.log('[SW] Registration failed:', e))
            })
          }
        ` }} />
      </head>
      <body style={{ margin: 0, background: '#090d18', overscrollBehavior: 'none', WebkitTapHighlightColor: 'transparent' }}>
        {children}
        <div id="portal" />
      </body>
    </html>
  )
}
