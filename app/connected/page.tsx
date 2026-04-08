'use client'
// app/connected/page.tsx — JARVIS Connected Apps v28
// 15 Free APIs + 14 API-Key services — zero cost default
// Upgraded: better UI, stats, tabs, badge system, copy-key feature

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const KEY_PREFIX = 'jarvis_key_'
const getKey = (id: string) => { try { return localStorage.getItem(KEY_PREFIX + id) || '' } catch { return '' } }

interface AppDef {
  id: string; name: string; icon: string; desc: string; category: string
  type: 'free' | 'apikey'; color: string; keyPlaceholder?: string; keyLink?: string
  badge?: string
}

const APPS: AppDef[] = [
  // ── 15 FREE (no key needed) ─────────────────────────────────────────────
  { id:'OPENMETEO',      name:'Open-Meteo',        icon:'🌤️', desc:'Weather & 7-day forecast, global',    category:'Weather',       type:'free',   color:'#38bdf8', badge:'POPULAR' },
  { id:'POLLINATIONS',   name:'Pollinations AI',   icon:'🎨', desc:'AI image gen — Flux, SDXL, GPT-Img',  category:'AI',            type:'free',   color:'#e879f9', badge:'POPULAR' },
  { id:'PUTER',          name:'Puter.js AI',       icon:'🤖', desc:'GPT-4o / Claude fallback (free)',     category:'AI',            type:'free',   color:'#00e5ff' },
  { id:'WIKIPEDIA',      name:'Wikipedia',         icon:'📖', desc:'Facts, summaries, images',            category:'Knowledge',     type:'free',   color:'#60a5fa' },
  { id:'COINGECKO',      name:'CoinGecko',         icon:'🪙', desc:'Live crypto prices, market data',    category:'Finance',       type:'free',   color:'#facc15' },
  { id:'DEEZER',         name:'Deezer Music',      icon:'🎵', desc:'Music search + 30s previews, free',  category:'Music',         type:'free',   color:'#f87171' },
  { id:'GITHUB_PUBLIC',  name:'GitHub Public',     icon:'🐙', desc:'Trending repos, user profiles',      category:'Dev',           type:'free',   color:'#34d399' },
  { id:'OPENLIB',        name:'OpenLibrary',       icon:'📚', desc:'Books search, borrow, covers',       category:'Education',     type:'free',   color:'#a78bfa' },
  { id:'JIKAN',          name:'MyAnimeList',       icon:'🌸', desc:'Anime search, top charts, info',     category:'Entertainment', type:'free',   color:'#f472b6' },
  { id:'OPENTRIVIA',     name:'Open Trivia DB',    icon:'🧠', desc:'10K+ quiz questions — NEET prep!',   category:'Education',     type:'free',   color:'#4ade80', badge:'NEW' },
  { id:'QUOTABLE',       name:'Quotable Quotes',   icon:'💬', desc:'Motivational & wisdom quotes daily', category:'Wellness',      type:'free',   color:'#fb923c', badge:'NEW' },
  { id:'RESTCOUNTRIES',  name:'REST Countries',    icon:'🌍', desc:'Country info, flags, geography',     category:'Knowledge',     type:'free',   color:'#a3e635', badge:'NEW' },
  { id:'NUMBERS_API',    name:'Numbers API',       icon:'🔢', desc:'Math & date facts — NEET ke liye',   category:'Education',     type:'free',   color:'#67e8f9', badge:'NEW' },
  { id:'ANILIST',        name:'AniList GraphQL',   icon:'📺', desc:'Anime/manga API, no key needed',     category:'Entertainment', type:'free',   color:'#818cf8', badge:'NEW' },
  { id:'JOKEAPI',        name:'JokeAPI',           icon:'😂', desc:'Clean jokes, programming humor',     category:'Fun',           type:'free',   color:'#fde047', badge:'NEW' },

  // ── 14 API-KEY services ────────────────────────────────────────────────
  { id:'GROQ_API_KEY',       name:'Groq AI',           icon:'⚡', desc:'Llama 4 Scout — primary AI (fastest)',  category:'AI',          type:'apikey', color:'#f59e0b', keyPlaceholder:'gsk_...',      keyLink:'https://console.groq.com/keys',                      badge:'CORE' },
  { id:'GEMINI_API_KEY',     name:'Google Gemini',     icon:'✨', desc:'Think/Deep mode — Gemini 2.5 Flash',   category:'AI',          type:'apikey', color:'#4ade80', keyPlaceholder:'AIzaSy...',    keyLink:'https://aistudio.google.com/app/apikey',             badge:'CORE' },
  { id:'WOLFRAM_APP_ID',     name:'Wolfram Alpha',     icon:'🧮', desc:'Math, science engine (2K calls/mo free)', category:'Education', type:'apikey', color:'#f97316', keyPlaceholder:'XXXX-XXXXXX', keyLink:'https://developer.wolframalpha.com/portal/myapps',   badge:'NEW' },
  { id:'SERPER_API_KEY',     name:'Serper Search',     icon:'🔍', desc:'Google Search results (2.5K free/mo)', category:'Knowledge',  type:'apikey', color:'#34d399', keyPlaceholder:'abc123...',    keyLink:'https://serper.dev',                                 badge:'NEW' },
  { id:'ELEVENLABS_API_KEY', name:'ElevenLabs TTS',    icon:'🗣️', desc:'AI voice — 10K chars free/month',      category:'AI',          type:'apikey', color:'#c084fc', keyPlaceholder:'sk_...',       keyLink:'https://elevenlabs.io',                              badge:'NEW' },
  { id:'TMDB_API_KEY',       name:'TMDB Movies',       icon:'🎬', desc:'Movies, shows, cast & trailers',       category:'Entertainment', type:'apikey', color:'#fb923c', keyPlaceholder:'abc123...', keyLink:'https://www.themoviedb.org/settings/api' },
  { id:'YOUTUBE_API_KEY',    name:'YouTube Data',      icon:'▶️', desc:'Video search & channel stats',        category:'Media',       type:'apikey', color:'#f87171', keyPlaceholder:'AIzaSy...',    keyLink:'https://console.developers.google.com' },
  { id:'LASTFM_API_KEY',     name:'Last.fm Music',     icon:'🎸', desc:'Artist info, top charts, scrobble',   category:'Music',       type:'apikey', color:'#fb923c', keyPlaceholder:'1a2b3c...',    keyLink:'https://www.last.fm/api/account/create' },
  { id:'GUARDIAN_API_KEY',   name:'Guardian News',     icon:'📰', desc:'World news & article search',         category:'News',        type:'apikey', color:'#818cf8', keyPlaceholder:'test',         keyLink:'https://open-platform.theguardian.com/access' },
  { id:'OMDB_API_KEY',       name:'OMDB (IMDb)',        icon:'🍿', desc:'Movie ratings, plot, awards',          category:'Entertainment', type:'apikey', color:'#fbbf24', keyPlaceholder:'abc123...', keyLink:'https://www.omdbapi.com/apikey.aspx' },
  { id:'PEXELS_API_KEY',     name:'Pexels Photos',     icon:'📷', desc:'HD stock photos, free license',        category:'Media',       type:'apikey', color:'#6ee7b7', keyPlaceholder:'563492...',    keyLink:'https://www.pexels.com/api' },
  { id:'GIPHY_API_KEY',      name:'GIPHY GIFs',        icon:'🎭', desc:'GIF search & trending',               category:'Media',       type:'apikey', color:'#e879f9', keyPlaceholder:'abc123...',    keyLink:'https://developers.giphy.com' },
  { id:'NASA_API_KEY',       name:'NASA APOD',          icon:'🔭', desc:'Space photo of the day (briefing)',   category:'Science',     type:'apikey', color:'#818cf8', keyPlaceholder:'DEMO_KEY',     keyLink:'https://api.nasa.gov' },
  { id:'GITHUB_TOKEN',       name:'GitHub Personal',   icon:'🔑', desc:'Private repos, create issues',        category:'Dev',         type:'apikey', color:'#34d399', keyPlaceholder:'ghp_...',      keyLink:'https://github.com/settings/tokens' },
]

const CATS = ['All','AI','Education','Entertainment','Finance','Music','Media','Dev','News','Weather','Knowledge','Wellness','Fun','Science']

function Card({ app }: { app: AppDef }) {
  const [savedKey, setSavedKey] = useState(() => app.type === 'free' ? '1' : getKey(app.id))
  const [editing, setEditing]   = useState(false)
  const [input, setInput]       = useState('')
  const [copied, setCopied]     = useState(false)
  const isOn = app.type === 'free' || !!savedKey

  function save() {
    const val = input.trim()
    try { if (val) localStorage.setItem(KEY_PREFIX + app.id, val); else localStorage.removeItem(KEY_PREFIX + app.id); setSavedKey(val) } catch {}
    setEditing(false); setInput('')
  }
  function del() { try { localStorage.removeItem(KEY_PREFIX + app.id) } catch {}; setSavedKey(''); setEditing(false) }
  function copyKey() { navigator.clipboard.writeText(savedKey).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),1500)}).catch(()=>{}) }

  const badgeStyle: Record<string,{bg:string;color:string}> = {
    NEW:     { bg:'rgba(74,222,128,.15)',  color:'#4ade80' },
    POPULAR: { bg:'rgba(251,191,36,.15)', color:'#fbbf24' },
    CORE:    { bg:'rgba(0,229,255,.15)',  color:'#00e5ff' },
  }

  return (
    <div style={{
      background: isOn ? `linear-gradient(135deg, var(--bg-card) 60%, ${app.color}0a 100%)` : 'var(--bg-card)',
      border: `1px solid ${isOn ? app.color+'28' : 'var(--border)'}`,
      borderRadius:14, padding:'11px 13px', marginBottom:7, transition:'all .2s',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {/* Icon */}
        <div style={{ width:38, height:38, borderRadius:10, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:19,
          background: isOn ? `${app.color}16` : 'rgba(255,255,255,.04)',
          border:`1px solid ${isOn ? app.color+'28' : 'rgba(255,255,255,.06)'}`,
        }}>{app.icon}</div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' as const, marginBottom:2 }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{app.name}</span>
            {app.badge && <span style={{ fontSize:8, padding:'1px 5px', borderRadius:8, fontWeight:800, letterSpacing:.4, ...badgeStyle[app.badge] }}>{app.badge}</span>}
            <span style={{ fontSize:9, padding:'1px 6px', borderRadius:14, fontWeight:600,
              background: isOn ? `${app.color}14` : 'rgba(255,255,255,.04)',
              color: isOn ? app.color : 'var(--text-faint)',
            }}>
              {app.type==='free' ? '✓ Free' : isOn ? '● Connected' : '○ Not set'}
            </span>
          </div>
          <div style={{ fontSize:10, color:'var(--text-muted)', lineHeight:1.4 }}>{app.desc}</div>
        </div>

        <div style={{ display:'flex', gap:4, flexShrink:0 }}>
          {app.type==='apikey' && savedKey && (
            <button onClick={copyKey} title="Copy key"
              style={{ width:27, height:27, borderRadius:7, background:'rgba(255,255,255,.05)', border:'1px solid var(--border)', color:copied?'#4ade80':'var(--text-muted)', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {copied ? '✓' : '⎘'}
            </button>
          )}
          {app.type==='apikey' && (
            <button onClick={()=>{setEditing(e=>!e); setInput(savedKey)}}
              style={{ padding:'5px 10px', borderRadius:8, fontSize:11, cursor:'pointer',
                background: isOn?'rgba(255,255,255,.04)':'var(--accent-bg)',
                border:`1px solid ${isOn?'var(--border)':'var(--border-acc)'}`,
                color: isOn?'var(--text-muted)':'var(--accent)',
              }}>
              {editing ? '✕' : isOn ? '✎ Edit' : '+ Key'}
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div style={{ marginTop:10, display:'flex', flexDirection:'column' as const, gap:8 }}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&save()}
            placeholder={app.keyPlaceholder||'API Key...'} type="password"
            style={{ background:'var(--bg-input)', border:'1px solid var(--border-acc)', color:'var(--text)', borderRadius:9, padding:'9px 12px', fontSize:12, width:'100%' }}/>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={save} style={{ flex:1, padding:'8px', borderRadius:9, background:'var(--accent-bg)', border:'1px solid var(--border-acc)', color:'var(--accent)', fontSize:12, cursor:'pointer', fontWeight:700 }}>✓ Save</button>
            {!!savedKey && <button onClick={del} style={{ padding:'8px 12px', borderRadius:9, background:'rgba(248,113,113,.08)', border:'1px solid rgba(248,113,113,.2)', color:'#f87171', fontSize:12, cursor:'pointer' }}>✕ Remove</button>}
          </div>
          {app.keyLink && <a href={app.keyLink} target="_blank" rel="noopener" style={{ fontSize:10, color:'var(--accent)', textDecoration:'none' }}>🔗 Free key yahan se lo →</a>}
        </div>
      )}
    </div>
  )
}

export default function ConnectedPage() {
  const router = useRouter()
  const [cat, setCat]   = useState('All')
  const [q, setQ]       = useState('')
  const [tab, setTab]   = useState<'all'|'free'|'keys'>('all')
  const [loaded, setLoaded] = useState(false)
  useEffect(()=>setLoaded(true),[])

  const freeCount  = APPS.filter(a=>a.type==='free').length
  const keyApps    = APPS.filter(a=>a.type==='apikey')
  const keyedCount = loaded ? keyApps.filter(a=>!!getKey(a.id)).length : 0

  const filtered = APPS.filter(a=>{
    if(tab==='free' && a.type!=='free') return false
    if(tab==='keys' && a.type!=='apikey') return false
    if(cat!=='All' && a.category!==cat) return false
    if(q && !a.name.toLowerCase().includes(q.toLowerCase()) && !a.desc.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })

  const freeSec = filtered.filter(a=>a.type==='free')
  const keySec  = filtered.filter(a=>a.type==='apikey')

  return (
    <div style={{ position:'fixed', inset:0, background:'var(--bg)', display:'flex', flexDirection:'column' as const, color:'var(--text)' }}>

      {/* Header */}
      <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', background:'var(--header-bg)', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <button onClick={()=>router.push('/')} style={{ background:'none', border:'none', color:'var(--accent)', fontSize:18, cursor:'pointer' }}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, letterSpacing:2, fontFamily:"'Space Mono',monospace" }}>CONNECTED APPS</div>
          <div style={{ fontSize:9, color:'var(--text-faint)', marginTop:1 }}>6 new services • {APPS.length} total</div>
        </div>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--accent)', background:'var(--accent-bg)', border:'1px solid var(--border-acc)', padding:'3px 9px', borderRadius:20 }}>
          {freeCount+keyedCount}/{APPS.length}
        </span>
      </div>

      {/* Stats */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        {[
          {l:'Free APIs',  v:freeCount,                c:'#4ade80'},
          {l:'Keys Added', v:keyedCount,               c:'var(--accent)'},
          {l:'Can Add',    v:keyApps.length-keyedCount, c:'#a78bfa'},
        ].map(s=>(
          <div key={s.l} style={{ flex:1, padding:'10px', textAlign:'center' as const, borderRight:'1px solid var(--border)' }}>
            <div style={{ fontSize:18, fontWeight:800, color:s.c as string }}>{s.v}</div>
            <div style={{ fontSize:9, color:'var(--text-faint)' }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', padding:'8px 14px', gap:6, flexShrink:0, borderBottom:'1px solid var(--border)' }}>
        {([['all','All','🔮'],['free','Free Only','✓'],['keys','API Keys','🔑']] as const).map(([v,l,ic])=>(
          <button key={v} onClick={()=>setTab(v)} style={{ flex:1, padding:'6px', borderRadius:9, cursor:'pointer', fontWeight:600, fontSize:11,
            background:tab===v?'var(--accent-bg)':'transparent',
            border:`1px solid ${tab===v?'var(--border-acc)':'var(--border)'}`,
            color:tab===v?'var(--accent)':'var(--text-muted)',
          }}>{ic} {l}</button>
        ))}
      </div>

      {/* Search */}
      <div style={{ padding:'8px 14px 4px', flexShrink:0 }}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search apps..."
          style={{ width:'100%', background:'var(--bg-input)', border:'1px solid var(--border)', color:'var(--text)', borderRadius:10, padding:'9px 12px', fontSize:13 }}/>
      </div>

      {/* Category chips */}
      <div style={{ display:'flex', gap:5, overflowX:'auto', padding:'5px 14px 8px', flexShrink:0, scrollbarWidth:'none' as const }}>
        {CATS.map(c=>(
          <button key={c} onClick={()=>setCat(c)} style={{ padding:'3px 10px', borderRadius:20, cursor:'pointer', fontSize:11, whiteSpace:'nowrap' as const, flexShrink:0,
            border:`1px solid ${cat===c?'var(--border-acc)':'var(--border)'}`,
            background:cat===c?'var(--accent-bg)':'transparent',
            color:cat===c?'var(--accent)':'var(--text-muted)',
          }}>{c}</button>
        ))}
      </div>

      {/* List */}
      <div style={{ flex:1, overflowY:'auto', padding:'0 14px' }}>
        {freeSec.length>0 && tab!=='keys' && (
          <div style={{ fontSize:9, fontWeight:700, color:'#4ade80', letterSpacing:1.5, margin:'4px 0 6px', display:'flex', alignItems:'center', gap:6 }}>
            ✓ FREE — NO KEY NEEDED <span style={{ color:'rgba(255,255,255,.2)', fontWeight:400, letterSpacing:0 }}>({freeSec.length})</span>
          </div>
        )}
        {freeSec.map(a=><Card key={a.id} app={a}/>)}

        {keySec.length>0 && tab!=='free' && (
          <div style={{ fontSize:9, fontWeight:700, color:'var(--accent)', letterSpacing:1.5, margin:'10px 0 6px', display:'flex', alignItems:'center', gap:6 }}>
            🔑 API KEYS <span style={{ color:'rgba(255,255,255,.2)', fontWeight:400, letterSpacing:0 }}>({keySec.length})</span>
          </div>
        )}
        {keySec.map(a=><Card key={a.id} app={a}/>)}

        {filtered.length===0 && (
          <div style={{ textAlign:'center' as const, padding:'40px 0', color:'var(--text-faint)' }}>
            <div style={{ fontSize:30, marginBottom:8 }}>🔍</div>
            <div style={{ fontSize:13 }}>Koi nahi mila</div>
          </div>
        )}

        <div style={{ margin:'10px 0 20px', padding:'12px 14px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, fontSize:10, color:'var(--text-faint)', lineHeight:1.8 }}>
          🔒 Keys sirf device pe — server pe nahi jaate.<br/>
          ✅ <strong style={{color:'#4ade80'}}>15 Free APIs</strong> bina key ke kaam karti hain.<br/>
          ⚡ <strong style={{color:'var(--accent)'}}>Groq + Gemini</strong> daalo toh JARVIS 10x fast!
        </div>
      </div>
    </div>
  )
}
