'use client'
// app/briefing/page.tsx — JARVIS Daily Briefing v3
// Weather + Crypto + News + Tasks + Quote + AI Summary

import { useState, useEffect } from 'react'

interface WeatherData { temp: number; feels: number; desc: string; humidity: number; city: string; wind: number; icon: string }
interface CryptoData { btc: number; eth: number; sol: number; btcChange: number; ethChange: number; solChange: number }
interface NewsItem { title: string; url: string; source: string }
interface GoldData { gold24k: number; gold22k: number; silver: number; change: number; silverChange: number }
interface Task { id: string; text: string; done: boolean; priority: 'high'|'medium'|'low' }

const W_ICONS: Record<string,string> = {
  'Clear sky':'☀️','Mainly clear':'🌤️','Partly cloudy':'⛅','Cloudy':'☁️',
  'Drizzle':'🌦️','Rain':'🌧️','Showers':'🌨️','Thunderstorm':'⛈️','Snow':'❄️','Fog':'🌫️'
}

export default function BriefingPage() {
  const [weather, setWeather] = useState<WeatherData|null>(null)
  const [crypto,  setCrypto]  = useState<CryptoData|null>(null)
  const [news,    setNews]    = useState<NewsItem[]>([])
  const [tasks,   setTasks]   = useState<Task[]>([])
  const [gold,    setGold]    = useState<GoldData|null>(null)
  const [quote,   setQuote]   = useState('')
  const [aiSum,   setAiSum]   = useState('')
  const [loading, setLoading] = useState(true)
  const [time,    setTime]    = useState(new Date())
  const [newTask, setNewTask] = useState('')
  const [tab,     setTab]     = useState<'overview'|'tasks'|'news'>('overview')

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000)
    loadTasks()
    fetchAll()
    return () => clearInterval(t)
  }, [])

  function loadTasks() {
    try {
      const saved = JSON.parse(localStorage.getItem('jarvis_briefing_tasks') || '[]')
      setTasks(saved)
    } catch { setTasks([]) }
  }

  function saveTasks(t: Task[]) {
    setTasks(t)
    localStorage.setItem('jarvis_briefing_tasks', JSON.stringify(t))
  }

  function addTask() {
    if (!newTask.trim()) return
    const priority: Task['priority'] = /urgent|jaldi|important|zaruri/i.test(newTask) ? 'high' : 'medium'
    saveTasks([{ id: Date.now().toString(), text: newTask.trim(), done: false, priority }, ...tasks])
    setNewTask('')
  }

  function toggleTask(id: string) {
    saveTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  function deleteTask(id: string) {
    saveTasks(tasks.filter(t => t.id !== id))
  }

  async function fetchAll() {
    setLoading(true)
    await Promise.all([fetchWeather(), fetchCrypto(), fetchNews(), fetchQuote(), fetchGold()])
    setLoading(false)
  }

  async function fetchWeather() {
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
      )
      const { latitude: lat, longitude: lon } = pos.coords
      const [wRes, gRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`),
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
      ])
      const w = await wRes.json(), g = await gRes.json()
      const code = w.current?.weather_code || 0
      const desc = code===0?'Clear sky':code<10?'Mainly clear':code<30?'Partly cloudy':code<50?'Cloudy':code<70?'Drizzle':code<80?'Rain':code<90?'Showers':'Thunderstorm'
      setWeather({
        temp: Math.round(w.current?.temperature_2m||0),
        feels: Math.round(w.current?.apparent_temperature||0),
        humidity: w.current?.relative_humidity_2m||0,
        wind: Math.round(w.current?.wind_speed_10m||0),
        desc, icon: W_ICONS[desc]||'🌡️',
        city: g.address?.city||g.address?.town||g.address?.village||g.address?.state||'Your location',
      })
    } catch { setWeather(null) }
  }

  async function fetchCrypto() {
    try {
      const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=inr&include_24hr_change=true', { signal: AbortSignal.timeout(10000) })
      const d = await r.json()
      setCrypto({
        btc: Math.round(d.bitcoin?.inr||0), eth: Math.round(d.ethereum?.inr||0), sol: Math.round(d.solana?.inr||0),
        btcChange: +(d.bitcoin?.inr_24h_change||0).toFixed(2),
        ethChange: +(d.ethereum?.inr_24h_change||0).toFixed(2),
        solChange: +(d.solana?.inr_24h_change||0).toFixed(2),
      })
    } catch {
      try {
        const r = await fetch('https://api.coincap.io/v2/assets?ids=bitcoin,ethereum,solana', { signal: AbortSignal.timeout(8000) })
        const d = await r.json()
        const byId = Object.fromEntries((d.data||[]).map((x:any)=>[x.id,x]))
        setCrypto({
          btc: Math.round(+(byId.bitcoin?.priceUsd||0)*83),
          eth: Math.round(+(byId.ethereum?.priceUsd||0)*83),
          sol: Math.round(+(byId.solana?.priceUsd||0)*83),
          btcChange: +(byId.bitcoin?.changePercent24Hr||0).toFixed(2),
          ethChange: +(byId.ethereum?.changePercent24Hr||0).toFixed(2),
          solChange: +(byId.solana?.changePercent24Hr||0).toFixed(2),
        })
      } catch { setCrypto(null) }
    }
  }

  async function fetchNews() {
    try {
      const r = await fetch('https://gnews.io/api/v4/top-headlines?country=in&lang=en&max=8&token=public', { signal: AbortSignal.timeout(8000) })
      if (r.ok) {
        const d = await r.json()
        setNews((d.articles||[]).slice(0,6).map((a:any)=>({ title: a.title, url: a.url, source: a.source?.name||'News' })))
        return
      }
    } catch {}
    try {
      const r = await fetch('https://api.currentsapi.services/v1/latest-news?language=en&country=IN', { signal: AbortSignal.timeout(8000) })
      if (r.ok) {
        const d = await r.json()
        setNews((d.news||[]).slice(0,6).map((a:any)=>({ title: a.title, url: a.url, source: a.author||'News' })))
      }
    } catch { setNews([]) }
  }

  async function fetchGold() {
    // Chain of free gold APIs — try each until one works
    // L1: goldprice.org (most reliable, real Indian market rates)
    try {
      const r = await fetch('https://data-asg.goldprice.org/dbXRates/INR', { 
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      if (r.ok) {
        const d = await r.json()
        const xauPrice = d.items?.[0]?.xauPrice || 0
        const xagPrice = d.items?.[0]?.xagPrice || 0
        const chg = d.items?.[0]?.xauChg || 0
        const perGram24k = Math.round(xauPrice / 31.1035)
        const perGram22k = Math.round(perGram24k * 22 / 24)
        const silverPerGram = Math.round(xagPrice / 31.1035)
        if (perGram24k > 4000) {
          setGold({ gold24k: perGram24k, gold22k: perGram22k, silver: silverPerGram, change: parseFloat(chg)||0, silverChange: 0 })
          return
        }
      }
    } catch {}

    // L2: metals.live (free, no key)
    try {
      const r = await fetch('https://metals.live/api/spot', { signal: AbortSignal.timeout(8000) })
      if (r.ok) {
        const d = await r.json()
        const goldUsd = d.gold || 3200
        const silverUsd = d.silver || 32
        // Get USD→INR rate
        const fxR = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { signal: AbortSignal.timeout(5000) })
        const fxD = await fxR.json()
        const usdInr = fxD.rates?.INR || 84
        const perGram24k = Math.round((goldUsd / 31.1035) * usdInr)
        const perGram22k = Math.round(perGram24k * 22 / 24)
        const silverPerGram = Math.round((silverUsd / 31.1035) * usdInr)
        if (perGram24k > 4000) {
          setGold({ gold24k: perGram24k, gold22k: perGram22k, silver: silverPerGram, change: 0, silverChange: 0 })
          return
        }
      }
    } catch {}

    // L3: Use live forex + gold spot price calculation
    try {
      const [fxRes, goldRes] = await Promise.all([
        fetch('https://api.exchangerate-api.com/v4/latest/USD', { signal: AbortSignal.timeout(6000) }),
        fetch('https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=2d', { signal: AbortSignal.timeout(6000) })
      ])
      const fxD = await fxRes.json()
      const goldD = await goldRes.json()
      const usdInr = fxD.rates?.INR || 84
      const goldUsdOz = goldD.chart?.result?.[0]?.meta?.regularMarketPrice || 3200
      const perGram24k = Math.round((goldUsdOz / 31.1035) * usdInr)
      const perGram22k = Math.round(perGram24k * 22 / 24)
      const silverPerGram = Math.round((32 / 31.1035) * usdInr)
      setGold({ gold24k: perGram24k, gold22k: perGram22k, silver: silverPerGram, change: 0, silverChange: 0 })
    } catch {}
  }

  async function fetchQuote() {
    const quotes = [
      "Karo ya mat karo, koshish jaisi koi cheez nahi. — Yoda (Hindi remix)",
      "Kal ke baare mein socho, par aaj kaam karo. — JARVIS",
      "Har subah ek nayi shuruat hai. Waste mat karo.",
      "Code karo, seekho, grow karo. Repeat.",
      "Problems nahi, challenges hain. Solve karo.",
      "Chota step bhi progress hai. Chalo bhai.",
      "Ek kaam achi tarah se karo — baaki khud ho jaayega.",
    ]
    setQuote(quotes[new Date().getDay() % quotes.length])
  }

  const h = time.getHours()
  const greeting = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : h < 21 ? 'Good Evening' : 'Good Night'
  const pendingTasks = tasks.filter(t => !t.done).length
  const userName = typeof window !== 'undefined' ? (() => { try { return JSON.parse(localStorage.getItem('jarvis_profile')||'{}').name||'Bhai' } catch { return 'Bhai' } })() : 'Bhai'

  const S = {
    page: { minHeight:'100vh', height:'100vh', overflowY:'auto', background:'var(--bg)', color:'var(--text)', fontFamily:'inherit', WebkitOverflowScrolling:'touch' } as React.CSSProperties,
    header: { padding:'20px 16px 12px', background:'linear-gradient(135deg, var(--card) 0%, var(--bg) 100%)', borderBottom:'1px solid var(--border)' } as React.CSSProperties,
    card: { background:'var(--card)', border:'1px solid var(--border)', borderRadius:'16px', padding:'16px', marginBottom:'12px' } as React.CSSProperties,
    tabs: { display:'flex', gap:'8px', padding:'12px 16px', borderBottom:'1px solid var(--border)' } as React.CSSProperties,
    tab: (active:boolean) => ({ padding:'8px 16px', borderRadius:'20px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:600, background: active ? 'var(--accent)' : 'var(--card)', color: active ? '#000' : 'var(--text)' } as React.CSSProperties),
    body: { padding:'16px', maxWidth:'600px', margin:'0 auto' } as React.CSSProperties,
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:800 }}>{greeting}, {userName}! 👋</div>
            <div style={{ fontSize:'13px', color:'var(--dim)', marginTop:'2px' }}>
              {time.toLocaleDateString('hi-IN', { weekday:'long', day:'numeric', month:'long' })} · {time.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
            </div>
          </div>
          <button onClick={fetchAll} style={{ background:'var(--accent)', border:'none', borderRadius:'12px', padding:'8px 14px', color:'#000', fontWeight:700, cursor:'pointer', fontSize:'13px' }}>
            {loading ? '⏳' : '🔄 Refresh'}
          </button>
        </div>
        {/* Quick stats */}
        <div style={{ display:'flex', gap:'8px', marginTop:'12px', flexWrap:'wrap' }}>
          {weather && <div style={{ background:'rgba(0,229,255,.1)', border:'1px solid rgba(0,229,255,.2)', borderRadius:'10px', padding:'6px 12px', fontSize:'13px' }}>{weather.icon} {weather.temp}°C · {weather.city}</div>}
          {pendingTasks > 0 && <div style={{ background:'rgba(255,200,0,.1)', border:'1px solid rgba(255,200,0,.2)', borderRadius:'10px', padding:'6px 12px', fontSize:'13px' }}>📋 {pendingTasks} kaam baaki</div>}
          {crypto && <div style={{ background: crypto.btcChange >= 0 ? 'rgba(0,255,136,.1)' : 'rgba(255,68,68,.1)', border:`1px solid ${crypto.btcChange>=0?'rgba(0,255,136,.2)':'rgba(255,68,68,.2)'}`, borderRadius:'10px', padding:'6px 12px', fontSize:'13px' }}>₿ {crypto.btcChange >= 0 ? '↑' : '↓'} {Math.abs(crypto.btcChange)}%</div>}
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {(['overview','tasks','news'] as const).map(t => (
          <button key={t} style={S.tab(tab===t)} onClick={() => setTab(t)}>
            {t==='overview'?'🌅 Overview':t==='tasks'?`📋 Tasks ${pendingTasks>0?`(${pendingTasks})`:''}` :'📰 News'}
          </button>
        ))}
      </div>

      <div style={S.body}>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && <>

          {/* Quote */}
          {quote && (
            <div style={{ ...S.card, background:'linear-gradient(135deg, rgba(0,229,255,.08), rgba(0,255,136,.05))', borderColor:'rgba(0,229,255,.2)', textAlign:'center' }}>
              <div style={{ fontSize:'20px', marginBottom:'8px' }}>💡</div>
              <div style={{ fontSize:'14px', fontStyle:'italic', lineHeight:1.6, color:'var(--text)' }}>"{quote}"</div>
            </div>
          )}

          {/* Weather */}
          {weather ? (
            <div style={S.card}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:'12px', color:'var(--dim)', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'1px' }}>Weather · {weather.city}</div>
                  <div style={{ fontSize:'36px', fontWeight:800 }}>{weather.icon} {weather.temp}°C</div>
                  <div style={{ fontSize:'13px', color:'var(--dim)', marginTop:'4px' }}>{weather.desc} · Feels {weather.feels}°C</div>
                </div>
                <div style={{ textAlign:'right', fontSize:'13px', color:'var(--dim)' }}>
                  <div>💧 {weather.humidity}%</div>
                  <div>💨 {weather.wind} km/h</div>
                </div>
              </div>
            </div>
          ) : loading ? (
            <div style={S.card}><div style={{ color:'var(--dim)', fontSize:'13px' }}>🌤️ Weather load ho raha hai...</div></div>
          ) : (
            <div style={S.card}><div style={{ color:'var(--dim)', fontSize:'13px' }}>🌤️ Weather nahi mila — location permission allow karo</div></div>
          )}

          {/* Crypto */}
          {crypto ? (
            <div style={S.card}>
              <div style={{ fontSize:'12px', color:'var(--dim)', marginBottom:'12px', textTransform:'uppercase', letterSpacing:'1px' }}>Crypto (INR)</div>
              {[
                { name:'Bitcoin', sym:'₿', val:crypto.btc, change:crypto.btcChange },
                { name:'Ethereum', sym:'Ξ', val:crypto.eth, change:crypto.ethChange },
                { name:'Solana', sym:'◎', val:crypto.sol, change:crypto.solChange },
              ].map(c => (
                <div key={c.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                  <div style={{ fontWeight:600, fontSize:'14px' }}>{c.sym} {c.name}</div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontWeight:700, fontSize:'14px' }}>₹{c.val.toLocaleString('en-IN')}</div>
                    <div style={{ fontSize:'12px', color: c.change >= 0 ? '#00ff88' : '#ff4444' }}>
                      {c.change >= 0 ? '↑' : '↓'} {Math.abs(c.change)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : loading && <div style={S.card}><div style={{ color:'var(--dim)', fontSize:'13px' }}>₿ Crypto load ho raha hai...</div></div>}

          {/* Gold & Silver */}
          {gold && (
            <div style={S.card}>
              <div style={{ fontSize:'12px', color:'var(--dim)', marginBottom:'12px', textTransform:'uppercase', letterSpacing:'1px' }}>Gold & Silver (INR)</div>
              {[
                { name:'Gold 24K', icon:'🥇', val:gold.gold24k, val10:gold.gold24k*10, change:gold.change, color:'#FFD700' },
                { name:'Gold 22K', icon:'💛', val:gold.gold22k, val10:gold.gold22k*10, change:gold.change, color:'#FFC000' },
                { name:'Silver', icon:'🥈', val:gold.silver, val10:gold.silver*10, change:gold.silverChange||0, color:'#C0C0C0' },
              ].map(g => (
                <div key={g.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:'14px' }}>{g.icon} {g.name}</div>
                    <div style={{ fontSize:'12px', color:'var(--dim)' }}>10g = ₹{(g.val10).toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontWeight:700, fontSize:'15px' }}>₹{g.val.toLocaleString('en-IN')}</div>
                    <div style={{ fontSize:'12px', color: g.change >= 0 ? '#00ff88' : '#ff4444', fontWeight:600 }}>
                      {g.change >= 0 ? '↑' : '↓'} {Math.abs(g.change).toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tasks preview */}
          {tasks.filter(t=>!t.done).length > 0 && (
            <div style={S.card}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px' }}>
                <div style={{ fontSize:'12px', color:'var(--dim)', textTransform:'uppercase', letterSpacing:'1px' }}>Aaj Karna Hai</div>
                <button onClick={()=>setTab('tasks')} style={{ background:'none', border:'none', color:'var(--accent)', fontSize:'12px', cursor:'pointer' }}>Sab dekho →</button>
              </div>
              {tasks.filter(t=>!t.done).slice(0,3).map(t => (
                <div key={t.id} style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                  <div style={{ width:'8px', height:'8px', borderRadius:'50%', background: t.priority==='high'?'#ff4444':'var(--accent)', flexShrink:0 }}/>
                  <div style={{ fontSize:'13px', flex:1 }}>{t.text}</div>
                  <button onClick={()=>toggleTask(t.id)} style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'6px', padding:'2px 8px', fontSize:'11px', cursor:'pointer', color:'var(--dim)' }}>Done</button>
                </div>
              ))}
            </div>
          )}
        </>}

        {/* TASKS TAB */}
        {tab === 'tasks' && <>
          <div style={S.card}>
            <div style={{ display:'flex', gap:'8px' }}>
              <input value={newTask} onChange={e=>setNewTask(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&addTask()}
                placeholder="Kya karna hai aaj? (urgent/important likho for red)"
                style={{ flex:1, padding:'10px 14px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'10px', color:'var(--text)', fontSize:'13px' }} />
              <button onClick={addTask} style={{ padding:'10px 16px', background:'var(--accent)', border:'none', borderRadius:'10px', color:'#000', fontWeight:700, cursor:'pointer' }}>+</button>
            </div>
          </div>
          {tasks.length === 0 && <div style={{ textAlign:'center', color:'var(--dim)', padding:'40px 0', fontSize:'14px' }}>Koi kaam nahi! Mast hai 😎</div>}
          {['high','medium','low'].map(pri =>
            tasks.filter(t=>t.priority===pri).length > 0 && (
              <div key={pri}>
                <div style={{ fontSize:'11px', color:'var(--dim)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'6px' }}>
                  {pri==='high'?'🔴 Urgent':pri==='medium'?'🟡 Normal':'⚪ Later'}
                </div>
                {tasks.filter(t=>t.priority===pri).map(t => (
                  <div key={t.id} style={{ ...S.card, padding:'12px 16px', display:'flex', alignItems:'center', gap:'12px', opacity:t.done?0.5:1, marginBottom:'8px' }}>
                    <input type="checkbox" checked={t.done} onChange={()=>toggleTask(t.id)} style={{ width:'18px', height:'18px', cursor:'pointer', accentColor:'var(--accent)' }} />
                    <div style={{ flex:1, fontSize:'14px', textDecoration:t.done?'line-through':'none' }}>{t.text}</div>
                    <button onClick={()=>deleteTask(t.id)} style={{ background:'none', border:'none', color:'var(--dim)', cursor:'pointer', fontSize:'16px' }}>×</button>
                  </div>
                ))}
              </div>
            )
          )}
          {tasks.filter(t=>t.done).length > 0 && (
            <button onClick={()=>saveTasks(tasks.filter(t=>!t.done))} style={{ width:'100%', padding:'10px', background:'none', border:'1px solid var(--border)', borderRadius:'10px', color:'var(--dim)', cursor:'pointer', fontSize:'13px' }}>
              🗑️ Clear {tasks.filter(t=>t.done).length} completed tasks
            </button>
          )}
        </>}

        {/* NEWS TAB */}
        {tab === 'news' && <>
          {news.length === 0 && loading && <div style={{ textAlign:'center', color:'var(--dim)', padding:'40px', fontSize:'14px' }}>📰 News load ho raha hai...</div>}
          {news.length === 0 && !loading && <div style={{ textAlign:'center', color:'var(--dim)', padding:'40px', fontSize:'14px' }}>📰 News nahi mili. Refresh karo ya internet check karo.</div>}
          {news.map((n, i) => (
            <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration:'none', display:'block' }}>
              <div style={{ ...S.card, ':hover':{ borderColor:'var(--accent)' } } as any}>
                <div style={{ fontSize:'11px', color:'var(--accent)', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'1px' }}>{n.source}</div>
                <div style={{ fontSize:'14px', lineHeight:1.5, color:'var(--text)', fontWeight:500 }}>{n.title}</div>
                <div style={{ fontSize:'12px', color:'var(--dim)', marginTop:'6px' }}>Read more →</div>
              </div>
            </a>
          ))}
        </>}

        <div style={{ height:'20px' }}/>
      </div>
    </div>
  )
}
