'use client'
// components/shared/NavDrawer.tsx — JARVIS Navigation v25
// Categorized slide-up drawer — ALL pages included

import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

// ── Nav structure with categories ─────────────────────────
const NAV_SECTIONS = [
  {
    label: 'MAIN',
    items: [
      { path: '/',          icon: '💬', label: 'Chat',        color: '#00e5ff', desc: 'AI assistant' },
      { path: '/briefing',  icon: '🌅', label: 'Briefing',    color: '#fbbf24', desc: 'Morning brief' },
    ]
  },
  {
    label: 'LEARN',
    items: [
      { path: '/learn',    icon: '🧠', label: 'Learn',       color: '#34d399', desc: 'AI courses' },
      { path: '/study',    icon: '📚', label: 'Study',       color: '#a78bfa', desc: 'Goal tracker' },
    ]
  },
  {
    label: 'EXPLORE',
    items: [
      { path: '/anime',    icon: '🌸', label: 'Anime',       color: '#f472b6', desc: 'Watchlist' },
      { path: '/studio',   icon: '🎨', label: 'Studio',      color: '#f59e0b', desc: 'AI art' },
      { path: '/canva',    icon: '🖼️', label: 'Canva',       color: '#7c3aed', desc: 'Designs' },
      { path: '/india',    icon: '🇮🇳', label: 'India Hub',  color: '#fb923c', desc: 'Bharat' },
    ]
  },
  {
    label: 'TOOLS',
    items: [
      { path: '/apps',     icon: '🔗', label: 'Apps',        color: '#86efac', desc: '150+ apps' },
      { path: '/tools',    icon: '🧮', label: 'Calculators', color: '#fbbf24', desc: 'SIP/EMI/GST' },
      { path: '/media',    icon: '📁', label: 'Media',       color: '#60a5fa', desc: 'Files' },
      { path: '/voice',    icon: '🎤', label: 'Voice',       color: '#e879f9', desc: 'Speech' },
      { path: '/dashboard', icon: '📊', label: 'Dashboard',   color: '#00ff88', desc: 'Tasks + Notes + Goals' },
      { path: '/system',   icon: '⚡', label: 'System',      color: '#22d3ee', desc: 'Dashboard' },
    ]
  },
  {
    label: 'SYSTEM',
    items: [
      { path: '/android',   icon: '🤖', label: 'Android',    color: '#34d399', desc: 'APK + MacroDroid' },
      { path: '/connected', icon: '🔌', label: 'APIs',       color: '#00e5ff', desc: 'Integrations' },
      { path: '/settings',  icon: '⚙️', label: 'Settings',   color: '#94a3b8', desc: 'Preferences' },
    ]
  },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function NavDrawer({ open, onClose }: Props) {
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  function go(path: string) {
    onClose()
    setTimeout(() => router.push(path), 100)
  }

  // Count total pages
  const totalPages = NAV_SECTIONS.reduce((a, s) => a + s.items.length, 0)

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 98,
        background: 'rgba(0,0,0,.65)',
        backdropFilter: 'blur(6px)',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity .25s',
      }}/>

      {/* Drawer */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 99,
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border-acc)',
        borderRadius: '22px 22px 0 0',
        padding: '0 16px 32px',
        transform: open ? 'translateY(0)' : 'translateY(108%)',
        transition: 'transform .3s cubic-bezier(.32,.72,0,1)',
        boxShadow: '0 -24px 80px rgba(0,0,0,.6)',
        maxHeight: '88vh',
        overflowY: 'auto',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 14 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-acc)' }}/>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: 'linear-gradient(135deg, rgba(0,229,255,.2), rgba(109,40,217,.2))',
            border: '1px solid var(--border-acc)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: 'var(--accent)',
            fontFamily: "'Space Mono',monospace",
          }}>J</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 700, letterSpacing: 2, fontFamily: "'Space Mono',monospace" }}>JARVIS</div>
            <div style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 1 }}>v25 · {totalPages} sections</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 18, cursor: 'pointer', padding: '4px 8px' }}>✕</button>
        </div>

        {/* Sections */}
        {NAV_SECTIONS.map(section => (
          <div key={section.label} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 9, color: 'var(--text-faint)', letterSpacing: 2, marginBottom: 8, paddingLeft: 2 }}>{section.label}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {section.items.map(item => {
                const isActive = pathname === item.path
                return (
                  <button key={item.path} onClick={() => go(item.path)} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 12px',
                    borderRadius: 13,
                    border: `1px solid ${isActive ? item.color + '50' : 'var(--border)'}`,
                    background: isActive ? item.color + '12' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    textAlign: 'left' as const,
                    transition: 'all .15s',
                  }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: isActive ? item.color : 'var(--text)', fontWeight: isActive ? 700 : 500, fontFamily: "'Space Mono',monospace" }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 1 }}>{item.desc}</div>
                      {isActive && <div style={{ fontSize: 8, color: item.color, marginTop: 2 }}>● here</div>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
