'use client'
// app/widgets/page.tsx — JARVIS Smart Widgets
// Live: NEET countdown, Gold, Crypto, Weather, Prayer, News ticker
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initTheme } from '../../lib/theme'

interface Widget {
  id: string; title: string; icon: string
  value: string; sub: string; color: string; bg: string
  loading?: boolean
}

export default function WidgetsPage() {
  const router = useRouter()
  const [widgets, setWidgets] = useState<Widget[]>([
    { id:'neet', title:'NEET 2026', icon:'📚', value:'...', sub:'Din baaki hain', color:'#f59e0b', bg:'rgba(245,158,11,.08)', loading:true },
    { id:'gold', title:'Gold 10g', icon:'🥇', value:'...', sub:'24K pure', color:'#fbbf24', bg:'rgba(251,191,36,.08)', loading:true },
    { id:'silver', title:'Silver 10g', icon:'🥈', value:'...', sub:'Pure silver', color:'#94a3b8', bg:'rgba(148,163,184,.08)', loading:true },
    { id:'btc', title:'Bitcoin', icon:'₿', value:'...', sub:'BTC/USD', color:'#f97316', bg:'rgba(249,115,22,.08)', loading:true },
    { id:'weather', title:'Rewa Mausam', icon:'🌤️', value:'...', sub:'Real-time', color:'#60a5fa', bg:'rgba(96,165,250,.08)', loading:true },
    { id:'time', title:'IST Time', icon:'⏰', value:'', sub:'India Standard Time', color:'#34d399', bg:'rgba(52,211,153,.08)' },
  ])
  const [news, setNews] = useState<string[]>([])
  const [newsIdx, setNewsIdx] = useState(0)
  const [petrol, setPetrol] = useState<{p:number;d:number}|null>(null)

  useEffect(() => {
    initTheme()
    loadAll()
    const tick = setInterval(() => {
      setWidgets(w => w.map(x => x.id === 'time' ? {
        ...x,
        value: new Date().toLocaleTimeString('hi-IN', { timeZone:'Asia/Kolkata', hour:'2-digit', minute:'2-digit', second:'2-digit' })
      } : x))
    }, 1000)
    const newsRot = setInterval(() => setNewsIdx(i => i + 1), 4000)
    return () => { clearInterval(tick); clearInterval(newsRot) }
  }, [])

  const loadAll = async () => {
    // NEET countdown
    const neetDate = new Date('2026-05-03T10:00:00+05:30')
    const days = Math.max(0, Math.ceil((neetDate.getTime() - Date.now()) / 86400000))
    setWidgets(w => w.map(x => x.id === 'neet' ? { ...x, value: `${days}`, loading:false } : x))

    // Gold & Silver
    try {
      const r = await fetch('https://api.metals.live/v1/spot/gold,silver')
      if (r.ok) {
        const d = await r.json()
        const INR = 83.5; const G10 = 10/31.1035
        const g = Math.round((d[0]?.price||0) * INR * G10)
        const s = Math.round((d[1]?.price||0) * INR * G10)
        setWidgets(w => w.map(x =>
          x.id==='gold' ? {...x, value:`₹${g.toLocaleString('en-IN')}`, sub:`${d[0]?.['24hChange']>0?'▲':'▼'} 24h change`, loading:false} :
          x.id==='silver' ? {...x, value:`₹${s.toLocaleString('en-IN')}`, loading:false} : x
        ))
      }
    } catch {}

    // Bitcoin
    try {
      const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,inr&include_24hr_change=true')
      if (r.ok) {
        const d = await r.json()
        const change = d.bitcoin?.usd_24h_change?.toFixed(1)||'0'
        setWidgets(w => w.map(x => x.id==='btc' ? {...x, value:`$${Math.round(d.bitcoin?.usd||0).toLocaleString()}`, sub:`${change>0?'▲':'▼'} ${Math.abs(Number(change))}% 24h`, loading:false} : x))
      }
    } catch {}

    // Weather
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async p => {
        try {
          const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.coords.latitude}&longitude=${p.coords.longitude}&current=temperature_2m,weather_code&timezone=Asia%2FKolkata`)
          const d = await r.json()
          const ic:Record<string,string> = {'0':'☀️','1':'🌤','2':'⛅','3':'☁️','61':'🌧','80':'🌦','95':'⛈'}
          const icon = ic[String(Math.floor((d.current?.weather_code||0)/10)*10)]||'🌡️'
          setWidgets(w => w.map(x => x.id==='weather' ? {...x, value:`${icon} ${Math.round(d.current?.temperature_2m)}°C`, loading:false} : x))
        } catch {}
      })
    }

    // News
    try {
      const r = await fetch('https://gnews.io/api/v4/top-headlines?country=in&max=8&token=free')
      if (r.ok) {
        const d = await r.json()
        setNews((d.articles||[]).slice(0,8).map((a:any) => a.title))
      }
    } catch {}

    // Petrol (Rewa approx)
    setPetrol({ p: 109.20, d: 94.10 })
  }

  const S = {
    page: { minHeight:'100dvh', background:'var(--bg)', color:'var(--text)', fontFamily:"'Inter','Noto Sans Devanagari',sans-serif" },
    header: { position:'sticky' as const, top:0, zIndex:50, background:'var(--header)', backdropFilter:'blur(12px)', borderBottom:'1px solid var(--border)', padding:'10px 16px', display:'flex', alignItems:'center', gap:10 },
  }

  return (
    <div style={S.page}>
      <div className="bg-grid"/>
      <div style={S.header}>
        <button onClick={() => router.push('/')} style={{ background:'var(--accent-bg)', border:'1px solid var(--border-a)', borderRadius:8, color:'var(--accent)', fontSize:14, fontWeight:800, width:28, height:28, fontFamily:"monospace" }}>J</button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15, fontWeight:700 }}>🧩 Smart Widgets</div>
          <div style={{ fontSize:10, color:'var(--text-3)' }}>Live data at a glance</div>
        </div>
        <button onClick={loadAll} style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, color:'var(--text-3)', fontSize:11, padding:'4px 10px', cursor:'pointer' }}>🔄 Refresh</button>
      </div>

      {/* News ticker */}
      {news.length > 0 && (
        <div style={{ background:'rgba(0,229,255,.06)', borderBottom:'1px solid rgba(0,229,255,.1)', padding:'8px 16px', overflow:'hidden' }}>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <span style={{ fontSize:9, fontWeight:700, color:'var(--accent)', whiteSpace:'nowrap', background:'var(--accent-bg)', padding:'2px 6px', borderRadius:4 }}>LIVE</span>
            <div style={{ fontSize:11, color:'var(--text-2)', animation:'fadein .5s', flex:1 }}>
              📰 {news[newsIdx % news.length]}
            </div>
          </div>
        </div>
      )}

      <div style={{ padding:'14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {widgets.map(w => (
          <div key={w.id} style={{ background:w.bg, border:`1px solid ${w.color}30`, borderRadius:14, padding:'14px 12px' }}>
            <div style={{ fontSize:11, color:w.color, fontWeight:700, marginBottom:4 }}>{w.icon} {w.title}</div>
            <div style={{ fontSize:w.id==='time'?18:24, fontWeight:800, color:w.color, lineHeight:1, fontFamily:"'JetBrains Mono',monospace" }}>
              {w.loading ? <span style={{ fontSize:12, color:'var(--text-3)' }}>Loading...</span> : w.value}
            </div>
            <div style={{ fontSize:10, color:'var(--text-3)', marginTop:4 }}>{w.sub}</div>
          </div>
        ))}

        {/* Petrol card */}
        {petrol && (
          <div style={{ background:'rgba(249,115,22,.06)', border:'1px solid rgba(249,115,22,.2)', borderRadius:14, padding:'14px 12px', gridColumn:'span 2' }}>
            <div style={{ fontSize:11, color:'#f97316', fontWeight:700, marginBottom:8 }}>⛽ Rewa Fuel Price</div>
            <div style={{ display:'flex', gap:16 }}>
              <div>
                <div style={{ fontSize:24, fontWeight:800, color:'#f97316', fontFamily:"'JetBrains Mono',monospace" }}>₹{petrol.p}</div>
                <div style={{ fontSize:10, color:'var(--text-3)' }}>Petrol/L</div>
              </div>
              <div>
                <div style={{ fontSize:24, fontWeight:800, color:'#94a3b8', fontFamily:"'JetBrains Mono',monospace" }}>₹{petrol.d}</div>
                <div style={{ fontSize:10, color:'var(--text-3)' }}>Diesel/L</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
