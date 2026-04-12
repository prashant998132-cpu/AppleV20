'use client'
// app/settings/page.tsx — JARVIS Settings v13
// 4 tabs: Profile | Keys | Memory | About
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, setProfile, getAllProfile, addMemory, getImportantMemories, getSetting, setSetting } from '../../lib/db'
import { getSyncStatus, flushSyncQueue, SUPABASE_SETUP_SQL } from '../../lib/providers/syncManager'
import { loadReminders, deleteReminder, editReminder, type Reminder } from '../../lib/reminders'
import { getTheme, toggleTheme, initTheme, type Theme } from '../../lib/theme'

type Tab = 'profile' | 'keys' | 'memory' | 'reminders' | 'ai' | 'about'

// ── KEY CONFIGS ────────────────────────────────────────────
const KEY_GROUPS = [
  {
    label: '🤖 AI Engines', desc: 'Core AI — koi ek toh chahiye',
    keys: [
      { id: 'GROQ_API_KEY',       label: 'Groq',              link: 'https://console.groq.com/keys',            ph: 'gsk_...',         verify: 'groq',       req: true,  note: 'FREE 14,400/day. Flash mode. Fastest.' },
      { id: 'GEMINI_API_KEY',     label: 'Gemini 2.5 Flash',  link: 'https://aistudio.google.com/app/apikey',   ph: 'AIza...',         verify: 'gemini',     req: true,  note: 'FREE 1500/day. Deep mode + tools.' },
      { id: 'OPENROUTER_API_KEY', label: 'OpenRouter',        link: 'https://openrouter.ai/settings/keys',      ph: 'sk-or-...',       verify: 'openrouter', req: false, note: 'Think mode (DeepSeek R1). $0.55/1M.' },
      { id: 'TOGETHER_API_KEY',   label: 'Together AI',       link: 'https://api.together.xyz/settings/api-keys', ph: 'abc...',        verify: null,         req: false, note: '$25 free credit. Llama 4 Scout fallback.' },
    ]
  },
  {
    label: '🎙️ Voice & Audio', desc: 'TTS + Music Generation',
    keys: [
      { id: 'OPENAI_API_KEY',     label: 'OpenAI TTS',        link: 'https://platform.openai.com/api-keys',     ph: 'sk-...',          verify: 'openai',     req: false, note: 'Premium Onyx/Nova voice.' },
      { id: 'HUGGINGFACE_TOKEN',  label: 'HuggingFace',       link: 'https://huggingface.co/settings/tokens',   ph: 'hf_...',          verify: null,         req: false, note: 'FREE — MusicGen, AI models.' },
      { id: 'FREESOUND_API_KEY',  label: 'FreeSound',         link: 'https://freesound.org/apiv2/apply/',       ph: 'abc123...',       verify: null,         req: false, note: 'FREE — Sound effects library.' },
    ]
  },
  {
    label: '🌤️ Weather & News', desc: 'Real-time global data',
    keys: [
      { id: 'OPENWEATHER_API_KEY', label: 'OpenWeatherMap',   link: 'https://openweathermap.org/api',           ph: 'abc123...',       verify: 'weather',    req: false, note: 'FREE 60/min. Weather + AQI.' },
      { id: 'NEWSDATA_API_KEY',    label: 'NewsData.io',       link: 'https://newsdata.io/api-key',              ph: 'pub_...',         verify: null,         req: false, note: 'FREE 200/day. India news.' },
      { id: 'GUARDIAN_API_KEY',    label: 'The Guardian',      link: 'https://open-platform.theguardian.com/access/', ph: 'abc...',    verify: null,         req: false, note: 'FREE 500/day. Quality journalism.' },
    ]
  },
  {
    label: '🎬 Media & Entertainment', desc: 'Movies, Photos, GIFs, Music',
    keys: [
      { id: 'TMDB_API_KEY',        label: 'TMDB (Movies/TV)',  link: 'https://www.themoviedb.org/settings/api',  ph: 'abc123...',       verify: null,         req: false, note: 'FREE unlimited. Best movie DB.' },
      { id: 'OMDB_API_KEY',        label: 'OMDB',              link: 'https://www.omdbapi.com/apikey.aspx',      ph: 'abc123...',       verify: null,         req: false, note: 'FREE 1000/day. IMDB data.' },
      { id: 'GIPHY_API_KEY',       label: 'Giphy GIFs',        link: 'https://developers.giphy.com/dashboard/',  ph: 'abc123...',       verify: null,         req: false, note: 'FREE 1000/day. Animated GIFs.' },
      { id: 'YOUTUBE_API_KEY',     label: 'YouTube Data',      link: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com', ph: 'AIza...', verify: null, req: false, note: 'FREE 100 units/day. Video search.' },
      { id: 'LASTFM_API_KEY',      label: 'Last.fm Music',     link: 'https://www.last.fm/api/account/create',   ph: 'abc123...',       verify: null,         req: false, note: 'FREE. Artist info + charts.' },
      { id: 'SPOTIFY_CLIENT_ID',   label: 'Spotify Client ID', link: 'https://developer.spotify.com/dashboard', ph: 'abc123...',       verify: null,         req: false, note: 'FREE. Music search (no login needed).' },
      { id: 'SPOTIFY_CLIENT_SECRET', label: 'Spotify Secret',  link: 'https://developer.spotify.com/dashboard', ph: 'abc123...',       verify: null,         req: false, note: 'Pair with Client ID above.' },
    ]
  },
  {
    label: '📷 Photos & Images', desc: 'Stock photos, image search',
    keys: [
      { id: 'UNSPLASH_ACCESS_KEY', label: 'Unsplash',          link: 'https://unsplash.com/developers',          ph: 'abc123...',       verify: null,         req: false, note: 'FREE 50/hr. Hi-res photos.' },
      { id: 'PEXELS_API_KEY',      label: 'Pexels',            link: 'https://www.pexels.com/api/',              ph: 'abc123...',       verify: null,         req: false, note: 'FREE unlimited. Photos + videos.' },
      { id: 'PIXABAY_API_KEY',     label: 'Pixabay',           link: 'https://pixabay.com/api/docs/',            ph: 'abc123...',       verify: null,         req: false, note: 'FREE. Photos, vectors, videos.' },
      { id: 'NASA_API_KEY',        label: 'NASA',              link: 'https://api.nasa.gov/',                    ph: 'DEMO_KEY',        verify: null,         req: false, note: 'FREE. APOD, Mars, space data.' },
    ]
  },
  {
    label: '💻 Developer Tools', desc: 'GitHub, code, APIs',
    keys: [
      { id: 'GITHUB_TOKEN',        label: 'GitHub Token',      link: 'https://github.com/settings/tokens',       ph: 'ghp_...',         verify: null,         req: false, note: 'FREE. 5000 req/hr. My repos + issues.' },
    ]
  },
  {
    label: '✅ Productivity Apps', desc: 'Notion, Todoist, Trello, Airtable',
    keys: [
      { id: 'NOTION_API_KEY',      label: 'Notion',            link: 'https://www.notion.so/my-integrations',    ph: 'secret_...',      verify: null,         req: false, note: 'FREE. Search pages + databases.' },
      { id: 'TODOIST_API_TOKEN',   label: 'Todoist',           link: 'https://todoist.com/prefs/integrations',   ph: 'abc123...',       verify: null,         req: false, note: 'FREE. Add + view tasks.' },
      { id: 'TRELLO_API_KEY',      label: 'Trello API Key',    link: 'https://trello.com/app-key',               ph: 'abc123...',       verify: null,         req: false, note: 'FREE. Board + card access.' },
      { id: 'TRELLO_TOKEN',        label: 'Trello Token',      link: 'https://trello.com/app-key',               ph: 'abc123...',       verify: null,         req: false, note: 'Pair with Trello API Key.' },
      { id: 'AIRTABLE_API_KEY',    label: 'Airtable',          link: 'https://airtable.com/create/tokens',       ph: 'pat...',          verify: null,         req: false, note: 'FREE tier. Tables + records.' },
    ]
  },
  {
    label: '☁️ Cloud Sync & Storage', desc: 'Cross-device sync, backups',
    keys: [
      { id: 'SUPABASE_URL',        label: 'Supabase URL',       link: 'https://supabase.com/dashboard',          ph: 'https://xxx.supabase.co', verify: null, req: false, note: 'FREE 500MB. Cross-device chat sync.' },
      { id: 'SUPABASE_ANON_KEY',   label: 'Supabase Anon Key',  link: 'https://supabase.com/dashboard',          ph: 'eyJ...',          verify: null,         req: false, note: 'Pair with URL above.' },
      { id: 'FIREBASE_API_KEY',    label: 'Firebase',           link: 'https://console.firebase.google.com',     ph: 'AIza...',         verify: null,         req: false, note: 'FREE Spark. Realtime sync.' },
      { id: 'FIREBASE_PROJECT_ID', label: 'Firebase Project',   link: 'https://console.firebase.google.com',     ph: 'my-project-id',   verify: null,         req: false, note: 'Firebase project name.' },
    ]
  },
]

// ── Reminders Tab ──────────────────────────────────────────
function RemindersTab() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [editId, setEditId] = useState<string|null>(null)
  const [editMsg, setEditMsg] = useState('')

  useEffect(() => { setReminders(loadReminders()) }, [])

  const del = (id: string) => { deleteReminder(id); setReminders(loadReminders()) }
  const saveEdit = (id: string) => {
    if (!editMsg.trim()) return
    editReminder(id, { message: editMsg.trim() })
    setReminders(loadReminders()); setEditId(null); setEditMsg('')
  }

  const activeRem = reminders.filter(r => !r.fired)
  const REPEAT_LABEL: Record<string, string> = { none: '—', daily: '🔁 Daily', weekly: '📅 Weekly' }

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--border)', marginBottom: 16 }}>
        Yahan tumhare saare reminders hain — edit, delete, manage karo.
      </div>

      {activeRem.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-faint)' }}>
          Koi active reminder nahi.{'\n'}Chat mein bolo: "Kal 8 baje yaad dilao"
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activeRem.map(r => (
            <div key={r.id} style={{ padding: '12px 14px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12 }}>
              {editId === r.id ? (
                <div>
                  <input value={editMsg} onChange={e => setEditMsg(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(0,229,255,.2)', color: 'var(--text)', fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}/>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => saveEdit(r.id)} style={{ flex: 1, padding: '7px', borderRadius: 8, background: 'rgba(0,229,255,.1)', border: '1px solid rgba(0,229,255,.2)', color: '#00e5ff', fontSize: 11, cursor: 'pointer' }}>Save</button>
                    <button onClick={() => setEditId(null)} style={{ flex: 1, padding: '7px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,.08)', color: 'var(--border)', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 13, color: 'var(--text)', flex: 1, lineHeight: 1.4 }}>{r.message}</div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                      <button onClick={() => { setEditId(r.id); setEditMsg(r.message) }} style={{ background: 'none', border: 'none', color: 'var(--border)', fontSize: 13, cursor: 'pointer' }}>✏️</button>
                      <button onClick={() => del(r.id)} style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: 13, cursor: 'pointer' }}>🗑️</button>
                    </div>
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 10, fontSize: 10, color: 'var(--text-faint)' }}>
                    <span>⏰ {new Date(r.fireAt).toLocaleString('hi-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
                    <span>{REPEAT_LABEL[r.repeat || 'none']}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 20, padding: '10px 12px', background: 'rgba(255,171,0,.04)', border: '1px solid rgba(255,171,0,.1)', borderRadius: 10, fontSize: 11, color: '#6a5020', lineHeight: 1.7 }}>
        💡 <b>Recurring reminder set karne ke liye:</b><br/>
        Chat mein bolo: "Har din 7 baje yaad dilao paani peena" → automatically daily reminder set ho jaayega.
      </div>
    </div>
  )
}

// Theme toggle injected via ProfileTab above
function KeysTab() {
  const [vals, setVals] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState('')
  const [testing, setTesting] = useState<Record<string, 'idle' | 'testing' | 'ok' | 'fail'>>({})
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const loaded: Record<string, string> = {}
    KEY_GROUPS.flatMap(g => g.keys).forEach(k => {
      loaded[k.id] = localStorage.getItem(`jarvis_key_${k.id}`) || ''
    })
    setVals(loaded)
  }, [])

  const save = (id: string) => {
    localStorage.setItem(`jarvis_key_${id}`, vals[id] || '')
    setSaved(id)
    setTimeout(() => setSaved(''), 1500)
  }

  const test = async (k: typeof KEY_GROUPS[0]['keys'][0]) => {
    const val = vals[k.id]
    if (!val) return
    setTesting(p => ({ ...p, [k.id]: 'testing' }))
    try {
      let ok = false
      if (k.verify === 'groq') {
        const r = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${val}` }, signal: AbortSignal.timeout(5000) })
        ok = r.status === 200
      } else if (k.verify === 'gemini') {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${val}`, { signal: AbortSignal.timeout(5000) })
        ok = r.status === 200
      } else if (k.verify === 'openrouter') {
        const r = await fetch('https://openrouter.ai/api/v1/models', { headers: { Authorization: `Bearer ${val}` }, signal: AbortSignal.timeout(5000) })
        ok = r.status === 200
      } else if (k.verify === 'openai') {
        const r = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${val}` }, signal: AbortSignal.timeout(5000) })
        ok = r.status === 200
      } else if (k.verify === 'weather') {
        const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Rewa&appid=${val}`, { signal: AbortSignal.timeout(5000) })
        ok = r.status === 200
      }
      setTesting(p => ({ ...p, [k.id]: ok ? 'ok' : 'fail' }))
    } catch { setTesting(p => ({ ...p, [k.id]: 'fail' })) }
    setTimeout(() => setTesting(p => ({ ...p, [k.id]: 'idle' })), 3000)
  }

  return (
    <div>
      {KEY_GROUPS.map(g => (
        <div key={g.label} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#00e5ff', fontWeight: 700, marginBottom: 2 }}>{g.label}</div>
          <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 10 }}>{g.desc}</div>
          {g.keys.map(k => {
            const ts = testing[k.id] || 'idle'
            return (
              <div key={k.id} style={{ marginBottom: 10, padding: '11px 12px', background: '#0c1422', border: `1px solid ${k.req ? 'rgba(0,229,255,.15)' : 'rgba(255,255,255,.05)'}`, borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                  <div>
                    <span style={{ fontSize: 12, color: '#c8dff0', fontWeight: 600 }}>{k.label}</span>
                    {k.req && <span style={{ fontSize: 9, color: '#ffab00', marginLeft: 6, padding: '1px 5px', borderRadius: 3, border: '1px solid rgba(255,171,0,.3)' }}>REQUIRED</span>}
                    {vals[k.id] && <span style={{ fontSize: 9, color: '#00e676', marginLeft: 6 }}>✓</span>}
                  </div>
                  <a href={k.link} target="_blank" rel="noreferrer" style={{ fontSize: 9, color: '#00e5ff', padding: '2px 7px', borderRadius: 5, border: '1px solid rgba(0,229,255,.15)', textDecoration: 'none' }}>Get →</a>
                </div>
                {k.note && <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 7 }}>{k.note}</div>}
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type={showKey[k.id] ? 'text' : 'password'}
                    value={vals[k.id] || ''}
                    placeholder={k.ph}
                    onChange={e => setVals(p => ({ ...p, [k.id]: e.target.value }))}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', color: 'var(--text)', fontSize: 11, outline: 'none', fontFamily: "'Space Mono',monospace" }}
                  />
                  <button onClick={() => setShowKey(p => ({ ...p, [k.id]: !p[k.id] }))}
                    style={{ padding: '8px 8px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,.07)', color: 'var(--border)', fontSize: 13, cursor: 'pointer' }}>
                    {showKey[k.id] ? '🙈' : '👁'}
                  </button>
                  {k.verify && (
                    <button onClick={() => test(k)} disabled={!vals[k.id] || ts === 'testing'}
                      style={{ padding: '8px 10px', borderRadius: 8, fontSize: 11, cursor: 'pointer', border: `1px solid ${ts === 'ok' ? 'rgba(0,230,118,.3)' : ts === 'fail' ? 'rgba(255,80,80,.3)' : 'rgba(167,139,250,.2)'}`, background: ts === 'ok' ? 'rgba(0,230,118,.1)' : ts === 'fail' ? 'rgba(255,80,80,.1)' : 'rgba(167,139,250,.06)', color: ts === 'ok' ? '#00e676' : ts === 'fail' ? '#ff6060' : '#a78bfa', opacity: !vals[k.id] ? 0.4 : 1 }}>
                      {ts === 'testing' ? '...' : ts === 'ok' ? '✅' : ts === 'fail' ? '❌' : 'Test'}
                    </button>
                  )}
                  <button onClick={() => save(k.id)}
                    style={{ padding: '8px 12px', borderRadius: 8, fontSize: 11, cursor: 'pointer', background: saved === k.id ? 'rgba(0,230,118,.12)' : 'rgba(0,229,255,.08)', border: `1px solid ${saved === k.id ? 'rgba(0,230,118,.3)' : 'rgba(0,229,255,.15)'}`, color: saved === k.id ? '#00e676' : '#00e5ff' }}>
                    {saved === k.id ? '✓' : 'Save'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ))}
      <div style={{ padding: '10px 12px', background: 'rgba(255,171,0,.04)', border: '1px solid rgba(255,171,0,.1)', borderRadius: 10, fontSize: 10, color: '#6a5020', lineHeight: 1.7 }}>
        🔒 Keys sirf is device ke browser mein store hote hain. Server pe nahi jaate.
      </div>
    </div>
  )
}

function ProfileTab() {
  const [theme, setTheme] = useState<Theme>(() => typeof window !== 'undefined' ? getTheme() : 'dark')

  const handleToggleTheme = () => {
    const next = toggleTheme()
    setTheme(next)
  }

  useEffect(() => { initTheme() }, [])

  const [p, setP] = useState({ name: '', location: 'Rewa, Madhya Pradesh', goal: '', age: '' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getAllProfile().then(pr => {
      setP({
        name: pr.name || '',
        location: pr.location || 'Rewa, Madhya Pradesh',
        goal: pr.goal || '',
        age: pr.age || '',
      })
    })
  }, [])

  const save = async () => {
    await Promise.all([
      setProfile('name', p.name),
      setProfile('location', p.location),
      setProfile('goal', p.goal),
      setProfile('age', p.age),
    ])
    if (p.name) await addMemory('fact', `Naam: ${p.name}`, 9)
    if (p.location) await addMemory('fact', `Location: ${p.location}`, 9)
    if (p.goal) await addMemory('fact', `Goal: ${p.goal}`, 8)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const fields = [
    { key: 'name',     label: 'Naam',          ph: 'Tumhara naam...',                   icon: '👤' },
    { key: 'location', label: 'Location',       ph: 'Rewa, Madhya Pradesh',               icon: '📍' },
    { key: 'goal',     label: 'Goal / Kaam',    ph: 'Coding, music, design, kuch bhi...',            icon: '🎯' },
    { key: 'age',      label: 'Age',            ph: '18',                                 icon: '🎂' },
  ]

  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 16, lineHeight: 1.6 }}>
        Yeh info JARVIS ko personality deta hai — teri baaton mein context aata hai.
      </div>
      {fields.map(f => (
        <div key={f.key} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: 'var(--border)', marginBottom: 5 }}>{f.icon} {f.label}</div>
          <input
            value={(p as any)[f.key]}
            onChange={e => setP(prev => ({ ...prev, [f.key]: e.target.value }))}
            placeholder={f.ph}
            style={{ width: '100%', padding: '11px 13px', borderRadius: 11, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      ))}
      <button onClick={save}
        style={{ width: '100%', padding: 13, borderRadius: 12, background: saved ? 'rgba(0,230,118,.12)' : 'rgba(0,229,255,.1)', border: `1px solid ${saved ? 'rgba(0,230,118,.3)' : 'rgba(0,229,255,.2)'}`, color: saved ? '#00e676' : '#00e5ff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        {saved ? '✅ Saved!' : 'Save Profile'}
      </button>

      <div style={{ marginTop: 20, padding: '12px 14px', background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>🌗 Theme</div>
            <div style={{ fontSize: 10, color: 'var(--border)', marginTop: 2 }}>Currently: {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}</div>
          </div>
          <button onClick={handleToggleTheme}
            style={{ padding: '8px 16px', borderRadius: 10, background: theme === 'dark' ? 'rgba(255,255,255,.06)' : 'rgba(0,112,192,.1)', border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,.1)' : 'rgba(0,112,192,.3)'}`, color: theme === 'dark' ? 'var(--text)' : '#0070c0', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            {theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode'}
          </button>
        </div>
      </div>
    </div>
  )
}

function MemoryTab() {
  const [mems, setMems] = useState<any[]>([])
  const [editing, setEditing] = useState<number | null>(null)
  const [editVal, setEditVal] = useState('')

  const load = useCallback(() => getImportantMemories(0, 50).then(setMems), [])
  useEffect(() => { load() }, [load])

  const del = async (id: number) => {
    // Use indexedDB directly
    try {
      const dbReq = indexedDB.open('JarvisDB_v3')
      dbReq.onsuccess = () => {
        const tx = dbReq.result.transaction('memory', 'readwrite')
        tx.objectStore('memory').delete(id)
        tx.oncomplete = () => load()
      }
    } catch {}
  }

  const saveEdit = async (id: number) => {
    try {
      const dbReq = indexedDB.open('JarvisDB_v3')
      dbReq.onsuccess = () => {
        const tx = dbReq.result.transaction('memory', 'readwrite')
        const store = tx.objectStore('memory')
        const gr = store.get(id)
        gr.onsuccess = () => {
          if (gr.result) { gr.result.data = editVal; store.put(gr.result) }
          tx.oncomplete = () => { setEditing(null); load() }
        }
      }
    } catch { setEditing(null) }
  }

  const clearAll = async () => {
    if (!confirm('Saari yaadein delete karein?')) return
    try {
      const dbReq = indexedDB.open('JarvisDB_v3')
      dbReq.onsuccess = () => {
        dbReq.result.transaction('memory', 'readwrite').objectStore('memory').clear().onsuccess = () => load()
      }
    } catch {}
  }

  const typeColor: Record<string, string> = {
    fact: '#00e5ff', habit: '#a78bfa', preference: '#00e676',
    correction: '#ff9944', joke: '#ffd700', summary: '#60a0c0',
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>JARVIS ne seekha ({mems.length} memories)</div>
        {mems.length > 0 && (
          <button onClick={clearAll} style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: 11, cursor: 'pointer' }}>Sab hatao</button>
        )}
      </div>

      {mems.length === 0 && (
        <div style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>
          Abhi kuch nahi seekha.<br/>Chat karo — JARVIS khud yaad rakhega. 🧠
        </div>
      )}

      {mems.map(m => (
        <div key={m.id} style={{ marginBottom: 8, padding: '10px 12px', background: '#0c1422', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10 }}>
          {editing === m.id ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={editVal} onChange={e => setEditVal(e.target.value)} autoFocus
                onKeyDown={e => e.key === 'Enter' && saveEdit(m.id)}
                style={{ flex: 1, padding: '6px 9px', borderRadius: 7, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(0,229,255,.2)', color: 'var(--text)', fontSize: 12, outline: 'none' }} />
              <button onClick={() => saveEdit(m.id)} style={{ background: 'rgba(0,229,255,.1)', border: '1px solid rgba(0,229,255,.2)', color: '#00e5ff', borderRadius: 7, padding: '6px 10px', fontSize: 11, cursor: 'pointer' }}>✓</button>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: 14, cursor: 'pointer' }}>✕</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, background: `${typeColor[m.type] || '#4a6080'}18`, color: typeColor[m.type] || '#4a6080', marginRight: 8 }}>{m.type}</span>
                <span style={{ fontSize: 13, color: '#c8dff0' }}>{m.data}</span>
                <div style={{ fontSize: 9, color: '#1a3050', marginTop: 3 }}>importance: {m.importance}/10 · used {m.useCount || 1}×</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => { setEditing(m.id); setEditVal(m.data) }} style={{ background: 'none', border: 'none', color: 'var(--border)', fontSize: 14, cursor: 'pointer' }}>✎</button>
                <button onClick={() => del(m.id)} style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: 14, cursor: 'pointer' }}>×</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Sync Status Component ──────────────────────────────────
function SyncStatus() {
  const [status, setStatus] = useState<{enabled:boolean;queueSize:number;deviceId:string}|null>(null)
  const [showSQL, setShowSQL] = useState(false)
  const [flushing, setFlushing] = useState(false)

  useEffect(() => {
    setStatus(getSyncStatus())
  }, [])

  const flush = async () => {
    setFlushing(true)
    const r = await flushSyncQueue().catch(() => ({flushed:0,failed:0}))
    setStatus(getSyncStatus())
    setFlushing(false)
  }

  if (!status) return null

  return (
    <div style={{ marginTop: 16, padding: '12px 14px', background: status.enabled ? 'rgba(0,230,118,.04)' : 'rgba(255,255,255,.02)', border: `1px solid ${status.enabled ? 'rgba(0,230,118,.15)' : 'rgba(255,255,255,.06)'}`, borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: status.enabled ? '#00e676' : 'var(--border)' }}>
          {status.enabled ? '🟢 Cloud Sync Active' : '⚫ Sync Disabled (local only)'}
        </div>
        {status.enabled && status.queueSize > 0 && (
          <button onClick={flush} disabled={flushing}
            style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(0,230,118,.1)', border: '1px solid rgba(0,230,118,.2)', color: '#00e676', fontSize: 11, cursor: 'pointer' }}>
            {flushing ? '⏳' : `🔄 Flush ${status.queueSize}`}
          </button>
        )}
      </div>
      {status.enabled ? (
        <div style={{ fontSize: 10, color: 'var(--border)', lineHeight: 1.8 }}>
          Queued: {status.queueSize} items · Device: {status.deviceId.slice(0,16)}...
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 8, lineHeight: 1.6 }}>
            Supabase URL + Anon Key daalo Keys tab mein for cross-device sync.
          </div>
          <button onClick={() => setShowSQL(p=>!p)}
            style={{ padding: '6px 12px', borderRadius: 9, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: 'var(--border)', fontSize: 11, cursor: 'pointer' }}>
            {showSQL ? '▲ Hide' : '▼ Show'} Supabase Setup SQL
          </button>
          {showSQL && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 6 }}>Supabase SQL Editor mein paste karo (ek baar):</div>
              <pre style={{ background: 'rgba(0,0,0,.4)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 8, padding: '10px', fontSize: 9, color: '#4a7090', overflowX: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {SUPABASE_SETUP_SQL}
              </pre>
              <button onClick={() => navigator.clipboard?.writeText(SUPABASE_SETUP_SQL).catch(()=>{})}
                style={{ marginTop: 6, padding: '5px 12px', borderRadius: 8, background: 'rgba(0,229,255,.06)', border: '1px solid rgba(0,229,255,.15)', color: '#00e5ff', fontSize: 10, cursor: 'pointer' }}>
                ⎘ Copy SQL
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── AI Behavior Tab ────────────────────────────────────────
function AIBehaviorTab() {
  const CI_KEY = 'jarvis_custom_instructions'
  const TEMP_KEY = 'jarvis_temperature'
  const LANG_KEY = 'jarvis_response_lang'
  const DENSE_KEY = 'jarvis_response_density'

  const [ci, setCi] = useState(() => { try { return localStorage.getItem(CI_KEY) || '' } catch { return '' } })
  const [temp, setTemp] = useState(() => { try { return parseFloat(localStorage.getItem(TEMP_KEY) || '0.7') } catch { return 0.7 } })
  const [lang, setLang] = useState(() => { try { return localStorage.getItem(LANG_KEY) || 'hinglish' } catch { return 'hinglish' } })
  const [density, setDensity] = useState(() => { try { return localStorage.getItem(DENSE_KEY) || 'balanced' } catch { return 'balanced' } })
  const [saved, setSaved] = useState(false)

  function save() {
    try {
      if (ci.trim()) localStorage.setItem(CI_KEY, ci.trim())
      else localStorage.removeItem(CI_KEY)
      localStorage.setItem(TEMP_KEY, String(temp))
      localStorage.setItem(LANG_KEY, lang)
      localStorage.setItem(DENSE_KEY, density)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
  }

  const S: React.CSSProperties = { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: '14px 16px', marginBottom: 12 }
  const lbl: React.CSSProperties = { fontSize: 11, color: '#3a6080', letterSpacing: 1, fontWeight: 700, marginBottom: 8, display: 'block' }
  const inputSt: React.CSSProperties = { width: '100%', background: '#0c1422', border: '1px solid rgba(0,229,255,.15)', color: 'var(--text)', borderRadius: 10, padding: '10px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'vertical' as const, minHeight: 100, lineHeight: 1.5 }

  return (
    <div>
      {/* Custom Instructions — like ChatGPT */}
      <div style={S}>
        <span style={lbl}>📝 CUSTOM INSTRUCTIONS (ChatGPT-style)</span>
        <div style={{ fontSize: 11, color: 'var(--border)', marginBottom: 8 }}>
          Yeh hamesha JARVIS ke saath hoga — apne baare mein batao, kaise jawab chahiye, kya context hai.
        </div>
        <textarea
          value={ci}
          onChange={e => setCi(e.target.value)}
          placeholder="E.g.: Main ek engineering student hoon. Simple Hinglish mein samjhao. Short answers do jab tak na poocha jaaye. Technical topics mein examples dena. Kabhi boring mat rehna."
          style={inputSt}
        />
        <div style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 4 }}>{ci.length}/1000 characters</div>
      </div>

      {/* Temperature — like all AI apps */}
      <div style={S}>
        <span style={lbl}>🌡️ CREATIVITY / TEMPERATURE</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <input type="range" min="0" max="1" step="0.1" value={temp}
            onChange={e => setTemp(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: '#00e5ff' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#00e5ff', minWidth: 28 }}>{temp.toFixed(1)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--border)' }}>
          <span>Precise & Factual</span>
          <span>Balanced</span>
          <span>Creative & Playful</span>
        </div>
      </div>

      {/* Language preference */}
      <div style={S}>
        <span style={lbl}>🗣️ RESPONSE LANGUAGE</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['hinglish', '🇮🇳 Hinglish'], ['hindi', '🇮🇳 Hindi only'], ['english', '🇬🇧 English']].map(([v, l]) => (
            <button key={v} onClick={() => setLang(v)}
              style={{ flex: 1, padding: '8px 4px', borderRadius: 9, border: `1px solid ${lang === v ? 'rgba(0,229,255,.4)' : 'rgba(255,255,255,.06)'}`, background: lang === v ? 'rgba(0,229,255,.08)' : 'transparent', color: lang === v ? '#00e5ff' : 'var(--border)', fontSize: 10, cursor: 'pointer', fontWeight: lang === v ? 700 : 400 }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Response density */}
      <div style={S}>
        <span style={lbl}>📏 RESPONSE LENGTH</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['brief', '⚡ Brief'], ['balanced', '⚖️ Balanced'], ['detailed', '📚 Detailed']].map(([v, l]) => (
            <button key={v} onClick={() => setDensity(v)}
              style={{ flex: 1, padding: '8px 4px', borderRadius: 9, border: `1px solid ${density === v ? 'rgba(0,229,255,.4)' : 'rgba(255,255,255,.06)'}`, background: density === v ? 'rgba(0,229,255,.08)' : 'transparent', color: density === v ? '#00e5ff' : 'var(--border)', fontSize: 10, cursor: 'pointer', fontWeight: density === v ? 700 : 400 }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard shortcuts */}
      <div style={S}>
        <span style={lbl}>⌨️ KEYBOARD SHORTCUTS</span>
        {[
          ['Enter', 'Send message'],
          ['Shift+Enter', 'New line'],
          ['/', 'Slash commands'],
          ['Esc', 'Close panels'],
        ].map(([key, desc]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,.03)', fontSize: 12 }}>
            <span style={{ color: '#3a6080' }}>{desc}</span>
            <code style={{ background: 'rgba(0,229,255,.08)', border: '1px solid rgba(0,229,255,.15)', borderRadius: 5, padding: '1px 7px', color: '#00e5ff', fontSize: 11 }}>{key}</code>
          </div>
        ))}
      </div>

      <button onClick={save}
        style={{ width: '100%', padding: '13px', borderRadius: 12, background: saved ? 'rgba(52,211,153,.15)' : 'rgba(0,229,255,.08)', border: `1px solid ${saved ? 'rgba(52,211,153,.4)' : 'rgba(0,229,255,.25)'}`, color: saved ? '#34d399' : '#00e5ff', fontSize: 14, cursor: 'pointer', fontWeight: 700, marginTop: 4 }}>
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>
    </div>
  )
}

function AboutTab() {
  const [dbStats, setDbStats] = useState({ chats: 0, memories: 0, size: '—' })
  const [exporting, setExporting] = useState(false)
  const [bwStats, setBwStats] = useState({ tts: { browser:0, cache:0, server_stream:0, savedKB:0 }, img: { cache:0, pollinations:0, hf_client:0, savedKB:0 } })

  useEffect(() => {
    try {
      const tts = JSON.parse(localStorage.getItem('jarvis_tts_savings') || '{}')
      const img = JSON.parse(localStorage.getItem('jarvis_img_savings') || '{}')
      setBwStats({ tts, img })
    } catch {}
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const chatCount = await new Promise<number>(res => {
          const r = indexedDB.open('JarvisDB_v3')
          r.onsuccess = () => { res(r.result.transaction('chats','readonly').objectStore('chats').count().result || 0) }
          r.onerror = () => res(0)
        })
        const memCount = await new Promise<number>(res => {
          const r = indexedDB.open('JarvisDB_v3')
          r.onsuccess = () => { res(r.result.transaction('memory','readonly').objectStore('memory').count().result || 0) }
          r.onerror = () => res(0)
        })
        setDbStats({ chats: chatCount, memories: memCount, size: `~${Math.round((chatCount * 0.3 + memCount * 0.1))}KB` })
      } catch {}
    })()
  }, [])

  const exportChats = async () => {
    setExporting(true)
    try {
      const chats = await new Promise<any[]>(res => {
        const r = indexedDB.open('JarvisDB_v3')
        r.onsuccess = () => { const req = r.result.transaction('chats','readonly').objectStore('chats').getAll(); req.onsuccess = () => res(req.result) }
        r.onerror = () => res([])
      })
      const text = chats.map(c => `[${new Date(c.timestamp).toLocaleString('hi-IN')}] ${c.role.toUpperCase()}: ${c.content}`).join('\n\n')
      const blob = new Blob([text], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `jarvis_chats_${Date.now()}.txt`; a.click()
      URL.revokeObjectURL(url)
    } catch {}
    setExporting(false)
  }

  const clearAllData = async () => {
    if (!confirm('SABB kuch delete karein? Profile, memory, chats — sab?')) return
    try { indexedDB.deleteDatabase('JarvisDB_v3') } catch {}
    localStorage.clear()
    alert('Sab clear. Page reload karo.')
    window.location.reload()
  }

  return (
    <div>
      <a href="/system" style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderRadius:12,background:'rgba(0,229,255,.06)',border:'1px solid rgba(0,229,255,.15)',textDecoration:'none',marginBottom:14}}>
        <span style={{fontSize:22}}>⚙️</span>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:'#00e5ff'}}>System Dashboard</div>
          <div style={{fontSize:10,color:'#4a6080'}}>Storage · Credits · Smart Routing · GitHub</div>
        </div>
        <span style={{fontSize:16,color:'#4a6080'}}>↗</span>
      </a>
      {/* Bandwidth Saved Stats */}
      <div style={{ padding: '12px 14px', background: 'rgba(0,230,118,.04)', border: '1px solid rgba(0,230,118,.1)', borderRadius: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#00e676', marginBottom: 8 }}>☁️ Vercel Bandwidth Saved</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 120, padding: '8px 10px', background: 'rgba(0,0,0,.2)', borderRadius: 8 }}>
            <div style={{ fontSize: 9, color: 'var(--text-faint)', marginBottom: 3 }}>🎙️ TTS SAVED</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#00e676' }}>{Math.round((bwStats.tts.savedKB || 0) / 1024 * 10) / 10} MB</div>
            <div style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 2 }}>
              Browser: {bwStats.tts.browser||0} · Cache: {bwStats.tts.cache||0} · Stream: {bwStats.tts.server_stream||0}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 120, padding: '8px 10px', background: 'rgba(0,0,0,.2)', borderRadius: 8 }}>
            <div style={{ fontSize: 9, color: 'var(--text-faint)', marginBottom: 3 }}>🖼️ IMAGE SAVED</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#00e676' }}>{Math.round((bwStats.img.savedKB || 0) / 1024 * 10) / 10} MB</div>
            <div style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 2 }}>
              Pollinations: {bwStats.img.pollinations||0} · Cache: {bwStats.img.cache||0}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 9, color: '#1a4030', marginTop: 6, lineHeight: 1.5 }}>
          🟢 Strategy: Browser TTS first → Binary stream → Blob URL (no base64). Images = direct URLs.
        </div>
      </div>

      <div style={{ padding: '14px', background: 'rgba(0,229,255,.04)', border: '1px solid rgba(0,229,255,.08)', borderRadius: 12, marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>🤖</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', fontFamily: "'Space Mono',monospace", letterSpacing: 2 }}>JARVIS v26</div>
        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>"Jons Bhai" — Your proactive AI companion</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[['Chats', dbStats.chats, '💬'], ['Memories', dbStats.memories, '🧠'], ['Size', dbStats.size, '💾']].map(([l, v, i]) => (
          <div key={l as string} style={{ padding: '12px 8px', background: '#0c1422', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 18 }}>{i}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#00e5ff', marginTop: 4 }}>{v}</div>
            <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{l}</div>
          </div>
        ))}
      </div>

      <button onClick={exportChats} disabled={exporting}
        style={{ width: '100%', padding: 12, borderRadius: 11, background: 'rgba(0,229,255,.06)', border: '1px solid rgba(0,229,255,.15)', color: '#00e5ff', fontSize: 13, cursor: 'pointer', marginBottom: 10 }}>
        {exporting ? '⏳ Exporting...' : '📥 Chat History Export (.txt)'}
      </button>

      <button onClick={clearAllData}
        style={{ width: '100%', padding: 12, borderRadius: 11, background: 'rgba(255,80,80,.06)', border: '1px solid rgba(255,80,80,.15)', color: '#ff6060', fontSize: 13, cursor: 'pointer' }}>
        🗑️ Sab Delete (Reset)
      </button>

      <SyncStatus />

      <div style={{ marginTop: 16, padding: '12px', background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)', borderRadius: 10 }}>
        <div style={{ fontSize: 11, color: '#1e4060', lineHeight: 1.8 }}>
          <b style={{ color: '#2a6080' }}>Stack:</b> Next.js 14 + Dexie.js + Groq/Gemini/DeepSeek<br/>
          <b style={{ color: '#2a6080' }}>Storage:</b> IndexedDB (primary) + Supabase (optional cloud)<br/>
          <b style={{ color: '#2a6080' }}>Voice:</b> Web Speech API + Azure Neural TTS<br/>
          <b style={{ color: '#2a6080' }}>Tools:</b> Weather, Calc, Wiki, News, Image, URL, +25 more<br/>
          <b style={{ color: '#2a6080' }}>Studio:</b> Pollinations (Image) + HuggingFace (Music)<br/>
          <b style={{ color: '#2a6080' }}>Deploy:</b> Vercel (edge) + GitHub
        </div>
      </div>
    </div>
  )
}

// ── Main Settings Page ─────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile')
  const router = useRouter()

  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'profile', icon: '👤', label: 'Profile' },
    { id: 'keys',    icon: '🔑', label: 'API Keys' },
    { id: 'memory',  icon: '🧠', label: 'Memory' },
    { id: 'reminders', icon: '⏰', label: 'Alerts' },
    { id: 'ai',      icon: '⚡', label: 'AI' },
    { id: 'about',   icon: 'ℹ️', label: 'About' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#090d18', color: 'var(--text)', fontFamily: "'Inter',sans-serif" }}>
      <div className="bg-grid" />

      <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,.05)', background: 'rgba(9,13,24,.97)', flexShrink: 0, zIndex: 10 }}>
        <button onClick={() => router.push('/')}
          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(0,229,255,.1)', background: '#0c1422', color: '#3a6080', fontSize: 14, cursor: 'pointer' }}>←</button>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#00e5ff', letterSpacing: 2 }}>⚙️ SETTINGS</span>
      </header>

      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,.04)', flexShrink: 0, background: 'rgba(9,13,24,.96)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: '10px 0', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === t.id ? '#00e5ff' : 'transparent'}`, color: tab === t.id ? '#00e5ff' : 'var(--text-faint)', fontSize: 11, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', paddingBottom: 80 }}>
        {tab === 'profile' && <ProfileTab />}
        {tab === 'keys'    && <KeysTab />}
        {tab === 'memory'  && <MemoryTab />}
        {tab === 'reminders' && <RemindersTab />}
        {tab === 'ai'      && <AIBehaviorTab />}
        {tab === 'about'   && <AboutTab />}
      </div>

      <style>{`.bg-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(0,229,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,.015) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;z-index:0}`}</style>
    </div>
  )
}
