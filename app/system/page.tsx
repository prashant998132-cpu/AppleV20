'use client'
// app/system/page.tsx — JARVIS System Dashboard v1
// Storage status · Credit usage · Provider health · Smart routing · GitHub versioning

import { useState, useEffect, useMemo } from 'react'
import {
  PROVIDERS, getProviderStatuses, getDailyCost, getUsage, resetUsage, trackUsage,
  type ProviderStatus,
} from '../../lib/core/smartRouter'

// ── Theme ─────────────────────────────────────────────────
const BG     = 'var(--bg)'
const CARD   = 'var(--bg-card)'
const BORDER = 'rgba(255,255,255,.07)'
const ACCENT = '#00e5ff'
const GREEN  = '#22c55e'
const YELLOW = '#fbbf24'
const RED    = '#ef4444'
const DIM    = '#3d5568'

// ── Status colors ─────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  ok:    GREEN, warn: YELLOW, limit: RED,
  nokey: '#6b7280', free: '#a78bfa',
}
const STATUS_LABEL: Record<string, string> = {
  ok: '● Active', warn: '◕ Nearing Limit', limit: '✕ Limit Hit',
  nokey: '○ No Key', free: '∞ Free Forever',
}

// ══════════════════════════════════════════════════════════
// STORAGE LAYER CARD
// ══════════════════════════════════════════════════════════
interface StorageLayer {
  id: string; name: string; emoji: string; type: string
  what: string; limit: string; cost: string; status: 'active' | 'optional' | 'offline'
  url: string; color: string
}

const STORAGE_LAYERS: StorageLayer[] = [
  {
    id: 'indexeddb', name: 'IndexedDB (Dexie)', emoji: '🧠', type: 'Local',
    what: 'Chats · Memory · Profile · Reminders · Tool Cache',
    limit: '~50MB–1GB browser quota', cost: 'FREE FOREVER', status: 'active',
    url: '', color: '#22c55e',
  },
  {
    id: 'puter', name: 'Puter Cloud', emoji: '☁️', type: 'User Cloud',
    what: 'Images · Audio · Music · Video · Canvas · Docs',
    limit: '1GB free per user account', cost: 'FREE (user owns it)', status: 'active',
    url: 'https://puter.com', color: '#00e5ff',
  },
  {
    id: 'localstorage', name: 'localStorage', emoji: '📦', type: 'Local',
    what: 'API Keys · Settings · Sync Queue · Provider Usage Stats',
    limit: '5–10MB', cost: 'FREE FOREVER', status: 'active',
    url: '', color: '#a78bfa',
  },
  {
    id: 'supabase', name: 'Supabase (PostgreSQL)', emoji: '🗄️', type: 'Optional Cloud',
    what: 'Cross-device chat sync · Memory backup',
    limit: '500MB rows · 2GB transfer/month', cost: 'FREE tier (no card required)', status: 'optional',
    url: 'https://supabase.com', color: '#38bdf8',
  },
  {
    id: 'firebase', name: 'Firebase Realtime DB', emoji: '🔥', type: 'Optional Cloud',
    what: 'Real-time sync · Live collaboration',
    limit: '1GB storage · 10GB transfer/month', cost: 'FREE Spark plan', status: 'optional',
    url: 'https://firebase.google.com', color: '#fb923c',
  },
  {
    id: 'toolcache', name: 'Tool Result Cache', emoji: '💾', type: 'In-Memory',
    what: 'Weather · News · Crypto · Wiki results (TTL-based)',
    limit: 'Up to 1000 entries, LRU eviction', cost: 'FREE FOREVER', status: 'active',
    url: '', color: '#4ade80',
  },
]

// ── Media architecture rules ─────────────────────────────
const MEDIA_RULES = [
  { rule: 'IndexedDB mein sirf metadata + 120×120 thumbnail', icon: '✅' },
  { rule: 'Full images/audio/video → Puter cloud only', icon: '✅' },
  { rule: 'Vercel server se KABHI media proxy nahi', icon: '✅' },
  { rule: 'Pollinations images → URL return, fetch nahi', icon: '✅' },
  { rule: 'AI-generated audio → Puter → external URL', icon: '✅' },
  { rule: 'Tool results cache → API calls 80% kam', icon: '✅' },
]

// ── GitHub versioning ─────────────────────────────────────
const GITHUB_STEPS = [
  { step: 1, title: 'Git init + remote', cmd: 'cd JARVIS-v18\ngit init\ngit remote add origin https://github.com/YOUR_USERNAME/jarvis-ai.git' },
  { step: 2, title: '.gitignore (secrets safe karo)', cmd: 'echo ".env.local\n.env\nnode_modules/\n.next/\n*.log" > .gitignore' },
  { step: 3, title: 'First commit', cmd: 'git add .\ngit commit -m "feat: JARVIS v18 Autonomous Tool System"\ngit branch -M main\ngit push -u origin main' },
  { step: 4, title: 'Vercel connect', cmd: '# vercel.com → Import GitHub repo → auto-deploy\n# Add env vars in Vercel Dashboard → Settings → Environment Variables' },
  { step: 5, title: 'Future updates', cmd: 'git add .\ngit commit -m "feat: describe your change"\ngit push  # auto-deploys to Vercel' },
]

// ══════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════
export default function SystemPage() {
  const [tab, setTab] = useState<'providers' | 'storage' | 'github' | 'routing'>('providers')
  const [statuses, setStatuses] = useState<ProviderStatus[]>([])
  const [dailyCost, setDailyCost] = useState(0)
  const [copiedCmd, setCopiedCmd] = useState<number | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const refresh = () => {
      setStatuses(getProviderStatuses())
      setDailyCost(getDailyCost())
    }
    refresh()
    const t = setInterval(refresh, 5000)
    return () => clearInterval(t)
  }, [tick])

  const copyCmd = (cmd: string, idx: number) => {
    navigator.clipboard.writeText(cmd).catch(() => {})
    setCopiedCmd(idx)
    setTimeout(() => setCopiedCmd(null), 2000)
  }

  // Group providers by type
  const flashProvs  = statuses.filter(s => s.provider.type === 'flash')
  const thinkProvs  = statuses.filter(s => s.provider.type === 'think')
  const imageProvs  = statuses.filter(s => s.provider.type === 'image')
  const storageProvs = statuses.filter(s => s.provider.type === 'storage')

  const totalCallsToday = statuses.reduce((s, p) => s + p.todayCalls, 0)
  const totalTokensToday = statuses.reduce((s, p) => s + p.todayTokens, 0)
  const activeProviders = statuses.filter(s => s.available).length

  const TABS = [
    { id: 'providers', label: 'AI Providers', icon: '🤖' },
    { id: 'storage',   label: 'Storage',      icon: '🗄️' },
    { id: 'routing',   label: 'Smart Route',  icon: '⚡' },
    { id: 'github',    label: 'GitHub',        icon: '🐙' },
  ] as const

  return (
    <div style={{
      minHeight: '100vh', background: BG, color: 'var(--text)',
      fontFamily: "'Noto Sans Devanagari', 'JetBrains Mono', system-ui, sans-serif",
      maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column',
    }}>

      {/* Header */}
      <header style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${BORDER}`, background: BG, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,229,255,.1)', border: `1px solid rgba(0,229,255,.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚙️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: ACCENT }}>System Dashboard</div>
            <div style={{ fontSize: 10, color: DIM }}>{activeProviders} active providers · ${dailyCost.toFixed(4)} today</div>
          </div>
          {/* Quick stats */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: GREEN, fontWeight: 600 }}>{totalCallsToday} calls</div>
            <div style={{ fontSize: 9, color: DIM }}>{(totalTokensToday/1000).toFixed(1)}K tokens</div>
          </div>
        </div>

        {/* Tab nav */}
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: '7px 4px', borderRadius: 8, border: `1px solid ${tab===t.id?ACCENT+'40':BORDER}`,
                background: tab===t.id ? 'rgba(0,229,255,.08)' : CARD,
                color: tab===t.id ? ACCENT : DIM,
                fontSize: 9.5, cursor: 'pointer', fontWeight: tab===t.id ? 700 : 400,
              }}>
              <div>{t.icon}</div>
              <div style={{ marginTop: 2 }}>{t.label}</div>
            </button>
          ))}
        </div>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', paddingBottom: 90 }}>

        {/* ── PROVIDERS TAB ─────────────────────────────────── */}
        {tab === 'providers' && (
          <div>
            {/* Cost summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Today Cost', value: `$${dailyCost.toFixed(4)}`, color: dailyCost > 0.05 ? YELLOW : GREEN },
                { label: 'API Calls', value: totalCallsToday.toString(), color: ACCENT },
                { label: 'Active', value: `${activeProviders}/${statuses.length}`, color: GREEN },
              ].map(s => (
                <div key={s.label} style={{ padding: '10px 8px', borderRadius: 10, background: CARD, border: `1px solid ${BORDER}`, textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: DIM, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Provider groups */}
            {[
              { label: '⚡ Flash Chat (Cost: Groq→Together→Gemini→Puter)', provs: flashProvs },
              { label: '🧠 Think Mode (Cheapest Reasoning)', provs: thinkProvs },
              { label: '🎨 Image Generation', provs: imageProvs },
              { label: '🗄️ Storage Providers', provs: storageProvs },
            ].map(group => (
              <div key={group.label} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: DIM, marginBottom: 8, fontWeight: 700, letterSpacing: '0.5px' }}>{group.label}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {group.provs.map((ps, i) => {
                    const p = ps.provider
                    const color = STATUS_COLOR[ps.status] || '#6b7280'
                    return (
                      <div key={p.id} style={{
                        padding: '10px 12px', borderRadius: 10,
                        background: i===0 && ps.available ? `${color}08` : CARD,
                        border: `1px solid ${i===0 && ps.available ? color+'30' : BORDER}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          {/* Priority badge */}
                          <div style={{ width: 18, height: 18, borderRadius: 5, background: i===0?`${color}25`:`${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: i===0?color:DIM, fontWeight: 700 }}>
                            {p.priority}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: ps.available ? 'var(--text)' : '#4a6080' }}>{p.name}</div>
                            <div style={{ fontSize: 9, color: DIM }}>{p.model}</div>
                          </div>
                          <div style={{ fontSize: 10, color, fontWeight: 600 }}>{STATUS_LABEL[ps.status]}</div>
                        </div>

                        {/* Usage bar (if has daily limit) */}
                        {p.limits.perDay && (
                          <div style={{ marginBottom: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                              <span style={{ fontSize: 9, color: DIM }}>{ps.todayCalls}/{p.limits.perDay} calls today</span>
                              <span style={{ fontSize: 9, color: ps.limitPct > 70 ? YELLOW : DIM }}>{ps.limitPct.toFixed(0)}%</span>
                            </div>
                            <div style={{ height: 3, borderRadius: 2, background: 'var(--border)' }}>
                              <div style={{ height: '100%', borderRadius: 2, width: `${ps.limitPct}%`, background: ps.limitPct > 90 ? RED : ps.limitPct > 70 ? YELLOW : GREEN, transition: 'width .3s' }} />
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: p.costPer1KTokens === 0 ? 'rgba(34,197,94,.1)' : 'rgba(251,191,36,.1)', color: p.costPer1KTokens === 0 ? GREEN : YELLOW }}>
                            {p.costPer1KTokens === 0 ? '💚 Free' : `$${p.costPer1KTokens}/1K tokens`}
                          </span>
                          {p.limits.perDay && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-card)', color: DIM }}>{p.limits.perDay}/day</span>}
                          {ps.todayCost > 0 && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(251,191,36,.08)', color: YELLOW }}>${ps.todayCost.toFixed(4)} today</span>}
                        </div>
                        <div style={{ fontSize: 9, color: DIM, marginTop: 5, lineHeight: 1.4 }}>{p.notes}</div>

                        {p.fallbackTo && (
                          <div style={{ fontSize: 9, color: DIM, marginTop: 3 }}>
                            ↳ fail → <span style={{ color: '#60a5fa' }}>{p.fallbackTo}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            <button
              onClick={() => { resetUsage(); setTick(t => t+1) }}
              style={{ width: '100%', padding: '9px', borderRadius: 9, border: `1px solid ${BORDER}`, background: CARD, color: DIM, fontSize: 11, cursor: 'pointer', marginTop: 8 }}
            >
              🔄 Reset Today's Usage Stats
            </button>
          </div>
        )}

        {/* ── STORAGE TAB ──────────────────────────────────── */}
        {tab === 'storage' && (
          <div>
            {/* Architecture diagram */}
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(0,229,255,.05)', border: `1px solid rgba(0,229,255,.15)`, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, marginBottom: 8 }}>📐 Storage Architecture</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, color: '#a0b8d0' }}>
                <div>💬 Chats / Memory → <span style={{ color: GREEN }}>IndexedDB</span> → <span style={{ color: '#38bdf8' }}>Supabase (sync)</span></div>
                <div>🖼️ Images / Audio → <span style={{ color: ACCENT }}>Puter Cloud</span> (user's 1GB)</div>
                <div>🔑 API Keys / Settings → <span style={{ color: '#a78bfa' }}>localStorage</span> (encrypted)</div>
                <div>⚡ Tool Results → <span style={{ color: '#4ade80' }}>Memory Cache</span> (TTL-based)</div>
                <div>☁️ Cross-device → <span style={{ color: '#fb923c' }}>Supabase / Firebase</span> (optional)</div>
              </div>
            </div>

            {/* Storage layers */}
            {STORAGE_LAYERS.map(layer => (
              <div key={layer.id} style={{ marginBottom: 10, padding: '12px 14px', borderRadius: 12, background: CARD, border: `1px solid ${layer.status === 'active' ? layer.color+'20' : BORDER}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 20 }}>{layer.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{layer.name}</div>
                    <div style={{ fontSize: 9, color: DIM }}>{layer.type}</div>
                  </div>
                  <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 6, background: layer.status==='active'?`${layer.color}15`:'var(--bg-card)', color: layer.status==='active'?layer.color:DIM, border: `1px solid ${layer.status==='active'?layer.color+'30':BORDER}` }}>
                    {layer.status === 'active' ? '● Active' : '○ Optional'}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: '#7a9ab8', marginBottom: 4 }}>{layer.what}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(34,197,94,.08)', color: GREEN }}>{layer.cost}</span>
                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-card)', color: DIM }}>{layer.limit}</span>
                </div>
                {layer.url && (
                  <a href={layer.url} target="_blank" rel="noopener" style={{ fontSize: 9, color: ACCENT, textDecoration: 'none', display: 'block', marginTop: 5 }}>→ Setup: {layer.url.replace('https://','')}</a>
                )}
              </div>
            ))}

            {/* Media rules */}
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(34,197,94,.04)', border: '1px solid rgba(34,197,94,.15)', marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: GREEN, marginBottom: 8 }}>📋 Zero-Bandwidth Media Rules</div>
              {MEDIA_RULES.map(r => (
                <div key={r.rule} style={{ display: 'flex', gap: 8, marginBottom: 5, fontSize: 10, color: '#7a9ab8' }}>
                  <span>{r.icon}</span><span>{r.rule}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SMART ROUTING TAB ────────────────────────────── */}
        {tab === 'routing' && (
          <div>
            {/* Route flowchart */}
            <div style={{ padding: '14px', borderRadius: 12, background: CARD, border: `1px solid ${BORDER}`, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, marginBottom: 12 }}>⚡ Flash Mode — Credit Flow</div>
              {[
                { label: 'L1 Groq (llama-8b)', cost: '🟢 FREE', limit: '14,400/day', detail: 'Fastest. Tries this first always.', color: GREEN },
                { label: 'L2 Groq (llama-70b)', cost: '🟢 FREE', limit: '1,000/day', detail: 'Better quality. Same Groq key.', color: '#4ade80' },
                { label: 'L3 Together AI (70b)', cost: '🟡 $0.0009/1K', limit: '$25 free credit', detail: 'If Groq hits limit.', color: YELLOW },
                { label: 'L4 Gemini 2.0 Flash', cost: '🟢 FREE', limit: '1,500/day', detail: 'Backup with tools.', color: '#38bdf8' },
                { label: 'L5 Puter (GPT-4o-mini)', cost: '🟢 User pays', limit: 'Puter limits', detail: 'Browser-side last resort.', color: '#a78bfa' },
              ].map((l, i) => (
                <div key={l.label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: i < 4 ? 4 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 20, height: 20, borderRadius: 10, background: `${l.color}20`, border: `1px solid ${l.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: l.color, fontWeight: 700, flexShrink: 0 }}>{i+1}</div>
                    {i < 4 && <div style={{ width: 1, height: 14, background: BORDER, margin: '2px 0' }} />}
                  </div>
                  <div style={{ flex: 1, padding: '5px 8px', borderRadius: 7, background: `${l.color}06`, border: `1px solid ${l.color}20`, marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: l.color }}>{l.label}</span>
                      <span style={{ fontSize: 9, color: DIM }}>{l.limit}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 9, color: '#a0b8d0' }}>{l.cost}</span>
                      <span style={{ fontSize: 9, color: DIM }}>{l.detail}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Think mode */}
            <div style={{ padding: '14px', borderRadius: 12, background: CARD, border: `1px solid ${BORDER}`, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', marginBottom: 12 }}>🧠 Think Mode — Routing</div>
              {[
                { label: 'T1 DeepSeek R1 (OpenRouter)', cost: '$0.55/1M tokens', detail: 'Cheapest reasoning model. Best for NEET/Math.', color: '#a78bfa' },
                { label: 'T2 Gemini Flash Thinking', cost: '🟢 FREE 50/day', detail: 'Free thinking model fallback.', color: '#38bdf8' },
                { label: 'T3 Puter GPT-4o', cost: '🟢 User account', detail: 'Browser-side. Free for user.', color: '#4ade80' },
              ].map((l, i) => (
                <div key={l.label} style={{ padding: '8px 10px', borderRadius: 8, background: `${l.color}06`, border: `1px solid ${l.color}20`, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 11, color: l.color, fontWeight: 600 }}>T{i+1} {l.label}</span>
                    <span style={{ fontSize: 9, color: DIM }}>{l.cost}</span>
                  </div>
                  <div style={{ fontSize: 9, color: DIM }}>{l.detail}</div>
                </div>
              ))}
            </div>

            {/* Tool execution savings */}
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(34,197,94,.04)', border: '1px solid rgba(34,197,94,.15)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: GREEN, marginBottom: 8 }}>📊 Credit Saving Strategies</div>
              {[
                ['Tool Cache', 'TTL-based cache → 70-80% API calls saved for repeat queries'],
                ['Intent Filter', 'Chitchat → tools skip, Gemini call skip → pure L1 Groq only'],
                ['Max 2 Tools', 'Never load >2 tools per query → Gemini prompt size small'],
                ['No-Key First', 'Free tools prioritized → paid tools only as last resort'],
                ['URL not Proxy', 'Images/videos → external URLs → ZERO Vercel bandwidth'],
                ['Lazy Modules', 'Only weather/news/etc loaded when needed, not all 18 categories'],
                ['History Limit', 'Max 8-10 messages in context → smaller Gemini calls'],
              ].map(([title, desc]) => (
                <div key={title as string} style={{ display: 'flex', gap: 8, marginBottom: 7 }}>
                  <span style={{ fontSize: 10, color: GREEN, flexShrink: 0 }}>✓</span>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#a0d8ef' }}>{title}: </span>
                    <span style={{ fontSize: 10, color: DIM }}>{desc as string}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── GITHUB TAB ───────────────────────────────────── */}
        {tab === 'github' && (
          <div>
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,.03)', border: `1px solid ${BORDER}`, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>🐙 GitHub → Vercel Auto-Deploy</div>
              <div style={{ fontSize: 10, color: DIM, lineHeight: 1.6 }}>
                GitHub pe push karo → Vercel auto build + deploy. Sirf source code (HTML/JS/TS) — koi media/keys nahi. Environment variables Vercel dashboard mein set karo.
              </div>
            </div>

            {GITHUB_STEPS.map((s, idx) => (
              <div key={s.step} style={{ marginBottom: 12, padding: '12px 14px', borderRadius: 12, background: CARD, border: `1px solid ${BORDER}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(0,229,255,.1)', border: '1px solid rgba(0,229,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: ACCENT, fontWeight: 700 }}>{s.step}</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{s.title}</span>
                  <button
                    onClick={() => copyCmd(s.cmd, idx)}
                    style={{ marginLeft: 'auto', padding: '3px 8px', borderRadius: 5, border: `1px solid ${BORDER}`, background: copiedCmd===idx?'rgba(34,197,94,.1)':CARD, color: copiedCmd===idx?GREEN:DIM, fontSize: 10, cursor: 'pointer' }}
                  >
                    {copiedCmd === idx ? '✓ Copied' : '⎘ Copy'}
                  </button>
                </div>
                <pre style={{ margin: 0, padding: '8px 10px', borderRadius: 7, background: 'rgba(0,0,0,.4)', border: '1px solid rgba(255,255,255,.05)', fontSize: 10, color: '#7dd3c8', overflowX: 'auto', lineHeight: 1.5, fontFamily: 'monospace' }}>
                  {s.cmd}
                </pre>
              </div>
            ))}

            {/* Env vars for Vercel */}
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(251,191,36,.04)', border: '1px solid rgba(251,191,36,.15)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: YELLOW, marginBottom: 8 }}>⚠️ Vercel mein yeh env vars lagao</div>
              {[
                ['GROQ_API_KEY', 'Required. Free at console.groq.com'],
                ['GEMINI_API_KEY', 'Required. Free at aistudio.google.com'],
                ['TOGETHER_API_KEY', 'Optional. $25 free credit'],
                ['OPENROUTER_API_KEY', 'Optional. Think mode (DeepSeek R1)'],
                ['NASA_API_KEY', 'Optional. Use "DEMO_KEY" for free'],
              ].map(([key, note]) => (
                <div key={key as string} style={{ display: 'flex', gap: 8, marginBottom: 5, alignItems: 'flex-start' }}>
                  <code style={{ fontSize: 9, padding: '2px 5px', borderRadius: 3, background: 'rgba(251,191,36,.1)', color: YELLOW, flexShrink: 0 }}>{key as string}</code>
                  <span style={{ fontSize: 9, color: DIM }}>{note as string}</span>
                </div>
              ))}
            </div>

            {/* Version info */}
            <div style={{ padding: '12px 14px', borderRadius: 12, background: CARD, border: `1px solid ${BORDER}`, marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>📦 Current Build</div>
              {[
                ['Version', 'v18.0.0 Autonomous'],
                ['Files', '145 source files'],
                ['Framework', 'Next.js 14 + TypeScript'],
                ['Deploy', 'Vercel (Edge + Node.js)'],
                ['Storage', 'Dexie + Puter + Supabase'],
                ['AI Providers', '5 flash · 3 think · 3 image'],
                ['Tool Categories', '18 categories · 50 tools'],
                ['Monthly Cost (est.)', '$0 if Groq free limits sufficient'],
              ].map(([k, v]) => (
                <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 10, color: DIM }}>{k as string}</span>
                  <span style={{ fontSize: 10, color: '#a0b8d0', fontWeight: 600 }}>{v as string}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

    </div>
  )
}
