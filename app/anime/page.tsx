'use client'
// app/anime/page.tsx — JARVIS Anime Hub v24
// Jikan API (MyAnimeList) — No key needed
// Search + Top Anime + Watchlist

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Anime {
  mal_id: number; title: string; title_english?: string
  score?: number; episodes?: number; status?: string
  synopsis?: string; image?: string; url?: string
  genres?: string[]; type?: string; rank?: number; year?: number
}

interface WatchItem {
  mal_id: number; title: string; image?: string
  status: 'watching'|'completed'|'plan'; episode?: number; totalEp?: number
}

const WATCH_KEY = 'jarvis_anime_watch_v1'
const loadWatch = (): WatchItem[] => { try { return JSON.parse(localStorage.getItem(WATCH_KEY)||'[]') } catch { return [] } }
const saveWatch = (w: WatchItem[]) => { try { localStorage.setItem(WATCH_KEY, JSON.stringify(w)) } catch {} }

const STATUS_COLOR = { watching: '#00e5ff', completed: '#34d399', plan: '#a78bfa' }
const STATUS_LABEL = { watching: '▶ Watching', completed: '✓ Completed', plan: '🕐 Plan to Watch' }

function AnimeCard({ a, onAdd }: { a: Anime; onAdd: (anime: Anime, status?: WatchItem['status']) => void }) {
  const [exp, setExp] = useState(false)
  return (
    <div style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      {a.image && <img src={a.image} alt={a.title} style={{ width: 52, height: 74, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} loading="lazy" />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', lineHeight: 1.3 }}>{a.title_english || a.title}</div>
        {a.title_english && a.title !== a.title_english && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.title}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' as const }}>
          {a.score && <span style={{ fontSize: 10, color: '#facc15' }}>⭐ {a.score}</span>}
          {a.episodes && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.episodes} ep</span>}
          {a.type && <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{a.type}</span>}
          {a.status && <span style={{ fontSize: 10, color: a.status === 'Currently Airing' ? '#34d399' : 'var(--text-faint)' }}>{a.status}</span>}
        </div>
        {a.genres && <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' as const }}>
          {a.genres.slice(0, 3).map(g => <span key={g} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 6, background: 'var(--accent-dim)', color: 'var(--text-muted)' }}>{g}</span>)}
        </div>}
        {a.synopsis && <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.4, overflow: 'hidden', maxHeight: exp ? 'none' : '36px' }}>{a.synopsis}</div>
          <button onClick={() => setExp(p => !p)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 10, cursor: 'pointer', padding: 0 }}>{exp ? 'less' : 'more'}</button>
        </div>}
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <button onClick={() => onAdd(a)} style={{ padding: '4px 10px', borderRadius: 7, background: 'var(--accent-bg)', border: '1px solid var(--border-acc)', color: 'var(--accent)', fontSize: 10, cursor: 'pointer' }}>+ Watchlist</button>
          {a.url && <a href={a.url} target="_blank" rel="noopener" style={{ padding: '4px 10px', borderRadius: 7, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 10, textDecoration: 'none' }}>MAL →</a>}
        </div>
      </div>
    </div>
  )
}

export default function AnimePage() {
  const router = useRouter()
  const [tab, setTab] = useState<'search'|'top'|'watchlist'>('top')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Anime[]>([])
  const [topAnime, setTopAnime] = useState<Anime[]>([])
  const [watchlist, setWatchlist] = useState<WatchItem[]>([])
  const [loading, setLoading] = useState(false)
  const [topLoaded, setTopLoaded] = useState(false)
  const [genre, setGenre] = useState('all')

  useEffect(() => { setWatchlist(loadWatch()) }, [])

  async function fetchTop() {
    if (topLoaded) return
    setLoading(true)
    try {
      const res = await fetch('https://api.jikan.moe/v4/top/anime?limit=20&type=tv', { signal: AbortSignal.timeout(10000) })
      const d = await res.json()
      setTopAnime(d.data?.map((a: any) => ({
        mal_id: a.mal_id, title: a.title, title_english: a.title_english,
        score: a.score, episodes: a.episodes, status: a.status,
        synopsis: a.synopsis?.slice(0, 200), image: a.images?.jpg?.image_url,
        url: a.url, genres: a.genres?.map((g: any) => g.name), type: a.type,
        rank: a.rank, year: a.year,
      })) || [])
      setTopLoaded(true)
    } catch { }
    setLoading(false)
  }

  async function search() {
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=12&sfw=true`, { signal: AbortSignal.timeout(10000) })
      const d = await res.json()
      setResults(d.data?.map((a: any) => ({
        mal_id: a.mal_id, title: a.title, title_english: a.title_english,
        score: a.score, episodes: a.episodes, status: a.status,
        synopsis: a.synopsis?.slice(0, 200), image: a.images?.jpg?.image_url,
        url: a.url, genres: a.genres?.map((g: any) => g.name), type: a.type, year: a.year,
      })) || [])
    } catch { }
    setLoading(false)
  }

  useEffect(() => { if (tab === 'top') fetchTop() }, [tab])

  function addToWatchlist(a: Anime, status: WatchItem['status'] = 'plan') {
    const w = watchlist.filter((x:WatchItem) => x.mal_id !== a.mal_id)
    const upd = [...w, { mal_id: a.mal_id, title: a.title_english || a.title, image: a.image, status, totalEp: a.episodes }]
    setWatchlist(upd); saveWatch(upd)
  }

  function updateStatus(id: number, status: WatchItem['status']) {
    const updated = watchlist.map((w:WatchItem) => w.mal_id === id ? { ...w, status } : w)
    setWatchlist(updated); saveWatch(updated)
  }

  function removeFromList(id: number) {
    const updated = watchlist.filter((w:WatchItem) => w.mal_id !== id)
    setWatchlist(updated); saveWatch(updated)
  }

  const GENRES = ['all', 'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Romance', 'Sci-Fi', 'Thriller']
  const filteredTop = genre === 'all' ? topAnime : topAnime.filter(a => a.genres?.includes(genre))

  const watching = watchlist.filter((w:WatchItem) => w.status === 'watching')
  const completed = watchlist.filter((w:WatchItem) => w.status === 'completed')
  const planned = watchlist.filter((w:WatchItem) => w.status === 'plan')

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column', color: 'var(--text)' }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--header-bg)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 18, cursor: 'pointer' }}>←</button>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2, color: 'var(--text)', fontFamily: "'Space Mono',monospace" }}>ANIME HUB</div>
        <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 2 }}>🌸</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{watchlist.length} saved</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {(['top', 'search', 'watchlist'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '9px', background: tab === t ? 'var(--accent-bg)' : 'transparent', border: 'none', borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent', color: tab === t ? 'var(--accent)' : 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontWeight: tab === t ? 700 : 400, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
            {t === 'top' ? '🏆 Top' : t === 'search' ? '🔍 Search' : `📋 List (${watchlist.length})`}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px' }}>

        {/* TOP ANIME */}
        {tab === 'top' && (
          <>
            {/* Genre filter chips */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '10px 0', flexShrink: 0, scrollbarWidth: 'none' as const }}>
              {GENRES.map(g => (
                <button key={g} onClick={() => setGenre(g)}
                  style={{ padding: '4px 12px', borderRadius: 20, border: `1px solid ${genre === g ? 'var(--border-acc)' : 'var(--border)'}`, background: genre === g ? 'var(--accent-bg)' : 'transparent', color: genre === g ? 'var(--accent)' : 'var(--text-muted)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
                  {g === 'all' ? 'All' : g}
                </button>
              ))}
            </div>
            {loading && <div style={{ textAlign: 'center' as const, padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>🌸 Load ho raha hai...</div>}
            {filteredTop.map((a:Anime, i:number) => <AnimeCard key={i} a={a} onAdd={addToWatchlist} />)}
          </>
        )}

        {/* SEARCH */}
        {tab === 'search' && (
          <div style={{ paddingTop: 12 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
                placeholder="Anime name likho... (e.g. Naruto, AOT)" autoFocus
                style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
              <button onClick={search} disabled={loading}
                style={{ padding: '10px 16px', borderRadius: 10, background: 'var(--accent-bg)', border: '1px solid var(--border-acc)', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>
                {loading ? '...' : '🔍'}
              </button>
            </div>
            {results.length === 0 && !loading && query && <div style={{ textAlign: 'center' as const, padding: '40px 0', color: 'var(--text-muted)' }}>Koi result nahi mila</div>}
            {results.map((a:Anime, i:number) => <AnimeCard key={i} a={a} onAdd={addToWatchlist} />)}
          </div>
        )}

        {/* WATCHLIST */}
        {tab === 'watchlist' && (
          <div style={{ paddingTop: 12 }}>
            {watchlist.length === 0 ? (
              <div style={{ textAlign: 'center' as const, padding: '60px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🌸</div>
                <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 6 }}>Watchlist empty hai</div>
                <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>Top ya Search se anime add karo</div>
              </div>
            ) : (
              [
                { label: '▶ Currently Watching', items: watching, status: 'watching' as const },
                { label: '📋 Plan to Watch', items: planned, status: 'plan' as const },
                { label: '✓ Completed', items: completed, status: 'completed' as const },
              ].map(section => section.items.length > 0 && (
                <div key={section.label}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, marginTop: 12, fontWeight: 600 }}>{section.label}</div>
                  {section.items.map(w => (
                    <div key={w.mal_id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                      {w.image && <img src={w.image} alt={w.title} style={{ width: 40, height: 56, borderRadius: 5, objectFit: 'cover', flexShrink: 0 }} loading="lazy" />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{w.title}</div>
                        {w.totalEp && <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{w.totalEp} episodes</div>}
                        <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                          {(['watching','plan','completed'] as const).map(s => (
                            <button key={s} onClick={() => updateStatus(w.mal_id, s)}
                              style={{ padding: '2px 7px', borderRadius: 6, fontSize: 9, cursor: 'pointer', border: `1px solid ${w.status === s ? STATUS_COLOR[s] + '60' : 'var(--border)'}`, background: w.status === s ? STATUS_COLOR[s] + '18' : 'transparent', color: w.status === s ? STATUS_COLOR[s] : 'var(--text-faint)' }}>
                              {s === 'watching' ? '▶' : s === 'completed' ? '✓' : '🕐'}
                            </button>
                          ))}
                          <button onClick={() => removeFromList(w.mal_id)} style={{ padding: '2px 7px', borderRadius: 6, fontSize: 9, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-faint)', marginLeft: 'auto' }}>✕</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
