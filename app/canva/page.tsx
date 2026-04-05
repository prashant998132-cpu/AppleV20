'use client'
// app/canva/page.tsx — JARVIS × Canva Studio
// Zero OAuth, Zero API key — works via Canva public URLs
// AI generates design brief → user opens Canva with context

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  CANVA_TEMPLATES, matchTemplate, generateDesignBrief, parseBrief,
  openCanvaTemplate, canvaSearchUrl, buildCanvaUrl,
  type CanvaTemplate, type DesignBrief,
} from '../../lib/integrations/canva'

// ── Theme ──────────────────────────────────────────────────
const BG       = 'var(--bg)'
const CARD     = 'var(--bg-card)'
const BORDER   = 'var(--border)'
const ACCENT   = 'var(--accent)'
const CANVA_C  = '#8B5CF6'   // Canva purple
const DIM      = 'var(--text-faint)'

// ── Category filter ────────────────────────────────────────
const CATEGORIES = ['All', 'Social', 'Docs', 'India', 'Edu']

// ── Template Card ─────────────────────────────────────────
function TemplateCard({ t, onSelect, selected }: { t: CanvaTemplate; onSelect: (t: CanvaTemplate) => void; selected: boolean }) {
  return (
    <div
      onClick={() => onSelect(t)}
      style={{
        padding: '12px 10px',
        borderRadius: 12,
        background: selected ? 'rgba(139,92,246,.12)' : CARD,
        border: `1px solid ${selected ? 'rgba(139,92,246,.4)' : BORDER}`,
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 5,
        transition: 'all .15s',
      }}
    >
      <div style={{ fontSize: 24, textAlign: 'center' }}>{t.emoji}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: selected ? '#c4b5fd' : 'var(--text)', textAlign: 'center', lineHeight: 1.3 }}>{t.name}</div>
      <div style={{ fontSize: 9, color: DIM, textAlign: 'center' }}>{t.dimensions || t.category}</div>
    </div>
  )
}

// ── Design Brief Card ─────────────────────────────────────
function BriefCard({ brief, template, onOpen }: { brief: DesignBrief; template: CanvaTemplate; onOpen: () => void }) {
  return (
    <div style={{ background: 'rgba(139,92,246,.06)', border: '1px solid rgba(139,92,246,.2)', borderRadius: 14, padding: 16, marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#c4b5fd' }}>🤖 AI Design Brief</div>
        <div style={{ fontSize: 10, color: DIM }}>{template.emoji} {template.name}</div>
      </div>

      {[
        { label: 'Headline', value: brief.title,   icon: '📝' },
        { label: 'Tagline',  value: brief.tagline, icon: '💬' },
        { label: 'Colors',   value: brief.colors,  icon: '🎨' },
        { label: 'Style',    value: brief.style,   icon: '✨' },
      ].map(row => row.value && (
        <div key={row.label} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: DIM, marginBottom: 2 }}>{row.icon} {row.label}</div>
          <div style={{ fontSize: 12, color: 'var(--text)', padding: '6px 10px', background: 'var(--bg-card)', borderRadius: 8, lineHeight: 1.5 }}>{row.value}</div>
        </div>
      ))}

      {/* Color swatches */}
      {brief.colors && (() => {
        const hexes = brief.colors.match(/#[0-9A-Fa-f]{6}/g) || []
        return hexes.length > 0 ? (
          <div style={{ display: 'flex', gap: 6, marginTop: 8, marginBottom: 12 }}>
            {hexes.map(hex => (
              <div key={hex} title={hex} style={{ width: 28, height: 28, borderRadius: 6, background: hex, border: '1px solid rgba(255,255,255,.2)' }}/>
            ))}
          </div>
        ) : null
      })()}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          onClick={onOpen}
          style={{
            flex: 1, padding: '11px 0', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #8B5CF6, #6366f1)',
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <span>✏️</span> Canva mein Open karo
        </button>
        <button
          onClick={() => window.open(canvaSearchUrl(brief.keywords || brief.title), '_blank', 'noopener')}
          style={{
            padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(139,92,246,.3)',
            background: 'transparent', color: '#c4b5fd', fontSize: 11, cursor: 'pointer',
          }}
          title="Search templates"
        >
          🔍
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════
import { Suspense } from 'react'

function CanvaPageInner() {
  const searchParams = useSearchParams()
  const [tab,         setTab]         = useState<'create' | 'browse'>('create')
  const [prompt,      setPrompt]      = useState(searchParams?.get('prompt') || '')
  const [selected,    setSelected]    = useState<CanvaTemplate | null>(null)
  const [brief,       setBrief]       = useState<DesignBrief | null>(null)
  const [generating,  setGenerating]  = useState(false)
  const [catFilter,   setCatFilter]   = useState('All')
  const [toast,       setToast]       = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  // Smart suggest templates from prompt
  const suggested = prompt.length > 2 ? matchTemplate(prompt) : []

  const filteredTemplates = CANVA_TEMPLATES.filter(t =>
    catFilter === 'All' || t.category === catFilter
  )

  // ── Generate design brief ─────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) { showToast('Kuch to likho — kya banana hai?'); return }
    const template = selected || suggested[0] || CANVA_TEMPLATES[0]
    setSelected(template)
    setGenerating(true)
    setBrief(null)
    try {
      const briefText = await generateDesignBrief(prompt, template)
      setBrief(parseBrief(briefText))
    } catch {
      setBrief({ title: prompt.slice(0, 50), tagline: 'Designed with JARVIS', colors: '', style: 'Modern', keywords: template.tags.join(', ') })
    }
    setGenerating(false)
  }, [prompt, selected, suggested])

  // ── Open Canva ────────────────────────────────────────
  const handleOpenCanva = () => {
    if (!selected || !brief) return
    openCanvaTemplate(selected, brief.title + (brief.tagline ? ' - ' + brief.tagline : ''))
    showToast('Canva khul raha hai... ✨')
  }

  // ── Quick launch (no brief) ───────────────────────────
  const handleQuickLaunch = (t: CanvaTemplate) => {
    openCanvaTemplate(t, prompt || undefined)
    showToast(`${t.name} Canva mein khul raha hai!`)
  }

  return (
    <div style={{
      minHeight: '100vh', background: BG, color: 'var(--text)', display: 'flex',
      flexDirection: 'column', fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif",
      maxWidth: 480, margin: '0 auto',
    }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 300,
          background: 'rgba(139,92,246,.95)', color: '#fff', padding: '8px 18px', borderRadius: 20, fontSize: 12 }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <header style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${BORDER}`, background: BG, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(139,92,246,.3), rgba(99,102,241,.3))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎨</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#c4b5fd' }}>JARVIS × Canva</div>
            <div style={{ fontSize: 10, color: DIM }}>AI Design Brief + Direct Launch</div>
          </div>
          {/* Canva logo badge */}
          <div style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(139,92,246,.15)', border: '1px solid rgba(139,92,246,.3)', fontSize: 10, color: '#c4b5fd', fontWeight: 600 }}>
            Canva ↗
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginTop: 10, background: 'var(--bg-card)', borderRadius: 10, padding: 3 }}>
          {([['create', '✨ AI Design Brief'], ['browse', '📚 Templates Browse']] as const).map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12,
                background: tab === t ? 'rgba(139,92,246,.3)' : 'transparent',
                color: tab === t ? '#c4b5fd' : DIM, fontWeight: tab === t ? 700 : 400,
                transition: 'all .15s' }}>
              {l}
            </button>
          ))}
        </div>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 90 }}>

        {/* ── TAB: AI CREATE ── */}
        {tab === 'create' && (
          <div style={{ padding: '16px 16px 0' }}>

            {/* Prompt input */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: DIM, marginBottom: 6 }}>Kya banana chahte ho?</div>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder={'Jaise:\n"Birthday party invitation for my friend Rahul"\n"YouTube thumbnail - NEET preparation tips"\n"Resume for software engineer job"'}
                rows={3}
                style={{
                  width: '100%', padding: '11px 13px', borderRadius: 12,
                  background: 'rgba(255,255,255,.05)', border: `1px solid ${BORDER}`,
                  color: 'var(--text)', fontSize: 13, outline: 'none', resize: 'none',
                  lineHeight: 1.6, boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Smart template suggestions from prompt */}
            {suggested.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: DIM, marginBottom: 7 }}>🤖 Suggested templates:</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {suggested.map(t => (
                    <button key={t.id} onClick={() => setSelected(selected?.id === t.id ? null : t)}
                      style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${selected?.id === t.id ? 'rgba(139,92,246,.5)' : BORDER}`,
                        background: selected?.id === t.id ? 'rgba(139,92,246,.15)' : 'var(--bg-card)',
                        color: selected?.id === t.id ? '#c4b5fd' : '#a0b8d0', fontSize: 11, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4 }}>
                      {t.emoji} {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected template indicator */}
            {selected && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(139,92,246,.08)', borderRadius: 10, border: '1px solid rgba(139,92,246,.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{selected.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#c4b5fd' }}>{selected.name}</div>
                  <div style={{ fontSize: 10, color: DIM }}>{selected.dimensions} · {selected.category}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: DIM, cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                background: generating || !prompt.trim()
                  ? 'rgba(139,92,246,.2)'
                  : 'linear-gradient(135deg, #8B5CF6 0%, #6366f1 100%)',
                color: generating || !prompt.trim() ? '#6a4fa0' : '#fff',
                fontSize: 14, fontWeight: 700, cursor: generating || !prompt.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all .2s',
              }}
            >
              {generating ? (
                <>
                  <span style={{ width: 14, height: 14, border: '2px solid #6a4fa0', borderTop: '2px solid #c4b5fd', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }}/>
                  AI Design Brief bana raha hai...
                </>
              ) : (
                <>🤖 AI Design Brief Generate karo</>
              )}
            </button>

            {/* Quick launch if no brief */}
            {prompt && !brief && !generating && (suggested.length > 0 || selected) && (
              <button
                onClick={() => handleQuickLaunch(selected || suggested[0])}
                style={{ width: '100%', marginTop: 8, padding: '11px 0', borderRadius: 12,
                  border: '1px solid rgba(139,92,246,.3)', background: 'transparent',
                  color: '#c4b5fd', fontSize: 13, cursor: 'pointer' }}>
                ↗ Brief ke bina sidha Canva kholo
              </button>
            )}

            {/* Generated brief */}
            {brief && selected && (
              <BriefCard brief={brief} template={selected} onOpen={handleOpenCanva} />
            )}

            {/* Divider + Popular */}
            <div style={{ marginTop: 20, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: BORDER }}/>
              <span style={{ fontSize: 11, color: DIM }}>Ya seedha kholo</span>
              <div style={{ flex: 1, height: 1, background: BORDER }}/>
            </div>

            {/* Popular quick-launch grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
              {CANVA_TEMPLATES.slice(0, 6).map(t => (
                <div key={t.id}
                  onClick={() => handleQuickLaunch(t)}
                  style={{ padding: '10px 6px', borderRadius: 10, background: CARD, border: `1px solid ${BORDER}`,
                    cursor: 'pointer', textAlign: 'center', transition: 'all .15s' }}>
                  <div style={{ fontSize: 22 }}>{t.emoji}</div>
                  <div style={{ fontSize: 10, color: '#a0b8d0', marginTop: 4, lineHeight: 1.3 }}>{t.name.replace(' Post','').replace(' Card','')}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB: BROWSE ── */}
        {tab === 'browse' && (
          <div style={{ padding: '14px 16px 0' }}>
            {/* Category filter */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCatFilter(cat)}
                  style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 11, whiteSpace: 'nowrap',
                    background: catFilter === cat ? CANVA_C : 'var(--border)',
                    color: catFilter === cat ? '#fff' : '#a0b8d0',
                    fontWeight: catFilter === cat ? 700 : 400 }}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Template grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {filteredTemplates.map(t => (
                <TemplateCard
                  key={t.id} t={t}
                  selected={selected?.id === t.id}
                  onSelect={template => {
                    setSelected(template)
                    setTab('create')
                    // Auto-set prompt hint
                    if (!prompt) setPrompt(template.name + ' ')
                  }}
                />
              ))}
            </div>

            {/* Search Canva CTA */}
            <div style={{ marginTop: 16, padding: '14px 16px', background: 'rgba(139,92,246,.06)', border: '1px solid rgba(139,92,246,.15)', borderRadius: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#c4b5fd', marginBottom: 4 }}>Canva mein aur dhundho</div>
              <div style={{ fontSize: 11, color: DIM, marginBottom: 10 }}>Lakhs of free templates Canva pe available hain</div>
              <button
                onClick={() => window.open('https://www.canva.com/templates/', '_blank', 'noopener')}
                style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #8B5CF6, #6366f1)',
                  color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Canva Templates ↗
              </button>
            </div>
          </div>
        )}
      </main>

      {/* CSS animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

    </div>
  )
}


export default function CanvaPage() {
  return (
    <Suspense fallback={<div style={{background:'var(--bg)',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--accent)'}}>Loading...</div>}>
      <CanvaPageInner />
    </Suspense>
  )
}