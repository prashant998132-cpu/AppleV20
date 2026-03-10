'use client'
// components/shared/NavDrawer.tsx
// Slide-up nav drawer — triggered by J logo tap
// Replaces BottomNav entirely

import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

const NAV_ITEMS = [
  { path: '/',         icon: '💬', label: 'Chat',      color: '#00e5ff' },
  { path: '/study',    icon: '📚', label: 'Study',     color: '#a78bfa' },
  { path: '/anime',    icon: '🌸', label: 'Anime',     color: '#f472b6' },
  { path: '/studio',   icon: '🎨', label: 'Studio',    color: '#f59e0b' },
  { path: '/apps',     icon: '🔗', label: 'Apps',      color: '#34d399' },
  { path: '/india',    icon: '🇮🇳', label: 'India Hub', color: '#fb923c' },
  { path: '/media',    icon: '📁', label: 'Media',     color: '#60a5fa' },
  { path: '/voice',    icon: '🎤', label: 'Voice',     color: '#f472b6' },
  { path: '/settings', icon: '⚙️', label: 'Settings',  color: '#94a3b8' },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function NavDrawer({ open, onClose }: Props) {
  const router   = useRouter()
  const pathname = usePathname()

  // Close on back gesture
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  function go(path: string) {
    onClose()
    setTimeout(() => router.push(path), 120)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 98,
          background: 'rgba(0,0,0,.6)',
          backdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity .25s',
        }}
      />

      {/* Drawer panel — slides up from bottom */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        zIndex: 99,
        background: 'rgba(9,13,24,.98)',
        borderTop: '1px solid rgba(0,229,255,.15)',
        borderRadius: '20px 20px 0 0',
        padding: '0 16px 32px',
        transform: open ? 'translateY(0)' : 'translateY(105%)',
        transition: 'transform .3s cubic-bezier(.32,.72,0,1)',
        boxShadow: '0 -20px 60px rgba(0,229,255,.08)',
        fontFamily: "'Space Mono', monospace",
        maxHeight: '85vh',
        overflowY: 'auto',
      }}>
        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 16 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(0,229,255,.2)' }}/>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,rgba(0,229,255,.2),rgba(109,40,217,.2))',
            border: '1px solid rgba(0,229,255,.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: '#00e5ff',
          }}>J</div>
          <div>
            <div style={{ fontSize: 13, color: '#e8f4ff', fontWeight: 700, letterSpacing: 2 }}>JARVIS</div>
            <div style={{ fontSize: 9, color: '#1e3858' }}>Navigation</div>
          </div>
        </div>

        {/* Nav grid — 2 columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => go(item.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '14px 14px',
                  borderRadius: 14,
                  border: `1px solid ${isActive ? item.color + '40' : 'rgba(255,255,255,.06)'}`,
                  background: isActive
                    ? `rgba(${item.color === '#00e5ff' ? '0,229,255' : item.color === '#a78bfa' ? '167,139,250' : item.color === '#f59e0b' ? '245,158,11' : item.color === '#34d399' ? '52,211,153' : item.color === '#fb923c' ? '251,146,60' : item.color === '#60a5fa' ? '96,165,250' : item.color === '#f472b6' ? '244,114,182' : '148,163,184'},.1)`
                    : 'rgba(255,255,255,.02)',
                  cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                <span style={{ fontSize: 22 }}>{item.icon}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 12, color: isActive ? item.color : '#ddeeff', fontWeight: isActive ? 700 : 400 }}>
                    {item.label}
                  </div>
                  {isActive && (
                    <div style={{ fontSize: 8, color: item.color, marginTop: 1 }}>● Active</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <style>{`
        @keyframes drawerUp {
          from { transform: translateY(100%) }
          to   { transform: translateY(0) }
        }
      `}</style>
    </>
  )
}
