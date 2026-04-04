'use client'
// app/page.tsx — JARVIS v27 Clean
// Architecture: proper React, no monolith, MdRenderer (no innerHTML)

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import MdRenderer from '../components/markdown/MdRenderer'
import { getTheme, setTheme, initTheme, THEME_META, type Theme } from '../lib/theme'
import { addMemory, getProfile, setProfile, runMaintenance, createHistorySession, updateHistorySession, buildMemoryContext } from '../lib/db'
import { puterStream, loadPuter } from '../lib/providers/puter'
import { checkAndFireReminders, requestNotifPermission, addReminder, parseReminderTime } from '../lib/reminders/index'
import { canRequest } from '../lib/rateLimit'
import { freeAIChat } from '../lib/providers/freeAI'
import { SLASH_COMMANDS, parseSlashCommand } from '../lib/chat/slashCommands'
import { generateAndSaveTitle, startNewSession } from '../lib/chat/autoTitle'
import { checkProactive } from '../lib/proactive/engine'
import NavDrawer from '../components/ui/NavDrawer'
import Toast from '../components/ui/Toast'

const ChatHistorySidebar = dynamic(() => import('../components/ui/ChatHistorySidebar'), { ssr: false })

/* ── Reply sound ─────────────────────────────────────────── */
function playReplySound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.setValueAtTime(880, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.12)
    g.gain.setValueAtTime(0.15, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.18)
  } catch {}
}



/* ── Types ───────────────────────────────────────────────── */
type RichCard =
  | { type:'image'; url:string; prompt?:string }
  | { type:'music'; previewUrl:string; title:string; artist:string; cover:string }
  | { type:'weather'; city:string; temp:string; feels:string; desc:string; humidity:string; wind:string; icon:string }
  | { type:'news'; articles:{title:string;source:string;url:string;time:string}[] }
  | { type:'youtube'; videoId:string; title:string }
  | { type:'maps'; query:string; embedUrl:string }

interface Msg {
  id: string; role: 'user'|'assistant'; content: string; timestamp: number
  streaming?: boolean; card?: RichCard; responseTime?: number
  mode?: string; feedback?: 'up'|'down'; pinned?: boolean; isSystem?: boolean
  toolsUsed?: string[]; thinking?: string
}

/* ── Rich Card ───────────────────────────────────────────── */
function RichCardView({ card }: { card: RichCard }) {
  const W: React.CSSProperties = { marginTop:8, borderRadius:12, overflow:'hidden', border:'1px solid var(--border-a)', background:'var(--bg-card)' }
  if (card.type==='image') return <div style={W}><img src={card.url} alt={card.prompt||''} style={{width:'100%',display:'block'}} onError={e=>(e.currentTarget.style.display='none')}/><div style={{padding:'5px 10px',fontSize:11,color:'var(--text-3)'}}>{card.prompt||'AI Image'}</div></div>
  if (card.type==='youtube') return <div style={W}><div style={{position:'relative',paddingBottom:'56.25%',height:0}}><iframe src={`https://www.youtube.com/embed/${card.videoId}?rel=0`} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',border:'none'}} allowFullScreen loading="lazy" title={card.title}/></div></div>
  if (card.type==='maps') return <div style={W}><div style={{fontSize:10,color:'#fb923c',padding:'7px 12px 3px'}}>📍 {card.query}</div><iframe src={card.embedUrl} style={{width:'100%',height:220,border:'none'}} loading="lazy" title="Map" allowFullScreen/></div>
  if (card.type==='weather') return <div style={W}><div style={{padding:'12px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div style={{fontSize:11,color:'var(--text-3)'}}>{card.city}</div><div style={{fontSize:30,fontWeight:700,color:'var(--accent)',lineHeight:1}}>{card.temp}</div><div style={{fontSize:11,color:'var(--text-3)',marginTop:2}}>{card.desc} · 💧{card.humidity}</div></div><div style={{fontSize:50}}>{card.icon}</div></div></div>
  if (card.type==='news') return <div style={W}><div style={{padding:'6px 0'}}>{card.articles.slice(0,4).map((a,i)=><a key={i} href={a.url} target="_blank" rel="noopener" style={{display:'block',padding:'8px 12px',borderBottom:'1px solid var(--border)',textDecoration:'none'}}><div style={{fontSize:11,color:'var(--text)',lineHeight:1.4,marginBottom:3}}>{a.title}</div><span style={{fontSize:9,color:'var(--text-3)'}}>{a.source} · {a.time}</span></a>)}</div></div>
  if (card.type==='music') return <div style={W}><div style={{display:'flex',gap:10,padding:'10px 12px',alignItems:'center'}}>{card.cover&&<img src={card.cover} alt="" style={{width:50,height:50,borderRadius:8,objectFit:'cover',flexShrink:0}} loading="lazy" onError={e=>(e.currentTarget.style.display='none')}/>}<div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:700,color:'var(--text)'}}>{card.title}</div><div style={{fontSize:10,color:'var(--text-3)',marginTop:2}}>🎤 {card.artist}</div>{card.previewUrl&&<audio controls style={{width:'100%',marginTop:5,height:30}} preload="none"><source src={card.previewUrl} type="audio/mpeg"/></audio>}</div></div></div>
  return null
}

/* ── Clock ───────────────────────────────────────────────── */
function Clock({ name }: { name: string }) {
  const [t, setT] = useState('')
  const [d, setD] = useState('')
  useEffect(() => {
    const tick = () => {
      const n = new Date()
      setT(n.toLocaleTimeString('hi-IN', { timeZone:'Asia/Kolkata', hour:'2-digit', minute:'2-digit' }))
      setD(n.toLocaleDateString('hi-IN', { timeZone:'Asia/Kolkata', weekday:'short', day:'numeric', month:'short' }))
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])
  return (
    <div style={{ textAlign:'center', padding:'24px 0 4px' }}>
      <div style={{ fontSize:46, fontWeight:800, color:'var(--text)', letterSpacing:2, fontFamily:"'JetBrains Mono',monospace" }}>{t}</div>
      <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>{d}</div>
      {name && <div style={{ fontSize:13, color:'var(--text-2)', marginTop:10 }}>Kya scene hai, {name}? 👋</div>}
    </div>
  )
}

/* ── Weather badge ───────────────────────────────────────── */
function WeatherBadge() {
  const [w, setW] = useState<{ temp:string; icon:string }|null>(null)
  useEffect(() => {
    const c = sessionStorage.getItem('jw')
    if (c) { try { setW(JSON.parse(c)) } catch {} return }
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async p => {
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.coords.latitude}&longitude=${p.coords.longitude}&current=temperature_2m,weather_code&timezone=Asia%2FKolkata`)
        const d = await r.json()
        const icons: Record<string,string> = {'0':'☀️','1':'🌤','2':'⛅','3':'☁️','45':'🌫','61':'🌧','80':'🌦','95':'⛈'}
        const data = { temp:`${Math.round(d.current?.temperature_2m)}°`, icon:icons[String(Math.floor((d.current?.weather_code||0)/10)*10)]||'🌡️' }
        setW(data); sessionStorage.setItem('jw', JSON.stringify(data))
      } catch {}
    }, () => {})
  }, [])
  if (!w) return null
  return <span style={{ fontSize:10, color:'var(--text-3)', display:'flex', alignItems:'center', gap:3 }}>{w.icon} {w.temp}</span>
}

const STARTERS = [
  { icon:'🌤️', t:'Rewa ka mausam?', sub:'Aaj ka temp + forecast' },
  { icon:'📰', t:'Aaj ki top khabar?', sub:'India & world news' },
  { icon:'🧠', t:'Python sikhana hai', sub:'Beginner se shuru' },
  { icon:'🎵', t:'Song recommend karo', sub:'Mood batao' },
  { icon:'🪙', t:'Bitcoin aaj kitna hai?', sub:'Live crypto price' },
  { icon:'🥇', t:'Sone ka bhav?', sub:'Gold + silver 10g rate' },
  { icon:'📚', t:'NEET physics doubt', sub:'Formula + explanation' },
  { icon:'🚀', t:'JARVIS setup karo', sub:'Goals + reminders set' },
]

/* ── Main Page ───────────────────────────────────────────── */
export default function Page() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoad] = useState(false)
  const [mode, setMode] = useState<'auto'|'flash'|'think'|'deep'>('auto')
  const [online, setOnline] = useState(true)
  const [name, setName] = useState('')
  const [onboard, setOnboard] = useState(false)
  const [oIn, setOIn] = useState('')
  const [toast, setToast] = useState<{ msg:string; type:'success'|'error'|'info' }|null>(null)
  const [navOpen, setNavOpen] = useState(false)
  const [histOpen, setHistOpen] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState('')
  const [sessionTitle, setSessionTitle] = useState('')
  const [themeOpen, setThemeOpen] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<Theme>('dark')
  const [plusOpen, setPlusOpen] = useState(false)
  const [slashHints, setSlashHints] = useState<typeof SLASH_COMMANDS>([])
  const [micActive, setMicActive] = useState(false)
  const [scrolledUp, setScrolledUp] = useState(false)
  const [puterReady, setPuterReady] = useState(false)
  const [modelName, setModelName] = useState('')
  const [proactive, setProactive] = useState<string|null>(null)
  const [urlChip, setUrlChip] = useState('')

  const taRef = useRef<HTMLTextAreaElement>(null)
  const botRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController|null>(null)
  const micRef = useRef<any>(null)
  const router = useRouter()

  const lastAI = msgs.filter(m => m.role==='assistant' && !m.streaming).slice(-1)[0]?.content || ''

  const showToast = (msg: string, type: 'success'|'error'|'info' = 'info') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 2500)
  }

  /* ── Init ────────────────────────────────────────────── */
  useEffect(() => {
    initTheme(); setCurrentTheme(getTheme())
    setOnline(navigator.onLine)
    window.addEventListener('online', () => setOnline(true))
    window.addEventListener('offline', () => setOnline(false))
    runMaintenance().catch(() => {})
    createHistorySession('New Chat').then(id => { if (id) setCurrentSessionId(id) }).catch(() => {})

    ;(async () => {
      const n = await getProfile('name') as string|null
      if (!n) { setOnboard(true) }
      else {
        setName(n)
        const today = new Date().toDateString()
        if (localStorage.getItem('jarvis_greet') !== today) {
          const h = new Date().getHours()
          const g = h<5?'Raat ko bhi jaag rahe ho':h<12?'Subah ho gayi':h<17?'Din mein aaye':h<21?'Shaam ho gayi':'Raat ho gayi'
          setMsgs([{ id:'g'+Date.now(), role:'assistant', content:`${g}, ${n}! 👋 Kya scene hai?`, timestamp:Date.now(), isSystem:true }])
          localStorage.setItem('jarvis_greet', today)
        }
      }
      checkAndFireReminders(showToast)
      setInterval(() => checkAndFireReminders(showToast), 30000)
      setTimeout(() => requestNotifPermission(), 8000)
    })()

    // Puter
    loadPuter().then(ok => setPuterReady(ok)).catch(() => {})
    // Proactive
    checkProactive().then(ev => {
      if (ev?.message) setTimeout(() => setProactive(ev.message), 3000)
    }).catch(() => {})

    // SW
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  /* ── Auto scroll ─────────────────────────────────────── */
  useEffect(() => {
    if (!scrolledUp) botRef.current?.scrollIntoView({ behavior: msgs.length > 3 ? 'smooth' : 'instant' })
  }, [msgs, loading, scrolledUp])

  /* ── Session save ────────────────────────────────────── */
  useEffect(() => {
    if (!currentSessionId || msgs.length < 2) return
    const ns = msgs.filter(m => !m.isSystem && !m.streaming)
    if (!ns.length) return
    const hm = ns.map(m => ({ role:m.role, content:m.content, timestamp:m.timestamp }))
    const fu = ns.find(m => m.role==='user')?.content || 'New Chat'
    updateHistorySession(currentSessionId, hm, sessionTitle || fu.slice(0,50)).catch(() => {})
  }, [msgs, currentSessionId, sessionTitle])

  /* ── Onboard ─────────────────────────────────────────── */
  const submitOnboard = async () => {
    if (!oIn.trim()) return
    await setProfile('name', oIn.trim())
    setName(oIn.trim()); setOnboard(false)
    setMsgs([{ id:'g0', role:'assistant', content:`Shukriya! Main hoon JARVIS — tumhara personal AI. 🤖\n\nKya karna hai aaj?`, timestamp:Date.now(), isSystem:true }])
  }

  /* ── Input handling ──────────────────────────────────── */
  const handleInput = (v: string) => {
    setInput(v)
    const urlM = v.match(/https?:\/\/[^\s]{10,}/)
    setUrlChip(urlM ? urlM[0] : '')
    if (taRef.current) {
      taRef.current.style.height = 'auto'
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 130) + 'px'
    }
    if (v.startsWith('/') && !v.includes(' ')) {
      const q = v.slice(1).toLowerCase()
      setSlashHints(q ? SLASH_COMMANDS.filter(c => c.cmd.slice(1).startsWith(q)) : SLASH_COMMANDS.slice(0, 6))
    } else {
      setSlashHints([])
    }
  }

  /* ── Stop generation ─────────────────────────────────── */
  const stop = () => { abortRef.current?.abort() }

  /* ── Smart status ────────────────────────────────────── */
  const getStatus = (text: string) => {
    if (/image|photo|draw|art/i.test(text)) return '🎨 Image bana raha hoon...'
    if (/weather|mausam/i.test(text)) return '🌤️ Mausam check kar raha hoon...'
    if (/news|khabar/i.test(text)) return '📰 News dhoondh raha hoon...'
    if (/song|music|gana/i.test(text)) return '🎵 Song dhundh raha hoon...'
    if (/neet|jee|physics|chemistry|biology/i.test(text)) return '📚 Soch ke jawab de raha hoon...'
    if (/math|calculate|solve/i.test(text)) return '🧮 Calculate kar raha hoon...'
    return '💭 Soch raha hoon...'
  }

  /* ── Effective mode ──────────────────────────────────── */
  const getEffectiveMode = (text: string, m: typeof mode) => {
    if (m !== 'auto') return m
    if (/neet|jee|physics|chem|bio|math|solve|proof|theorem/i.test(text)) return 'think'
    if (/news|weather|image|map|song|movie/i.test(text)) return 'deep'
    return 'flash'
  }

  /* ── Send ────────────────────────────────────────────── */
  const send = useCallback(async (text: string) => {
    const t = text.trim()
    if (!t || loading) return
    if (!canRequest()) { showToast('Thoda ruk — rate limit!', 'error'); return }

    setInput(''); setSlashHints([])
    if (taRef.current) taRef.current.style.height = 'auto'

    const uId = 'u_' + Date.now()
    const aId = 'a_' + Date.now()
    const uMsg: Msg = { id:uId, role:'user', content:t, timestamp:Date.now(), mode }
    const aMsg: Msg = { id:aId, role:'assistant', content:getStatus(t), timestamp:Date.now(), streaming:true }

    setMsgs(p => [...p, uMsg, aMsg])
    setLoad(true)

    const ab = new AbortController()
    abortRef.current = ab
    const start = Date.now()

    try {
      // Check slash commands first
      const slash = parseSlashCommand(t)
      if (slash) {
        // Handled by slashCommands lib
        return
      }

      const effectiveMode = getEffectiveMode(t, mode)
      const memCtx = await buildMemoryContext(t).catch(() => '')
      const hist = msgs.slice(-12).filter(m => !m.isSystem && !m.streaming).map(m => ({ role:m.role, content:m.content }))

      const SYS = `Tum JARVIS ho — "Jons Bhai". Hinglish mein baat karo. Short (1-4 lines). Sarcastic but caring. Direct.
Math: KaTeX use karo ($formula$). "As an AI" kabhi mat kaho. NEET/physics/chem: proper formulas.`
      const msgs_for_ai = [{ role:'system', content:SYS+(memCtx?`\n\nContext:\n${memCtx}`:'') }, ...hist, { role:'user', content:t }]

      let replied = false
      let full = ''

      // ── Level 1: Server stream (Groq/Gemini — needs env keys) ──
      try {
        const route = effectiveMode === 'deep' ? '/api/jarvis/deep-stream' : '/api/jarvis/stream'
        const res = await fetch(route, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ message:t, chatMode:effectiveMode, history:hist, memoryContext:memCtx }),
          signal: AbortSignal.timeout(12000),
        })
        if (res.ok && res.body) {
          const reader = res.body.getReader(); const dec = new TextDecoder()
          while (true) {
            const { done, value } = await reader.read(); if (done) break
            for (const line of dec.decode(value).split('\n')) {
              if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
              try {
                const d = JSON.parse(line.slice(6))
                if (d.type === 'token' && d.token) { full += d.token; replied = true; setMsgs(p => p.map(m => m.id===aId?{...m,content:full}:m)) }
                if (d.type === 'model' && d.name) setModelName(d.name)
                if (d.type === 'card') setMsgs(p => p.map(m => m.id===aId?{...m,card:d.card}:m))
                if (d.type === 'learn') addMemory(d.content, d.memType||'fact').catch(()=>{})
              } catch {}
            }
          }
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') { setMsgs(p => p.map(m => m.id===aId?{...m,streaming:false}:m)); setLoad(false); return }
        // Server failed — try fallbacks
      }

      // ── Level 2: Puter.js (GPT-4o-mini, free, no server key needed) ──
      if (!replied || !full.trim()) {
        full = ''
        await puterStream(
          msgs_for_ai,
          (tok) => { full += tok; replied = true; setMsgs(p => p.map(m => m.id===aId?{...m,content:full}:m)) },
          (done) => { replied = true; full = done; setMsgs(p => p.map(m => m.id===aId?{...m,content:full}:m)) },
          () => {}
        )
      }

      // ── Level 3: Pollinations (no key, browser direct) ──
      if (!replied || !full.trim()) {
        full = ''
        await freeAIChat(
          msgs_for_ai,
          (tok) => { full += tok; replied = true; setMsgs(p => p.map(m => m.id===aId?{...m,content:full}:m)) },
          (done) => { replied = true; full = done; setMsgs(p => p.map(m => m.id===aId?{...m,content:full}:m)) },
          () => {}
        )
      }

      // ── Level 4: Give up ──
      if (!replied || !full.trim()) {
        setMsgs(p => p.map(m => m.id===aId?{...m,content:'API keys set karo Settings mein — Groq ya Gemini. Ya Puter login karo.'}:m))
      }

      const rt = Date.now() - start
      setMsgs(p => p.map(m => m.id === aId ? { ...m, streaming:false, responseTime:rt, mode:effectiveMode } : m))
      if (replied) playReplySound()

      // Auto title
      if (msgs.filter(m => m.role==='user').length === 0) {
        generateAndSaveTitle(t, full, currentSessionId).then(title => { if(title) setSessionTitle(title) }).catch(() => {})
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setMsgs(p => p.map(m => m.id === aId ? { ...m, content:'Kuch gadbad ho gayi. Dobara try karo.', streaming:false } : m))
      }
    } finally {
      setLoad(false)
    }
  }, [msgs, loading, mode, currentSessionId])

  /* ── Mic ─────────────────────────────────────────────── */
  const toggleMic = () => {
    if (micActive) {
      micRef.current?.stop(); setMicActive(false); return
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { showToast('Speech recognition supported nahi', 'error'); return }
    const r = new SR()
    r.lang = 'hi-IN'; r.interimResults = true; r.continuous = false
    r.onresult = (e: any) => {
      const txt = Array.from(e.results).map((rr: any) => rr[0].transcript).join('')
      setInput(txt); handleInput(txt)
    }
    r.onend = () => setMicActive(false)
    r.start(); micRef.current = r; setMicActive(true)
  }

  /* ── Regenerate ──────────────────────────────────────── */
  const regenerate = () => {
    const lastUser = msgs.filter(m => m.role==='user').slice(-1)[0]
    if (!lastUser) return
    setMsgs(p => p.filter(m => m.id !== msgs.filter(m2 => m2.role==='assistant').slice(-1)[0]?.id))
    send(lastUser.content)
  }

  /* ── Smart chips ─────────────────────────────────────── */
  const chips = (() => {
    const c = lastAI.toLowerCase()
    if (/formula|physics|chemistry|neet/.test(c)) return ['Aur formulas do', 'Example solve karo', 'Hindi mein', 'MCQ do']
    if (/weather|mausam/.test(c)) return ['Agle 3 din?', 'Humidity?', 'AQI batao', 'Wind speed?']
    if (/code|python|javascript|function/.test(c)) return ['Explain karo', 'Better version?', 'Test cases do', 'Bugs?']
    if (/news|khabar/.test(c)) return ['Aur news do', 'Hindi mein', 'Background?', 'Impact kya?']
    if (/song|music|artist/.test(c)) return ['Similar songs?', 'Lyrics chahiye', 'Artist info', 'Play karo']
    return ['Aur detail mein', 'Example do', 'Hindi mein', 'Ek line mein']
  })()

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div style={{ position:'fixed', inset:0, display:'flex', flexDirection:'column', background:'var(--bg)' }}>
      <div className="bg-grid"/>
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)}/>
      <ChatHistorySidebar
        open={histOpen} onClose={() => setHistOpen(false)} currentSessionId={currentSessionId}
        onNewChat={async () => {
          setMsgs([]); setSessionTitle('')
          startNewSession()
          const id = await createHistorySession('New Chat').catch(() => '')
          if (id) setCurrentSessionId(id)
        }}
        onSelectSession={(s) => {
          setCurrentSessionId(s.id); setSessionTitle(s.title)
          setMsgs(s.messages.map((m: any, i: number) => ({
            id:`h${i}_${m.timestamp}`, role:m.role, content:m.content, timestamp:m.timestamp
          })))
        }}
      />

      {/* Onboard */}
      {onboard && (
        <div style={{ position:'absolute', inset:0, zIndex:100, background:'rgba(0,0,0,.9)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-a)', borderRadius:20, padding:28, width:'100%', maxWidth:360 }}>
            <div style={{ fontSize:36, textAlign:'center', marginBottom:10 }}>🤖</div>
            <div style={{ fontSize:20, fontWeight:700, textAlign:'center', marginBottom:6 }}>Pehle milte hain!</div>
            <div style={{ fontSize:12, color:'var(--text-3)', textAlign:'center', marginBottom:20, lineHeight:1.6 }}>Apna naam batao — JARVIS hamesha yaad rakhega.</div>
            <input value={oIn} onChange={e => setOIn(e.target.value)} onKeyDown={e => e.key==='Enter' && submitOnboard()} placeholder="Apna naam..." autoFocus style={{ width:'100%', marginBottom:12 }}/>
            <button onClick={submitOnboard} disabled={!oIn.trim()} style={{ width:'100%', padding:12, borderRadius:10, background:oIn.trim()?'var(--accent-bg)':'transparent', border:`1px solid ${oIn.trim()?'var(--border-a)':'var(--border)'}`, color:oIn.trim()?'var(--accent)':'var(--text-3)', fontSize:14, fontWeight:600, cursor:'pointer' }}>
              Shuru karo →
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', borderBottom:'1px solid var(--border)', flexShrink:0, background:'var(--header)', backdropFilter:'blur(10px)', zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => setNavOpen(true)} style={{ width:28, height:28, borderRadius:8, background:'var(--accent-bg)', border:'1px solid var(--border-a)', color:'var(--accent)', fontSize:14, fontWeight:800, fontFamily:"'JetBrains Mono',monospace" }}>J</button>
          <button onClick={() => setHistOpen(true)} style={{ width:28, height:28, borderRadius:8, background:'rgba(255,255,255,.04)', border:'1px solid var(--border)', color:'var(--text-3)', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>🕐</button>
          <WeatherBadge/>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:6, position:'relative' }}>
          {/* Theme */}
          <div style={{ position:'relative' }}>
            <button onClick={() => setThemeOpen(p => !p)} style={{ width:26, height:26, borderRadius:7, background:'rgba(255,255,255,.04)', border:'1px solid var(--border)', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {THEME_META[currentTheme].icon}
            </button>
            {themeOpen && (
              <div style={{ position:'absolute', right:0, top:32, zIndex:200, background:'var(--bg-card)', border:'1px solid var(--border-a)', borderRadius:12, padding:6, minWidth:130, boxShadow:'var(--shadow)' }}>
                {(Object.keys(THEME_META) as Theme[]).map(t => (
                  <button key={t} onClick={() => { setTheme(t); setCurrentTheme(t); setThemeOpen(false) }}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:8, border:`1px solid ${currentTheme===t?'var(--border-a)':'transparent'}`, background:currentTheme===t?'var(--accent-bg)':'transparent', color:currentTheme===t?'var(--accent)':'var(--text-2)', fontSize:12, cursor:'pointer', width:'100%' }}>
                    {THEME_META[t].icon} {THEME_META[t].label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span style={{ width:5, height:5, borderRadius:'50%', background:online?'#00e676':'#ff4444' }}/>
          {msgs.length > 2 && (
            <button onClick={() => { setMsgs([]); setSessionTitle(''); startNewSession() }}
              style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 9px', borderRadius:8, background:'transparent', border:'1px solid var(--border)', color:'var(--text-3)', fontSize:10, fontWeight:600 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New
            </button>
          )}
        </div>
      </header>

      {/* Messages */}
      <div ref={mainRef} onScroll={() => {
        const el = mainRef.current; if (!el) return
        setScrolledUp(el.scrollHeight - el.scrollTop - el.clientHeight > 120)
      }} style={{ flex:1, overflowY:'auto', overflowX:'hidden', paddingBottom:8, minHeight:0 }}>

        {/* Empty state */}
        {msgs.length === 0 && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'0 16px 16px', paddingTop:8 }}>
            <Clock name={name}/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, width:'100%', maxWidth:440, marginTop:20 }}>
              {STARTERS.map(s => (
                <button key={s.t} onClick={() => send(s.t)}
                  style={{ padding:'13px 12px', borderRadius:14, background:'rgba(255,255,255,.03)', border:'1px solid var(--border)', color:'var(--text)', textAlign:'left', cursor:'pointer', display:'flex', flexDirection:'column', gap:4 }}>
                  <span style={{ fontSize:18 }}>{s.icon}</span>
                  <span style={{ fontSize:12, fontWeight:600, lineHeight:1.3 }}>{s.t}</span>
                  <span style={{ fontSize:10, color:'var(--text-4)', lineHeight:1.3 }}>{s.sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {msgs.map(m => (
          <div key={m.id} className="msg-fadein">
            {m.role === 'user' ? (
              <div className="msg-u">
                <div className="msg-u-inner">{m.content}</div>
              </div>
            ) : (
              <div className="msg-j">
                {m.streaming ? (
                  <div style={{ display:'flex', alignItems:'center', gap:6, minHeight:24 }}>
                    <span className="dot"/><span className="dot"/><span className="dot"/>
                    {m.content && m.content !== getStatus(m.content) && (
                      <span style={{ fontSize:11, color:'var(--text-3)', marginLeft:2 }}>{m.content}</span>
                    )}
                  </div>
                ) : (
                  <>
                    {/* ★ KEY: MdRenderer — pure React, no innerHTML, no overlap ★ */}
                    <MdRenderer content={m.content}/>
                    {m.card && <RichCardView card={m.card}/>}
                    {/* Meta row */}
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4, flexWrap:'wrap' }}>
                      {m.responseTime && <span style={{ fontSize:9, color:'var(--text-4)', fontFamily:"'JetBrains Mono',monospace" }}>⚡{(m.responseTime/1000).toFixed(1)}s</span>}
                      {m.mode && <span style={{ fontSize:9, color:'var(--text-4)', background:'rgba(255,255,255,.04)', padding:'1px 5px', borderRadius:4 }}>{m.mode==='flash'?'⚡':m.mode==='think'?'🧠':m.mode==='deep'?'🔬':'🤖'} {m.mode}</span>}
                      {modelName && msgs.filter(x=>x.role==='assistant').slice(-1)[0]?.id===m.id && <span style={{ fontSize:9, color:'#3a8060', background:'rgba(0,229,100,.06)', padding:'1px 6px', borderRadius:4, border:'1px solid rgba(0,229,100,.15)' }}>🤖 {modelName}</span>}
                      <button onClick={() => navigator.clipboard.writeText(m.content).then(() => showToast('Copied!','success')).catch(()=>{})}
                        style={{ background:'none', border:'none', color:'var(--text-4)', fontSize:10, cursor:'pointer', padding:'1px 5px' }}>⎘</button>
                      <button onClick={() => setMsgs(p => p.map(x => x.id===m.id?{...x,feedback:'up'}:x))}
                        style={{ background:'none', border:'none', color:m.feedback==='up'?'#22c55e':'var(--text-4)', fontSize:11, cursor:'pointer' }}>👍</button>
                      <button onClick={() => setMsgs(p => p.map(x => x.id===m.id?{...x,feedback:'down'}:x))}
                        style={{ background:'none', border:'none', color:m.feedback==='down'?'#ef4444':'var(--text-4)', fontSize:11, cursor:'pointer' }}>👎</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        <div ref={botRef} style={{ height:4 }}/>
      </div>

      {/* Scroll FAB */}
      {scrolledUp && (
        <div style={{ textAlign:'center', padding:'2px 0', flexShrink:0 }}>
          <button onClick={() => { setScrolledUp(false); botRef.current?.scrollIntoView({ behavior:'smooth' }) }}
            style={{ background:'var(--bg-card)', border:'1px solid var(--border-a)', borderRadius:20, padding:'5px 14px', color:'var(--accent)', fontSize:11, cursor:'pointer' }}>↓ Neeche jao</button>
        </div>
      )}

      {/* Chips */}
      {lastAI && !loading && chips.length > 0 && (
        <div style={{ padding:'4px 12px 2px', display:'flex', gap:5, overflowX:'auto', flexShrink:0 }} className="no-scroll">
          {chips.map(c => (
            <button key={c} onClick={() => send(c)}
              style={{ padding:'4px 11px', borderRadius:16, background:'transparent', border:'1px solid var(--border)', color:'var(--text-3)', fontSize:11, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>{c}</button>
          ))}
        </div>
      )}

      {/* Proactive banner */}
      {proactive && (
        <div style={{ margin:'0 14px 4px', padding:'9px 14px', background:'rgba(0,229,255,.04)', border:'1px solid rgba(0,229,255,.1)', borderRadius:12, display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <span style={{ fontSize:12, color:'var(--text-3)', flex:1 }}>💡 {proactive}</span>
          <button onClick={() => { send(proactive!); setProactive(null) }} style={{ padding:'3px 10px', borderRadius:10, background:'var(--accent-bg)', border:'1px solid var(--border-a)', color:'var(--accent)', fontSize:11, cursor:'pointer' }}>Haan</button>
          <button onClick={() => setProactive(null)} style={{ background:'none', border:'none', color:'var(--text-4)', fontSize:14, cursor:'pointer' }}>✕</button>
        </div>
      )}

      {/* URL chip */}
      {urlChip && (
        <div style={{ padding:'4px 12px', display:'flex', alignItems:'center', gap:8, flexShrink:0, borderTop:'1px solid rgba(255,255,255,.04)' }}>
          <span style={{ fontSize:10, color:'var(--text-3)' }}>🔗 URL detect hua —</span>
          <button onClick={() => { send(`Yeh URL summarize karo: ${urlChip}`); setInput(''); setUrlChip('') }} style={{ padding:'3px 10px', borderRadius:10, background:'var(--accent-bg)', border:'1px solid var(--border-a)', color:'var(--accent)', fontSize:11, cursor:'pointer' }}>✨ Summarize?</button>
          <button onClick={() => setUrlChip('')} style={{ background:'none', border:'none', color:'var(--text-4)', fontSize:13, cursor:'pointer' }}>✕</button>
        </div>
      )}

      {/* Regenerate */}
      {lastAI && !loading && msgs.length >= 2 && (
        <div style={{ display:'flex', justifyContent:'center', padding:'0 16px 3px', flexShrink:0 }}>
          <button onClick={regenerate} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 14px', borderRadius:20, background:'rgba(255,255,255,.03)', border:'1px solid var(--border)', color:'var(--text-3)', fontSize:11 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4"/></svg>Regenerate
          </button>
        </div>
      )}

      {/* Slash hints */}
      {slashHints.length > 0 && (
        <div style={{ position:'absolute', bottom:80, left:8, right:8, background:'var(--overlay)', border:'1px solid var(--border-a)', borderRadius:12, overflow:'hidden', zIndex:10 }}>
          {slashHints.map(h => (
            <button key={h.cmd} onClick={() => { setInput(h.cmd+' '); setSlashHints([]); taRef.current?.focus() }}
              style={{ width:'100%', padding:'9px 14px', display:'flex', alignItems:'center', gap:10, background:'transparent', border:'none', borderBottom:'1px solid var(--border)', cursor:'pointer', textAlign:'left' }}>
              <span style={{ fontSize:15 }}>{h.icon}</span>
              <div>
                <div style={{ fontSize:12, color:'var(--accent)', fontWeight:600 }}>{h.cmd}</div>
                <div style={{ fontSize:10, color:'var(--text-3)' }}>{h.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding:'8px 12px 10px', borderTop:'1px solid var(--border)', background:'var(--header)', flexShrink:0, position:'relative' }}>
        {/* Plus popup */}
        {plusOpen && (
          <>
            <div onClick={() => setPlusOpen(false)} style={{ position:'fixed', inset:0, zIndex:40 }}/>
            <div style={{ position:'absolute', bottom:'calc(100% + 6px)', left:12, zIndex:50, background:'rgba(8,12,22,.98)', border:'1px solid var(--border-a)', borderRadius:14, padding:10, width:185, boxShadow:'0 -6px 24px rgba(0,0,0,.7)', backdropFilter:'blur(20px)' }}>
              <div style={{ fontSize:8, color:'var(--text-4)', letterSpacing:2, fontWeight:700, marginBottom:6 }}>MODE</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
                {([['auto','🤖','Auto'],['flash','⚡','Flash'],['think','🧠','Think'],['deep','🔬','Deep']] as const).map(([m,ic,lb]) => (
                  <button key={m} onClick={() => { setMode(m); setPlusOpen(false) }}
                    style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 7px', borderRadius:8, background:mode===m?'var(--accent-bg)':'rgba(255,255,255,.03)', border:`1px solid ${mode===m?'var(--border-a)':'rgba(255,255,255,.05)'}`, cursor:'pointer' }}>
                    <span style={{ fontSize:13 }}>{ic}</span>
                    <span style={{ fontSize:11, color:mode===m?'var(--accent)':'#8899aa', fontWeight:mode===m?600:400 }}>{lb}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div style={{ background:'var(--bg-input)', border:`1.5px solid ${loading?'var(--accent)':'var(--border)'}`, borderRadius:20, overflow:'hidden', transition:'border-color .2s' }}>
          <textarea ref={taRef} value={input} onChange={e => handleInput(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
            placeholder={loading ? 'Soch raha hun...' : 'Kuch poocho ya batao...'}
            rows={1} style={{ display:'block', width:'100%', padding:'13px 16px 6px', background:'transparent', border:'none', color:'var(--text)', fontSize:14, resize:'none', outline:'none', lineHeight:1.6, maxHeight:130, overflow:'auto', fontFamily:'inherit' }}
          />
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 8px 8px' }}>
            <div style={{ display:'flex', gap:1, alignItems:'center' }}>
              <button onClick={() => setPlusOpen(p => !p)} style={{ width:30, height:28, borderRadius:7, background:plusOpen?'var(--accent-bg)':'transparent', border:`1px solid ${plusOpen?'var(--border-a)':'transparent'}`, color:plusOpen?'var(--accent)':'var(--text-3)', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>{plusOpen?'×':'+'}</button>
              <span style={{ padding:'3px 9px', fontSize:10, color:'var(--text-4)' }}>
                {mode==='auto'?'🤖 Auto':mode==='flash'?'⚡ Flash':mode==='think'?'🧠 Think':'🔬 Deep'}
              </span>
              {input.length > 50 && <span style={{ fontSize:9, color:input.length>800?'#ff6060':input.length>400?'#ffab00':'var(--text-4)', padding:'2px 5px' }}>{input.length}</span>}
            </div>
            <div style={{ display:'flex', gap:3 }}>
              <button onClick={toggleMic} style={{ width:30, height:28, borderRadius:7, background:micActive?'rgba(255,50,50,.15)':'transparent', border:`1px solid ${micActive?'rgba(255,80,80,.4)':'transparent'}`, color:micActive?'#ff5555':'var(--text-3)', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {micActive ? '⏹' : '🎙️'}
              </button>
              {loading
                ? <button onClick={stop} style={{ width:32, height:32, borderRadius:8, background:'rgba(255,80,80,.15)', border:'1px solid rgba(255,80,80,.35)', color:'#ff6060', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="#ff6060"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                  </button>
                : <button onClick={() => send(input)} disabled={!input.trim()} style={{ width:32, height:32, borderRadius:8, background:input.trim()?'var(--accent)':'transparent', border:`1px solid ${input.trim()?'var(--accent)':'transparent'}`, color:input.trim()?'#000':'var(--text-3)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                  </button>
              }
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type}/>}
    </div>
  )
}
