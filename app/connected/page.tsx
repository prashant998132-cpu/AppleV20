'use client'
// app/connected/page.tsx — JARVIS Connected Apps v25
// API key management + free services status
// Jo kisi aur assistant mein nahi — ek jagah sab manage karo

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const KEY_PREFIX = 'jarvis_key_'
const getKey = (id: string) => { try { return localStorage.getItem(KEY_PREFIX + id) || '' } catch { return '' } }

interface AppDef {
  id: string; name: string; icon: string; desc: string; category: string
  type: 'free' | 'apikey'; color: string; keyPlaceholder?: string; keyLink?: string
}

const APPS: AppDef[] = [
  { id:'JIKAN',          name:'MyAnimeList',      icon:'🌸', desc:'Anime search, top charts',           category:'Entertainment', type:'free',   color:'#f472b6' },
  { id:'OPENLIB',        name:'OpenLibrary',      icon:'📚', desc:'Books search & borrow',              category:'Education',     type:'free',   color:'#a78bfa' },
  { id:'DEEZER',         name:'Deezer Music',     icon:'🎵', desc:'Music search, 30s previews',         category:'Music',         type:'free',   color:'#f87171' },
  { id:'GITHUB_PUBLIC',  name:'GitHub (Public)',  icon:'🐙', desc:'Trending, user profiles',            category:'Dev',           type:'free',   color:'#34d399' },
  { id:'COINGECKO',      name:'CoinGecko',        icon:'🪙', desc:'Live crypto prices',                 category:'Finance',       type:'free',   color:'#facc15' },
  { id:'OPENMETEO',      name:'Open-Meteo',       icon:'🌤️', desc:'Weather & 7-day forecast',          category:'Weather',       type:'free',   color:'#38bdf8' },
  { id:'POLLINATIONS',   name:'Pollinations AI',  icon:'🎨', desc:'AI image gen (Flux/SDXL)',           category:'AI',            type:'free',   color:'#e879f9' },
  { id:'WIKIPEDIA',      name:'Wikipedia',        icon:'📖', desc:'Facts, summaries, images',           category:'Knowledge',     type:'free',   color:'#60a5fa' },
  { id:'PUTER',          name:'Puter.js AI',      icon:'🤖', desc:'GPT-4o / Claude via Puter (free)',   category:'AI',            type:'free',   color:'#00e5ff' },
  { id:'GEMINI_API_KEY', name:'Google Gemini',    icon:'✨', desc:'Think/Deep mode AI',                 category:'AI',            type:'apikey', color:'#4ade80', keyPlaceholder:'AIzaSy...', keyLink:'https://aistudio.google.com/app/apikey' },
  { id:'GITHUB_TOKEN',   name:'GitHub (Personal)',icon:'🔑', desc:'Private repos, create issues',       category:'Dev',           type:'apikey', color:'#34d399', keyPlaceholder:'ghp_...',   keyLink:'https://github.com/settings/tokens' },
  { id:'TMDB_API_KEY',   name:'TMDB Movies',      icon:'🎬', desc:'Movies, shows, cast & trailers',     category:'Entertainment', type:'apikey', color:'#f97316', keyPlaceholder:'abc123...', keyLink:'https://www.themoviedb.org/settings/api' },
  { id:'YOUTUBE_API_KEY',name:'YouTube Data',     icon:'▶️', desc:'Video search & channel stats',      category:'Media',         type:'apikey', color:'#f87171', keyPlaceholder:'AIzaSy...', keyLink:'https://console.developers.google.com' },
  { id:'LASTFM_API_KEY', name:'Last.fm Music',    icon:'🎸', desc:'Artist info, top charts',            category:'Music',         type:'apikey', color:'#fb923c', keyPlaceholder:'1a2b3c...', keyLink:'https://www.last.fm/api/account/create' },
  { id:'GUARDIAN_API_KEY',name:'Guardian News',   icon:'📰', desc:'World news, article search',         category:'News',          type:'apikey', color:'#818cf8', keyPlaceholder:'test',      keyLink:'https://open-platform.theguardian.com/access' },
  { id:'OMDB_API_KEY',   name:'OMDB (IMDb)',      icon:'🍿', desc:'Movie ratings, plot, awards',        category:'Entertainment', type:'apikey', color:'#fbbf24', keyPlaceholder:'abc123...', keyLink:'https://www.omdbapi.com/apikey.aspx' },
  { id:'PEXELS_API_KEY', name:'Pexels Photos',    icon:'📷', desc:'HD stock photos',                    category:'Media',         type:'apikey', color:'#6ee7b7', keyPlaceholder:'563492...', keyLink:'https://www.pexels.com/api' },
  { id:'GIPHY_API_KEY',  name:'GIPHY GIFs',       icon:'🎭', desc:'GIF search & trending',              category:'Media',         type:'apikey', color:'#e879f9', keyPlaceholder:'abc123...', keyLink:'https://developers.giphy.com' },
]

const CATS = ['All','AI','Dev','Music','Entertainment','Media','Finance','Education','News','Weather','Knowledge']

function Card({ app }: { app: AppDef }) {
  const [savedKey, setSavedKey] = useState(() => app.type === 'free' ? '1' : getKey(app.id))
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState('')
  const isOn = app.type === 'free' || !!savedKey

  function save() {
    try {
      if (input.trim()) localStorage.setItem(KEY_PREFIX + app.id, input.trim())
      else localStorage.removeItem(KEY_PREFIX + app.id)
      setSavedKey(input.trim())
    } catch {}
    setEditing(false)
    setInput('')
  }

  function del() {
    try { localStorage.removeItem(KEY_PREFIX + app.id) } catch {}
    setSavedKey('')
    setEditing(false)
  }

  return (
    <div style={{ background:'var(--bg-card)', border:`1px solid ${isOn ? app.color+'35':'var(--border)'}`, borderRadius:14, padding:'12px 14px', marginBottom:8 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:22 }}>{app.icon}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' as const }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{app.name}</span>
            <span style={{ fontSize:9, padding:'1px 7px', borderRadius:20, background: isOn?app.color+'20':'var(--bg-surface)', color: isOn?app.color:'var(--text-faint)', fontWeight:700 }}>
              {isOn ? '● Connected' : '○ Not set'}
            </span>
            {app.type === 'free' && <span style={{ fontSize:9, color:'var(--text-faint)' }}>FREE</span>}
          </div>
          <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{app.desc} · {app.category}</div>
        </div>
        {app.type === 'apikey' && (
          <button onClick={() => { setEditing(e => !e); setInput(savedKey) }}
            style={{ padding:'5px 10px', borderRadius:8, background: isOn?'var(--bg-surface)':'var(--accent-bg)', border:`1px solid ${isOn?'var(--border)':'var(--border-acc)'}`, color: isOn?'var(--text-muted)':'var(--accent)', fontSize:11, cursor:'pointer', flexShrink:0 }}>
            {isOn ? '✎ Edit' : '+ Key'}
          </button>
        )}
      </div>

      {editing && (
        <div style={{ marginTop:10, display:'flex', flexDirection:'column' as const, gap:8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder={app.keyPlaceholder || 'API Key...'} type="password"
            style={{ background:'var(--bg-input)', border:'1px solid var(--border-acc)', color:'var(--text)', borderRadius:9, padding:'9px 12px', fontSize:12, width:'100%' }}/>
          <div style={{ display:'flex', gap:7 }}>
            <button onClick={save} style={{ flex:1, padding:'8px', borderRadius:9, background:'var(--accent-bg)', border:'1px solid var(--border-acc)', color:'var(--accent)', fontSize:12, cursor:'pointer', fontWeight:700 }}>✓ Save</button>
            {!!savedKey && <button onClick={del} style={{ padding:'8px 12px', borderRadius:9, background:'rgba(248,113,113,.1)', border:'1px solid rgba(248,113,113,.3)', color:'#f87171', fontSize:12, cursor:'pointer' }}>✕ Remove</button>}
            <button onClick={() => setEditing(false)} style={{ padding:'8px 12px', borderRadius:9, background:'transparent', border:'1px solid var(--border)', color:'var(--text-faint)', fontSize:12, cursor:'pointer' }}>Cancel</button>
          </div>
          {app.keyLink && <a href={app.keyLink} target="_blank" rel="noopener" style={{ fontSize:10, color:'var(--accent)', textDecoration:'none' }}>🔗 Free key yahan se lo →</a>}
        </div>
      )}
    </div>
  )
}

export default function ConnectedPage() {
  const router = useRouter()
  const [cat, setCat] = useState('All')
  const [q, setQ] = useState('')
  const [loaded, setLoaded] = useState(false)
  useEffect(() => setLoaded(true), [])

  const filtered = APPS.filter(a =>
    (cat === 'All' || a.category === cat) &&
    (!q || a.name.toLowerCase().includes(q.toLowerCase()) || a.desc.toLowerCase().includes(q.toLowerCase()))
  )

  const freeCount = APPS.filter(a => a.type === 'free').length
  const keyedCount = loaded ? APPS.filter(a => a.type === 'apikey' && !!getKey(a.id)).length : 0

  return (
    <div style={{ position:'fixed', inset:0, background:'var(--bg)', display:'flex', flexDirection:'column' as const, color:'var(--text)' }}>
      <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', background:'var(--header-bg)', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <button onClick={() => router.push('/')} style={{ background:'none', border:'none', color:'var(--accent)', fontSize:18, cursor:'pointer' }}>←</button>
        <div style={{ fontSize:13, fontWeight:700, letterSpacing:2, fontFamily:"'Space Mono',monospace" }}>CONNECTED APPS</div>
        <div style={{ flex:1 }}/>
        <span style={{ fontSize:10, color:'var(--text-muted)' }}>{freeCount + keyedCount}/{APPS.length}</span>
      </div>

      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        {[{l:'Free APIs',v:freeCount,c:'var(--accent)'},{l:'Keys Added',v:keyedCount,c:'#34d399'},{l:'Can Add',v:APPS.filter(a=>a.type==='apikey').length - keyedCount,c:'#a78bfa'}].map(s=>(
          <div key={s.l} style={{ flex:1, padding:'10px', textAlign:'center' as const, borderRight:'1px solid var(--border)' }}>
            <div style={{ fontSize:16, fontWeight:700, color:s.c as string }}>{s.v}</div>
            <div style={{ fontSize:9, color:'var(--text-faint)' }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ padding:'10px 14px', flexShrink:0 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search apps..."
          style={{ width:'100%', background:'var(--bg-input)', border:'1px solid var(--border)', color:'var(--text)', borderRadius:10, padding:'9px 12px', fontSize:13 }}/>
      </div>

      <div style={{ display:'flex', gap:6, overflowX:'auto', padding:'4px 14px 10px', flexShrink:0, scrollbarWidth:'none' as const }}>
        {CATS.map(c => (
          <button key={c} onClick={() => setCat(c)}
            style={{ padding:'4px 12px', borderRadius:20, border:`1px solid ${cat===c?'var(--border-acc)':'var(--border)'}`, background:cat===c?'var(--accent-bg)':'transparent', color:cat===c?'var(--accent)':'var(--text-muted)', fontSize:11, cursor:'pointer', whiteSpace:'nowrap' as const, flexShrink:0 }}>
            {c}
          </button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'0 14px' }}>
        {filtered.map(a => <Card key={a.id} app={a}/>)}
        <div style={{ margin:'12px 0 20px', padding:'12px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, fontSize:10, color:'var(--text-faint)', lineHeight:1.7 }}>
          🔒 API keys sirf tumhare device pe store hote hain (localStorage). Kahi server pe nahi jaate. Free APIs seedhe kaam karti hain — koi key nahi chahiye.
        </div>
      </div>
    </div>
  )
}
