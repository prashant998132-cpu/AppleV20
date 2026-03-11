'use client'
// app/briefing/page.tsx — JARVIS Morning Briefing v2
// v16 Gold: GPS Weather + BTC/ETH/SOL INR + NASA APOD + India News
// All Zero Vercel: direct client-side API calls

import { useState, useEffect } from 'react'
import BottomNav from '../../components/shared/BottomNav'

interface WeatherData { temp: number; desc: string; humidity: number; city: string; wind: number }
interface CryptoData { btc: number; eth: number; sol: number; btcChange: number; ethChange: number }
interface NasaData { title: string; url: string; explanation: string; mediaType: string }
interface NewsItem { title: string; imageUrl?: string; readMoreUrl: string }

export default function BriefingPage() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [crypto, setCrypto] = useState<CryptoData | null>(null)
  const [nasa, setNasa] = useState<NasaData | null>(null)
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState({ weather: true, crypto: true, nasa: true, news: true })
  const [time, setTime] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setRefreshing(true)
    await Promise.all([fetchWeather(), fetchCrypto(), fetchNasa(), fetchNews()])
    setRefreshing(false)
  }

  const fetchWeather = async () => {
    setLoading(p => ({ ...p, weather: true }))
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
      )
      const { latitude: lat, longitude: lon } = pos.coords
      const [weatherRes, geoRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`),
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
      ])
      const w = await weatherRes.json()
      const g = await geoRes.json()
      const code = w.current?.weather_code || 0
      const desc = code === 0 ? 'Clear sky' : code < 10 ? 'Mainly clear' : code < 30 ? 'Partly cloudy' : code < 50 ? 'Cloudy' : code < 70 ? 'Drizzle' : code < 80 ? 'Rain' : code < 90 ? 'Showers' : 'Thunderstorm'
      setWeather({
        temp: Math.round(w.current?.temperature_2m || 0),
        humidity: w.current?.relative_humidity_2m || 0,
        wind: Math.round(w.current?.wind_speed_10m || 0),
        desc,
        city: g.address?.city || g.address?.town || g.address?.village || g.address?.state || 'Unknown',
      })
    } catch { setWeather(null) }
    setLoading(p => ({ ...p, weather: false }))
  }

  const fetchCrypto = async () => {
    setLoading(p => ({ ...p, crypto: true }))
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=inr&include_24hr_change=true',
        { signal: AbortSignal.timeout(10000) }
      )
      const data = await res.json()
      setCrypto({
        btc: Math.round(data.bitcoin?.inr || 0),
        eth: Math.round(data.ethereum?.inr || 0),
        sol: Math.round(data.solana?.inr || 0),
        btcChange: data.bitcoin?.inr_24h_change || 0,
        ethChange: data.ethereum?.inr_24h_change || 0,
      })
    } catch {
      // Fallback: CoinCap
      try {
        const r = await fetch('https://api.coincap.io/v2/assets?ids=bitcoin,ethereum,solana&limit=3', { signal: AbortSignal.timeout(8000) })
        const d = await r.json()
        const a: Record<string, any> = {}
        d.data?.forEach((x: any) => { a[x.id] = x })
        const rate = 83.5 // approx INR/USD
        setCrypto({ btc: Math.round((a.bitcoin?.priceUsd || 0) * rate), eth: Math.round((a.ethereum?.priceUsd || 0) * rate), sol: Math.round((a.solana?.priceUsd || 0) * rate), btcChange: parseFloat(a.bitcoin?.changePercent24Hr || '0'), ethChange: parseFloat(a.ethereum?.changePercent24Hr || '0') })
      } catch { setCrypto(null) }
    }
    setLoading(p => ({ ...p, crypto: false }))
  }

  const fetchNasa = async () => {
    setLoading(p => ({ ...p, nasa: true }))
    try {
      const nasaKey = typeof window !== 'undefined' ? localStorage.getItem('jarvis_key_NASA_API_KEY') || 'DEMO_KEY' : 'DEMO_KEY'
      const res = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${nasaKey}`, { signal: AbortSignal.timeout(12000) })
      const d = await res.json()
      setNasa({ title: d.title, url: d.url, explanation: d.explanation?.slice(0, 280), mediaType: d.media_type })
    } catch { setNasa(null) }
    setLoading(p => ({ ...p, nasa: false }))
  }

  const fetchNews = async () => {
    setLoading(p => ({ ...p, news: true }))
    try {
      // Inshorts India news (unofficial, category=india)
      const res = await fetch('https://inshortsapi.vercel.app/news?category=india', { signal: AbortSignal.timeout(10000) })
      const d = await res.json()
      setNews((d.data || []).slice(0, 5).map((n: any) => ({ title: n.title, imageUrl: n.imageUrl, readMoreUrl: n.readMoreUrl })))
    } catch {
      // Fallback: NewsData.io free tier
      try {
        const ndKey = typeof window !== 'undefined' ? localStorage.getItem('jarvis_key_NEWSDATA_API_KEY') : null
        if (ndKey) {
          const r = await fetch(`https://newsdata.io/api/1/news?apikey=${ndKey}&country=in&language=hi,en&size=5`, { signal: AbortSignal.timeout(10000) })
          const d = await r.json()
          setNews((d.results || []).slice(0, 5).map((n: any) => ({ title: n.title, imageUrl: n.image_url, readMoreUrl: n.link })))
        } else { setNews([]) }
      } catch { setNews([]) }
    }
    setLoading(p => ({ ...p, news: false }))
  }

  const S: Record<string, React.CSSProperties> = {
    page:    { minHeight: '100vh', background: '#090d18', color: 'var(--text)', paddingBottom: 80 },
    card:    { margin: '0 12px 14px', padding: '14px 16px', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14 },
    label:   { fontSize: 9, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 8 },
    val:     { fontSize: 28, fontWeight: 700, color: 'var(--text)' },
    sub:     { fontSize: 11, color: 'var(--text-faint)', marginTop: 2 },
    chip:    { display: 'inline-block', padding: '2px 8px', borderRadius: 20, background: 'rgba(0,229,255,.08)', border: '1px solid rgba(0,229,255,.12)', fontSize: 10, color: '#00e5ff', marginRight: 6 },
    divider: { height: 1, background: 'rgba(255,255,255,.05)', margin: '10px 0' },
  }

  const timeStr = time.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })
  const dateStr = time.toLocaleDateString('hi-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  const hour = time.getHours()
  const greeting = hour < 12 ? 'Suprabhat' : hour < 17 ? 'Namaskar' : hour < 21 ? 'Shubh Sandhya' : 'Shubh Ratri'
  const tempColor = (weather?.temp || 25) > 35 ? '#ff6b6b' : (weather?.temp || 25) < 15 ? '#6bb5ff' : '#00e5ff'

  const Spinner = () => <div style={{ width: 16, height: 16, border: '2px solid rgba(0,229,255,.2)', borderTopColor: '#00e5ff', borderRadius: '50%', animation: 'spin .8s linear infinite', display: 'inline-block', verticalAlign: 'middle' }}/>

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ padding: '16px 16px 10px', background: 'rgba(9,13,24,.97)', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#00e5ff' }}>{timeStr}</div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 1 }}>{dateStr}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, color: 'var(--text)' }}>🌅 {greeting}</div>
            <button onClick={fetchAll} disabled={refreshing} style={{ marginTop: 4, padding: '3px 10px', borderRadius: 8, background: 'rgba(0,229,255,.08)', border: '1px solid rgba(0,229,255,.15)', color: '#00e5ff', fontSize: 10, cursor: 'pointer' }}>
              {refreshing ? <Spinner/> : '↺'} Refresh
            </button>
          </div>
        </div>
      </div>

      <div style={{ height: 14 }}/>

      {/* Weather */}
      <div style={S.card}>
        <div style={S.label}>🌤️ Aaj Ka Mausam</div>
        {loading.weather ? <Spinner/> : weather ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
            <div>
              <span style={{ ...S.val, color: tempColor }}>{weather.temp}°C</span>
              <div style={S.sub}>{weather.desc} · {weather.city}</div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>💧 {weather.humidity}%</div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>💨 {weather.wind} km/h</div>
            </div>
          </div>
        ) : <div style={{ color: 'var(--text-faint)', fontSize: 12 }}>📡 Location access chahiye — browser permission do</div>}
      </div>

      {/* Crypto */}
      <div style={S.card}>
        <div style={S.label}>₿ Crypto Rates (INR)</div>
        {loading.crypto ? <Spinner/> : crypto ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { name: 'Bitcoin', icon: '₿', val: crypto.btc, chg: crypto.btcChange },
              { name: 'Ethereum', icon: 'Ξ', val: crypto.eth, chg: crypto.ethChange },
              { name: 'Solana', icon: '◎', val: crypto.sol, chg: 0 },
            ].map(coin => (
              <div key={coin.name} style={{ padding: '8px 10px', background: 'rgba(0,0,0,.2)', borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 16 }}>{coin.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>
                  ₹{coin.val >= 100000 ? `${(coin.val / 100000).toFixed(1)}L` : coin.val >= 1000 ? `${(coin.val / 1000).toFixed(0)}K` : coin.val}
                </div>
                {coin.chg !== 0 && (
                  <div style={{ fontSize: 9, color: coin.chg >= 0 ? '#00e676' : '#ff5252', marginTop: 2 }}>
                    {coin.chg >= 0 ? '▲' : '▼'} {Math.abs(coin.chg).toFixed(1)}%
                  </div>
                )}
                <div style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 1 }}>{coin.name}</div>
              </div>
            ))}
          </div>
        ) : <div style={{ color: 'var(--text-faint)', fontSize: 12 }}>CoinGecko unavailable — check internet</div>}
      </div>

      {/* NASA APOD */}
      <div style={S.card}>
        <div style={S.label}>🚀 NASA — Aaj Ka Space Photo</div>
        {loading.nasa ? <Spinner/> : nasa ? (
          <>
            {nasa.mediaType !== 'video' && (
              <img src={nasa.url} alt={nasa.title} style={{ width: '100%', borderRadius: 10, maxHeight: 200, objectFit: 'cover', display: 'block', marginBottom: 10 }} loading="lazy"/>
            )}
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 6 }}>{nasa.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.5 }}>{nasa.explanation}...</div>
            {nasa.mediaType === 'video' && (
              <a href={nasa.url} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 8, padding: '6px 12px', background: 'rgba(0,229,255,.08)', border: '1px solid rgba(0,229,255,.15)', borderRadius: 8, color: '#00e5ff', fontSize: 11, textAlign: 'center', textDecoration: 'none' }}>▶ Watch Video</a>
            )}
          </>
        ) : (
          <div style={{ color: 'var(--text-faint)', fontSize: 12 }}>
            NASA key optional — Settings mein add karo (100 req/hour with key, 30 without)
          </div>
        )}
      </div>

      {/* India News */}
      <div style={S.card}>
        <div style={S.label}>📰 Aaj Ki India News</div>
        {loading.news ? <Spinner/> : news.length > 0 ? (
          news.map((n, i) => (
            <div key={i} style={{ paddingTop: i > 0 ? 10 : 0, marginTop: i > 0 ? 10 : 0, borderTop: i > 0 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
              <a href={n.readMoreUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--text)', textDecoration: 'none', fontSize: 12, lineHeight: 1.5, fontWeight: i === 0 ? 600 : 400 }}>
                {n.title}
              </a>
            </div>
          ))
        ) : (
          <div style={{ color: 'var(--text-faint)', fontSize: 12 }}>
            Settings mein NewsData.io key add karo for backup news.<br/>
            <a href="https://newsdata.io" target="_blank" rel="noreferrer" style={{ color: '#00e5ff' }}>newsdata.io → Free 200/day</a>
          </div>
        )}
      </div>

      <BottomNav active="briefing"/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
