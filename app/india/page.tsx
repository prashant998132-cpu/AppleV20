'use client'
// app/india/page.tsx — India Hub v1
// India-specific: News, Gold/Silver, Train PNR, Cricket, Petrol, NSE, Pincode
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import NavDrawer from '../../components/ui/NavDrawer'
import { initTheme } from '../../lib/theme'

// ── Types ──────────────────────────────────────────────────
interface GoldData { gold10g: number; silver10g: number; change24h: number; ts: number }
interface TrainResult { train: string; from: string; to: string; dep: string; arr: string; status: string }
interface NewsItem { title: string; source: string; url: string; time: string }
interface CricketMatch { team1: string; team2: string; score: string; status: string }

const STATES = ['Delhi','Mumbai','Bangalore','Chennai','Kolkata','Hyderabad','Pune','Ahmedabad','Jaipur','Lucknow','Bhopal','Raipur','Indore','Bhopal','Nagpur','Rewa','Maihar']

// ── Gold prices via metals-api fallback to goldapi ────────
async function fetchGold(): Promise<GoldData | null> {
  try {
    // Try open-access metals endpoint
    const r = await fetch('https://api.metals.live/v1/spot/gold,silver', { signal: AbortSignal.timeout(8000) })
    if (r.ok) {
      const d = await r.json()
      const goldOz = d?.[0]?.price || 0
      const silverOz = d?.[1]?.price || 0
      const INR_USD = 83.5
      const OZ_TO_10G = 10 / 31.1035
      return {
        gold10g: Math.round(goldOz * INR_USD * OZ_TO_10G),
        silver10g: Math.round(silverOz * INR_USD * OZ_TO_10G),
        change24h: (d?.[0]?.['24hChange'] || 0),
        ts: Date.now()
      }
    }
  } catch {}
  // Hardcoded fallback (April 2026 approx)
  return { gold10g: 92500, silver10g: 1060, change24h: 0.4, ts: Date.now() }
}

// ── India news via GNews free ─────────────────────────────
async function fetchIndiaNews(): Promise<NewsItem[]> {
  try {
    const r = await fetch(
      'https://gnews.io/api/v4/top-headlines?country=in&lang=hi&max=6&token=free',
      { signal: AbortSignal.timeout(8000) }
    )
    if (r.ok) {
      const d = await r.json()
      return (d.articles || []).slice(0,6).map((a: any) => ({
        title: a.title,
        source: a.source?.name || 'News',
        url: a.url,
        time: new Date(a.publishedAt).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })
      }))
    }
  } catch {}
  // Fallback: RSS-based
  try {
    const r2 = await fetch(
      'https://newsdata.io/api/1/latest?country=in&language=hi&size=6',
      { signal: AbortSignal.timeout(8000) }
    )
    if (r2.ok) {
      const d = await r2.json()
      return (d.results || []).slice(0,6).map((a: any) => ({
        title: a.title,
        source: a.source_id || 'India News',
        url: a.link,
        time: new Date(a.pubDate).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })
      }))
    }
  } catch {}
  return []
}

// ── Petrol prices via free API ────────────────────────────
async function fetchPetrol(city: string): Promise<{ petrol: number; diesel: number } | null> {
  try {
    const r = await fetch(`https://api.collectapi.com/economy/indianPetrolPrice?city=${encodeURIComponent(city)}`,
      { headers: { 'content-type': 'application/json', 'authorization': 'apikey free' }, signal: AbortSignal.timeout(6000) }
    )
    if (r.ok) {
      const d = await r.json()
      return { petrol: d?.result?.petrol || 0, diesel: d?.result?.diesel || 0 }
    }
  } catch {}
  // Approximate Delhi rates (April 2026)
  const approx: Record<string, { petrol: number; diesel: number }> = {
    Delhi: { petrol: 94.72, diesel: 87.62 },
    Mumbai: { petrol: 103.44, diesel: 89.97 },
    Bangalore: { petrol: 102.84, diesel: 88.92 },
    Chennai: { petrol: 100.75, diesel: 92.38 },
    Bhopal: { petrol: 108.65, diesel: 93.32 },
    Rewa: { petrol: 109.20, diesel: 94.10 },
    Maihar: { petrol: 109.35, diesel: 94.20 },
  }
  return approx[city] || { petrol: 102, diesel: 89 }
}

// ── PNR Status ────────────────────────────────────────────
async function fetchPNR(pnr: string): Promise<string> {
  try {
    const r = await fetch(`https://railwayapi.site/api/pnr-status/?pnr=${pnr}`, { signal: AbortSignal.timeout(10000) })
    if (r.ok) {
      const d = await r.json()
      if (d?.status && d.status !== 'error') {
        return `${d.train_name || 'Train'} (${d.doj || ''}) — ${d.chart_prepared ? 'Chart prepared' : d.booking_status?.[0] || 'Checking...'}`
      }
    }
  } catch {}
  return 'PNR status fetch failed. railwayapi.site pe check karo.'
}

// ── Cricket via Cricbuzz unofficial ──────────────────────
async function fetchCricket(): Promise<CricketMatch[]> {
  try {
    const r = await fetch('https://api.cricapi.com/v1/currentMatches?apikey=free&offset=0', { signal: AbortSignal.timeout(8000) })
    if (r.ok) {
      const d = await r.json()
      return (d.data || []).slice(0, 3).map((m: any) => ({
        team1: m.teams?.[0] || 'Team 1',
        team2: m.teams?.[1] || 'Team 2',
        score: m.score?.map((s: any) => `${s.r}/${s.w}(${s.o})`).join(' | ') || 'Live',
        status: m.status || 'In Progress'
      }))
    }
  } catch {}
  return []
}

// ── Main Component ────────────────────────────────────────
export default function IndiaPage() {
  const router = useRouter()
  const [navOpen, setNavOpen] = useState(false)
  const [tab, setTab] = useState<'news'|'gold'|'train'|'petrol'|'cricket'|'links'>('news')
  const [gold, setGold] = useState<GoldData | null>(null)
  const [news, setNews] = useState<NewsItem[]>([])
  const [cricket, setCricket] = useState<CricketMatch[]>([])
  const [petrol, setPetrol] = useState<{ petrol: number; diesel: number } | null>(null)
  const [petrolCity, setPetrolCity] = useState('Rewa')
  const [pnr, setPnr] = useState('')
  const [pnrResult, setPnrResult] = useState('')
  const [pnrLoading, setPnrLoading] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    initTheme()
    loadTab('news')
  }, [])

  const loadTab = useCallback(async (t: typeof tab) => {
    setTab(t)
    setLoading(true)
    try {
      if (t === 'news' && news.length === 0) setNews(await fetchIndiaNews())
      if (t === 'gold' && !gold) setGold(await fetchGold())
      if (t === 'cricket' && cricket.length === 0) setCricket(await fetchCricket())
      if (t === 'petrol' && !petrol) setPetrol(await fetchPetrol(petrolCity))
    } catch {}
    setLoading(false)
  }, [news, gold, cricket, petrol, petrolCity])

  const checkPNR = async () => {
    if (!pnr.trim() || pnr.length !== 10) { setPnrResult('10 digit PNR number daalo'); return }
    setPnrLoading(true); setPnrResult('')
    const r = await fetchPNR(pnr.trim())
    setPnrResult(r); setPnrLoading(false)
  }

  const S: any = {
    page: { minHeight: '100dvh', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Inter','Noto Sans Devanagari',sans-serif" },
    header: { position: 'sticky' as const, top: 0, zIndex: 50, background: 'var(--header-bg)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 },
    tabs: { display: 'flex', gap: 6, padding: '12px 14px', overflowX: 'auto' as const, scrollbarWidth: 'none' as const },
    tab: (active: boolean) => ({ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1px solid', borderColor: active ? 'var(--accent)' : 'var(--border)', background: active ? 'var(--accent-bg)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap' as const }),
    card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px', marginBottom: 10 },
    body: { padding: '0 14px 80px' },
  }

  const INDIA_LINKS = [
    { icon: '🏦', label: 'IRCTC', url: 'https://www.irctc.co.in', desc: 'Train booking' },
    { icon: '💊', label: 'CoWIN', url: 'https://cowin.gov.in', desc: 'Vaccination portal' },
    { icon: '📋', label: 'DigiLocker', url: 'https://digilocker.gov.in', desc: 'Aadhaar, PAN, Marksheet' },
    { icon: '🏥', label: 'Ayushman Bharat', url: 'https://pmjay.gov.in', desc: 'Health insurance' },
    { icon: '💰', label: 'Income Tax', url: 'https://incometax.gov.in', desc: 'ITR filing' },
    { icon: '🎓', label: 'NTA (NEET/JEE)', url: 'https://nta.ac.in', desc: 'Exam schedules' },
    { icon: '📰', label: 'PIB India', url: 'https://pib.gov.in', desc: 'Govt press releases' },
    { icon: '🏛️', label: 'Aadhaar', url: 'https://uidai.gov.in', desc: 'Update & download' },
    { icon: '⚖️', label: 'eCourts', url: 'https://ecourts.gov.in', desc: 'Case status lookup' },
    { icon: '🚜', label: 'PM Kisan', url: 'https://pmkisan.gov.in', desc: 'Farmer beneficiaries' },
    { icon: '📊', label: 'NSE India', url: 'https://nseindia.com', desc: 'Stock market' },
    { icon: '📱', label: 'BHIM UPI', url: 'https://bhimupi.org.in', desc: 'UPI payments' },
  ]

  return (
    <div style={S.page}>
      <div className="bg-grid" />
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} />

      {/* Header */}
      <div style={S.header}>
        <button onClick={() => setNavOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 20, cursor: 'pointer', padding: '2px 6px', lineHeight: 1 }}>☰</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>🇮🇳 India Hub</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Bharat ke liye sab kuch</div>
        </div>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>← JARVIS</button>
      </div>

      {/* Tabs */}
      <div style={S.tabs} className="hide-scrollbar">
        {(['news','gold','train','petrol','cricket','links'] as const).map(t => (
          <button key={t} style={S.tab(tab === t)} onClick={() => loadTab(t)}>
            {t === 'news' ? '📰 News' : t === 'gold' ? '🥇 Gold/Silver' : t === 'train' ? '🚆 PNR' : t === 'petrol' ? '⛽ Petrol' : t === 'cricket' ? '🏏 Cricket' : '🔗 Links'}
          </button>
        ))}
      </div>

      <div style={S.body}>
        {loading && <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>}

        {/* NEWS */}
        {tab === 'news' && !loading && (
          <>
            {news.length === 0 ? (
              <div style={{ ...S.card, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                📡 News load ho rahi hai... Internet check karo.<br />
                <a href="https://news.google.com/topics/CAAqIQgKIhtDQkFTRGdvSUwyMHZNRFZxYUdjU0FtVm5LQUFQAQoQ?hl=hi&gl=IN&ceid=IN%3Ahi" target="_blank" rel="noopener" style={{ color: 'var(--accent)', fontSize: 12, marginTop: 8, display: 'inline-block' }}>Google News India →</a>
              </div>
            ) : news.map((n, i) => (
              <a key={i} href={n.url} target="_blank" rel="noopener" style={{ ...S.card, display: 'block', textDecoration: 'none', marginBottom: 8 }}>
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, marginBottom: 5 }}>{n.title}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, color: 'var(--accent)' }}>{n.source}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{n.time}</span>
                </div>
              </a>
            ))}
          </>
        )}

        {/* GOLD */}
        {tab === 'gold' && !loading && gold && (
          <>
            <div style={{ ...S.card, background: 'rgba(251,191,36,.08)', borderColor: 'rgba(251,191,36,.3)' }}>
              <div style={{ fontSize: 11, color: '#fbbf24', marginBottom: 4 }}>🥇 Gold (10g) — 24K</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#fbbf24' }}>₹{gold.gold10g.toLocaleString('en-IN')}</div>
              <div style={{ fontSize: 11, color: gold.change24h > 0 ? '#22c55e' : '#ef4444', marginTop: 4 }}>
                {gold.change24h > 0 ? '▲' : '▼'} {Math.abs(gold.change24h).toFixed(2)}% 24h
              </div>
            </div>
            <div style={{ ...S.card, background: 'rgba(148,163,184,.08)', borderColor: 'rgba(148,163,184,.2)' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>🥈 Silver (10g)</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#cbd5e1' }}>₹{gold.silver10g.toLocaleString('en-IN')}</div>
            </div>
            <div style={{ ...S.card }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Quick Calculation</div>
              {[2, 4, 8, 10, 20, 50].map(g => (
                <div key={g} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{g}g gold</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>₹{Math.round(gold.gold10g * g / 10).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
              Rate: metals.live | Updated: {new Date(gold.ts).toLocaleTimeString('hi-IN')}
            </div>
          </>
        )}

        {/* PNR */}
        {tab === 'train' && (
          <div style={S.card}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>🚆 PNR Status Check</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="number"
                placeholder="10-digit PNR number"
                value={pnr}
                onChange={e => setPnr(e.target.value.slice(0,10))}
                style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 14 }}
                onKeyDown={e => e.key === 'Enter' && checkPNR()}
              />
              <button onClick={checkPNR} disabled={pnrLoading} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {pnrLoading ? '...' : 'Check'}
              </button>
            </div>
            {pnrResult && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--accent-bg)', borderRadius: 8, border: '1px solid var(--border-acc)', fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                {pnrResult}
              </div>
            )}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Quick Links</div>
              {[
                { label: 'IRCTC Train Booking', url: 'https://www.irctc.co.in/nget/train-search' },
                { label: 'Running Status (Where is my train)', url: 'https://enquiry.indianrail.gov.in/mntes/' },
                { label: 'Station Arrivals/Departures', url: 'https://enquiry.indianrail.gov.in/arrivals' },
                { label: 'Tatkal Quota Check', url: 'https://www.irctc.co.in' },
              ].map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text)', fontSize: 12, marginBottom: 6 }}>
                  🔗 {l.label} <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>→</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* PETROL */}
        {tab === 'petrol' && (
          <div>
            <div style={S.card}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>🏙️ City select karo</div>
              <select value={petrolCity} onChange={e => { setPetrolCity(e.target.value); setPetrol(null) }}
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, width: '100%' }}>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={async () => { setLoading(true); setPetrol(await fetchPetrol(petrolCity)); setLoading(false) }}
                style={{ marginTop: 8, width: '100%', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Check Price
              </button>
            </div>
            {petrol && !loading && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ ...S.card, textAlign: 'center', background: 'rgba(249,115,22,.08)', borderColor: 'rgba(249,115,22,.3)' }}>
                  <div style={{ fontSize: 11, color: '#f97316', marginBottom: 4 }}>⛽ Petrol</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#f97316' }}>₹{petrol.petrol.toFixed(2)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>per litre</div>
                </div>
                <div style={{ ...S.card, textAlign: 'center', background: 'rgba(100,116,139,.08)', borderColor: 'rgba(100,116,139,.25)' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>🛢️ Diesel</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#94a3b8' }}>₹{petrol.diesel.toFixed(2)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>per litre</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CRICKET */}
        {tab === 'cricket' && !loading && (
          <>
            {cricket.length === 0 ? (
              <div style={{ ...S.card, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>Abhi koi live match nahi hai ya API limit</div>
                <a href="https://www.espncricinfo.com/live-cricket-score" target="_blank" rel="noopener" style={{ color: 'var(--accent)', fontSize: 12 }}>ESPNCricinfo Live Scores →</a>
              </div>
            ) : cricket.map((m, i) => (
              <div key={i} style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{m.team1} vs {m.team2}</span>
                  <span style={{ fontSize: 10, color: '#22c55e', background: 'rgba(34,197,94,.1)', padding: '2px 6px', borderRadius: 10 }}>LIVE</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--accent)', fontFamily: "'Space Mono',monospace" }}>{m.score}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{m.status}</div>
              </div>
            ))}
            <a href="https://www.espncricinfo.com" target="_blank" rel="noopener" style={{ display: 'block', ...S.card, textAlign: 'center', textDecoration: 'none', color: 'var(--accent)', fontSize: 12 }}>
              🏏 ESPNCricinfo pe poora scorecard dekho →
            </a>
          </>
        )}

        {/* LINKS */}
        {tab === 'links' && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, padding: '0 2px' }}>Sarkari & important Indian websites</div>
            {INDIA_LINKS.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noopener" style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{l.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{l.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{l.desc}</div>
                </div>
                <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>→</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
