'use client'
// app/page.tsx — JARVIS Chat v23
// Theme system (4 themes) + Smart suggestions + UX polish
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getTheme, setTheme, initTheme, THEME_META, type Theme } from '../lib/theme'
import NavDrawer from '../components/shared/NavDrawer'
import Toast from '../components/shared/Toast'
import { cleanResponse, parseLearnTags, detectMood } from '../lib/personality'
import { renderMarkdown } from '../lib/render/markdown'
import { addMemory, buildMemoryContext, getProfile, setProfile, saveChat, getTodayChats, runMaintenance, searchChats, createHistorySession, updateHistorySession, getHistorySession, getSessionsToCompress, markSessionCompressed, type HistorySession } from '../lib/db'
import { checkAndFireReminders, requestNotifPermission, addReminder, parseReminderTime, parseRepeatPattern } from '../lib/reminders'
import { checkProactive, trackHabit, generateDailySummary } from '../lib/proactive/engine'
import { parseAndroidCommand, executeAndroidCommand, isAndroidTWA, isAndroid } from '../lib/android/bridge'
import { processAndSave } from '../lib/memory/extractor'
import { parseSlashCommand, cmdNasa, cmdWiki, cmdJoke, cmdShayari, cmdMap, cmdQuote, cmdQR, cmdMeaning, cmdSearch, cmdCanva, cmdApp, SLASH_COMMANDS } from '../lib/chat/slashCommands'
import { pollinationsUrl } from '../lib/media/image'
import { puterImage, loadPuter } from '../lib/providers/puter'
import { generateAndSaveTitle, startNewSession, trackSessionMessage } from '../lib/chat/autoTitle'
import { shouldShowWeeklySummary, generateWeeklySummary, trackWeeklyChat } from '../lib/proactive/weekly'
import ChatHistorySidebar from '../components/shared/ChatHistorySidebar'
import { saveChat as syncSaveChat, syncAll, flushSyncQueue, isSupabaseConfigured, setLastSyncTime } from '../lib/providers/syncManager'
import { buildSemanticContext, invalidateMemoryCache } from '../lib/memory/vectorSearch'
import { useOnlineStatus, cacheAIResponse, getOfflineFallback, getStaticOfflineReply } from '../lib/offline/status'

// Rich inline card types
type RichCard =
  | { type:'image';    url:string; prompt?:string }
  | { type:'music';    previewUrl:string; title:string; artist:string; cover:string; deezerId?:number }
  | { type:'movie';    title:string; year:string; rating:string; poster:string; plot:string; genre:string }
  | { type:'gif';      url:string; title:string }
  | { type:'canva';    designUrl:string; title:string; templateType:string }
  | { type:'weather';  city:string; temp:string; feels:string; desc:string; humidity:string; wind:string; icon:string }
  | { type:'github';   name:string; desc:string; stars:string; lang:string; url:string; forks:string }
  | { type:'news';     articles:{title:string;source:string;url:string;time:string}[] }
  | { type:'book';     title:string; author:string; year:string; cover:string; desc:string; url:string }
  | { type:'youtube';  videoId:string; title:string }
  | { type:'wolfram';  query:string; embedUrl:string }
  | { type:'desmos';   expression:string }
  | { type:'replit';   lang:string; replUrl:string }
  | { type:'maps';     query:string; embedUrl:string }
  | { type:'links';    title:string; items:{icon:string;label:string;url:string}[] }

interface Msg {
  id: string; role: 'user'|'assistant'; content: string
  timestamp: number; streaming?: boolean; thinking?: string
  toolsUsed?: string[]; toolProgress?: string
  feedback?: 'up'|'down'; mode?: string; isSystem?: boolean; pinned?: boolean
  card?: RichCard; responseTime?: number
}

// ── Rich Inline Card Renderer ──────────────────────────────
function RichCardView({ card }: { card: RichCard }) {
  const S = {
    wrap: { marginTop:8, borderRadius:12, overflow:'hidden', border:'1px solid var(--border-acc)', background:'var(--bg-card)' } as const,
    row: { display:'flex', gap:10, padding:'10px 12px', alignItems:'center' } as const,
    title: { fontSize:12, fontWeight:700, color:'var(--text)', lineHeight:1.3 } as const,
    sub: { fontSize:10, color:'var(--text-muted)', marginTop:2 } as const,
    btn: { display:'block', textAlign:'center' as const, padding:'8px', background:'var(--accent-bg)', border:'1px solid var(--border-acc)', borderRadius:8, color:'var(--accent)', fontSize:11, textDecoration:'none', cursor:'pointer', marginTop:8 } as const,
  }

  if (card.type === 'image') return (
    <div style={S.wrap}>
      <img src={card.url} alt={card.prompt||'AI Image'} style={{width:'100%',display:'block',maxHeight:300,objectFit:'cover'}} loading="lazy"
        onError={e=>(e.currentTarget.style.display='none')}/>
      {card.prompt && <div style={{padding:'6px 10px',fontSize:10,color:'var(--text-muted)'}}>{card.prompt}</div>}
    </div>
  )

  if (card.type === 'music') return (
    <div style={S.wrap}>
      <div style={S.row}>
        {card.cover && <img src={card.cover} alt="" style={{width:52,height:52,borderRadius:8,objectFit:'cover',flexShrink:0}} loading="lazy" onError={e=>(e.currentTarget.style.display='none')}/>}
        <div style={{flex:1,minWidth:0}}>
          <div style={S.title}>{card.title}</div>
          <div style={S.sub}>🎤 {card.artist}</div>
          {card.previewUrl && (
            <audio controls style={{width:'100%',marginTop:6,height:32}} preload="none">
              <source src={card.previewUrl} type="audio/mpeg"/>
            </audio>
          )}
        </div>
      </div>
      {card.deezerId && (
        <a href={`https://www.deezer.com/track/${card.deezerId}`} target="_blank" rel="noopener" style={{...S.btn,borderRadius:0,marginTop:0,borderTop:'1px solid rgba(255,255,255,.05)'}}>
          🎵 Deezer pe poora suno →
        </a>
      )}
    </div>
  )

  if (card.type === 'movie') return (
    <div style={S.wrap}>
      <div style={S.row}>
        {card.poster && card.poster !== 'N/A' && (
          <img src={card.poster} alt={card.title} style={{width:60,height:90,borderRadius:8,objectFit:'cover',flexShrink:0}} loading="lazy" onError={e=>(e.currentTarget.style.display='none')}/>
        )}
        <div style={{flex:1,minWidth:0}}>
          <div style={S.title}>{card.title} ({card.year})</div>
          <div style={S.sub}>⭐ {card.rating} · {card.genre}</div>
          <div style={{fontSize:11,color:'var(--text-muted)',marginTop:4,lineHeight:1.4,display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{card.plot}</div>
        </div>
      </div>
    </div>
  )

  if (card.type === 'gif') return (
    <div style={S.wrap}>
      <img src={card.url} alt={card.title} style={{width:'100%',maxHeight:200,objectFit:'cover',display:'block'}} loading="lazy" onError={e=>(e.currentTarget.style.display='none')}/>
      {card.title && <div style={{padding:'4px 10px',fontSize:9,color:'var(--text-muted)'}}>{card.title}</div>}
    </div>
  )

  if (card.type === 'canva') return (
    <div style={S.wrap}>
      <div style={{padding:'12px 14px'}}>
        <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:4}}>🎨 Canva Design Ready</div>
        <div style={S.title}>{card.title}</div>
        <div style={S.sub}>{card.templateType}</div>
        <a href={card.designUrl} target="_blank" rel="noopener" style={{...S.btn,display:'inline-block',marginTop:10,padding:'8px 16px'}}>
          ✏️ Canva mein Edit Karo →
        </a>
      </div>
    </div>
  )

  if (card.type === 'weather') return (
    <div style={S.wrap}>
      <div style={{padding:'12px 14px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <div>
            <div style={{fontSize:11,color:'var(--text-muted)'}}>{card.city}</div>
            <div style={{fontSize:28,fontWeight:700,color:'var(--accent)',lineHeight:1}}>{card.temp}</div>
            <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{card.desc}</div>
          </div>
          <div style={{fontSize:48}}>{card.icon}</div>
        </div>
        <div style={{display:'flex',gap:12,borderTop:'1px solid var(--border)',paddingTop:8}}>
          {[['Feels','🌡️',card.feels],['Humidity','💧',card.humidity],['Wind','💨',card.wind]].map(([l,i,v])=>(
            <div key={l} style={{textAlign:'center' as const,flex:1}}>
              <div style={{fontSize:14}}>{i}</div>
              <div style={{fontSize:11,color:'var(--accent)',fontWeight:700}}>{v}</div>
              <div style={{fontSize:9,color:'var(--text-faint)'}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  if (card.type === 'github') return (
    <div style={S.wrap}>
      <div style={{padding:'12px 14px'}}>
        <div style={S.title}>🐙 {card.name}</div>
        <div style={{fontSize:11,color:'var(--text-muted)',marginTop:4,lineHeight:1.4}}>{card.desc}</div>
        <div style={{display:'flex',gap:12,marginTop:8}}>
          {[['⭐',card.stars],['🍴',card.forks],['💻',card.lang]].map(([i,v])=>(
            <span key={i} style={{fontSize:10,color:'var(--text-muted)'}}>{i} {v}</span>
          ))}
        </div>
        <a href={card.url} target="_blank" rel="noopener" style={{...S.btn,display:'inline-block',marginTop:8,padding:'6px 14px'}}>
          View on GitHub →
        </a>
      </div>
    </div>
  )

  if (card.type === 'news') return (
    <div style={S.wrap}>
      <div style={{padding:'8px 0'}}>
        {card.articles.slice(0,4).map((a,i)=>(
          <a key={i} href={a.url} target="_blank" rel="noopener"
            style={{display:'block',padding:'8px 12px',borderBottom:'1px solid var(--border)',textDecoration:'none',transition:'background .1s'}}>
            <div style={{fontSize:11,color:'var(--text)',lineHeight:1.4,marginBottom:3}}>{a.title}</div>
            <div style={{display:'flex',gap:8}}>
              <span style={{fontSize:9,color:'var(--text-muted)'}}>{a.source}</span>
              <span style={{fontSize:9,color:'var(--text-faint)'}}>{a.time}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  )

  if (card.type === 'book') return (
    <div style={S.wrap}>
      <div style={S.row}>
        {card.cover && <img src={card.cover} alt={card.title} style={{width:52,height:72,borderRadius:6,objectFit:'cover',flexShrink:0}} loading="lazy" onError={e=>(e.currentTarget.style.display='none')}/>}
        <div style={{flex:1,minWidth:0}}>
          <div style={S.title}>{card.title}</div>
          <div style={S.sub}>✍️ {card.author} · {card.year}</div>
          <div style={{fontSize:10,color:'var(--text-muted)',marginTop:4,lineHeight:1.4,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{card.desc}</div>
          {card.url && <a href={card.url} target="_blank" rel="noopener" style={{fontSize:10,color:'var(--accent)',textDecoration:'none',display:'inline-block',marginTop:4}}>Read Online →</a>}
        </div>
      </div>
    </div>
  )

  if (card.type === 'youtube') return (
    <div style={S.wrap}>
      <div style={{position:'relative',paddingBottom:'56.25%',height:0,overflow:'hidden'}}>
        <iframe
          src={`https://www.youtube.com/embed/${card.videoId}?rel=0`}
          style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',border:'none'}}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
          allowFullScreen loading="lazy" title={card.title}
        />
      </div>
      {card.title && <div style={{padding:'6px 10px',fontSize:10,color:'var(--text-muted)'}}>▶️ {card.title}</div>}
    </div>
  )

  if (card.type === 'wolfram') return (
    <div style={S.wrap}>
      <div style={{padding:'10px 12px'}}>
        <div style={{fontSize:10,color:'#a78bfa',marginBottom:6}}>🧮 Wolfram Alpha</div>
        <div style={{fontSize:11,color:'var(--text)',marginBottom:8,fontStyle:'italic'}}>"{card.query}"</div>
        <iframe
          src={card.embedUrl}
          style={{width:'100%',height:200,border:'none',borderRadius:8,background:'white'}}
          loading="lazy" title="Wolfram Alpha"
        />
        <a href={`https://www.wolframalpha.com/input/?i=${encodeURIComponent(card.query)}`}
          target="_blank" rel="noopener" style={{...S.btn,display:'inline-block',marginTop:8,padding:'6px 14px'}}>
          Wolfram pe open karo →
        </a>
      </div>
    </div>
  )

  if (card.type === 'desmos') return (
    <div style={S.wrap}>
      <div style={{padding:'8px 12px 0'}}>
        <div style={{fontSize:10,color:'#34d399',marginBottom:4}}>📈 Desmos Graph</div>
        <div style={{fontSize:10,color:'var(--text-muted)',fontFamily:'monospace',marginBottom:6}}>{card.expression}</div>
      </div>
      <iframe
        src={`https://www.desmos.com/calculator?lang=en&embed&expressions=true`}
        style={{width:'100%',height:250,border:'none',borderRadius:8}}
        loading="lazy" title="Desmos"
      />
      <a href={`https://www.desmos.com/calculator`} target="_blank" rel="noopener"
        style={{...S.btn,borderRadius:'0 0 12px 12px',marginTop:0,display:'block'}}>
        📈 Desmos mein edit karo →
      </a>
    </div>
  )

  if (card.type === 'replit') return (
    <div style={S.wrap}>
      <div style={{padding:'12px 14px'}}>
        <div style={{fontSize:10,color:'#f59e0b',marginBottom:4}}>💻 Replit — Run karo browser mein</div>
        <div style={{fontSize:11,color:'var(--text)',marginBottom:8}}>Language: <span style={{color:'#fbbf24',fontWeight:700}}>{card.lang}</span></div>
        <div style={{display:'flex',gap:8}}>
          <a href={card.replUrl} target="_blank" rel="noopener"
            style={{...S.btn,display:'inline-block',padding:'8px 16px',flex:1,textAlign:'center'}}>
            ▶️ Replit mein Run karo →
          </a>
        </div>
      </div>
    </div>
  )

  if (card.type === 'maps') return (
    <div style={S.wrap}>
      <div style={{fontSize:10,color:'#fb923c',padding:'8px 12px 4px'}}>📍 {card.query}</div>
      <iframe
        src={card.embedUrl}
        style={{width:'100%',height:220,border:'none'}}
        loading="lazy" title="Map" allowFullScreen
      />
    </div>
  )

  if (card.type === 'links') return (
    <div style={S.wrap}>
      <div style={{padding:'10px 12px'}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--text)',marginBottom:8}}>🔗 {card.title}</div>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {card.items.map((item,i)=>(
            <a key={i} href={item.url} target="_blank" rel="noopener"
              style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,
                background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',textDecoration:'none',
                color:'var(--text)',fontSize:11}}>
              <span style={{fontSize:16}}>{item.icon}</span>
              <span>{item.label}</span>
              <span style={{marginLeft:'auto',color:'var(--text-faint)',fontSize:10}}>→</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )

  return null
}

// ── Smart Typing Status ────────────────────────────────────
function getSmartStatus(text: string, mode: string): string {
  const q = text.toLowerCase()
  if (/image|photo|pic|wallpaper|draw|paint|art|portrait|logo|poster/i.test(text)) return '🎨 Image bana raha hoon...'
  if (/weather|mausam|temperature|barish|garmi|thandi/i.test(text)) return '🌤️ Mausam check kar raha hoon...'
  if (/news|khabar|headline|aaj ka/i.test(text)) return '📰 News dhoondh raha hoon...'
  if (/song|music|gana|sunn|play|spotify/i.test(text)) return '🎵 Song dhundh raha hoon...'
  if (/anime|manga|naruto|onepiece|aot|demon slayer|jujutsu/i.test(text)) return '🌸 Anime dhundh raha hoon...'
  if (/map|location|kahan|where.*is|jagah|address/i.test(text)) return '📍 Map dekh raha hoon...'
  if (/github|code|repository|repo/i.test(text)) return '🐙 GitHub search kar raha hoon...'
  if (/math|calculate|solve|equation|integral|derivative|theorem/i.test(text)) return '🧮 Calculate kar raha hoon...'
  if (/neet|jee|physics|chemistry|biology|exam/i.test(text)) return '📚 Soch ke jawab de raha hoon...'
  if (/story|essay|poem|shayari|write|likhna/i.test(text)) return '✍️ Likh raha hoon...'
  if (mode === 'think') return '🧠 Deeply soch raha hoon...'
  if (mode === 'deep') return '🔬 Research kar raha hoon...'
  return '💭 Ek second...'
}

const STARTERS = [
  { icon:'🌤️', t:'Rewa ka mausam?',          sub:'Aaj ka temperature & forecast' },
  { icon:'📰', t:'Aaj ki top khabar?',         sub:'India & world news summary' },
  { icon:'🧠', t:'Python sikhana hai',          sub:'Bilkul beginner se shuru karo' },
  { icon:'🎵', t:'Mujhe ek song recommend karo',sub:'Mood batao, perfect track milega' },
  { icon:'🌸', t:'Top anime suggest karo',      sub:'Genre batao — action, romance, etc.' },
  { icon:'🪙', t:'Bitcoin aaj kitne ka hai?',   sub:'Live price + trend' },
  { icon:'💡', t:'Ek amazing fact batao',       sub:'Random interesting science/history' },
  { icon:'🚀', t:'Meri JARVIS journey shuru karo', sub:'Set up goals, reminders, profile' },
]


// ── Haptic helper ──────────────────────────────────────────
function haptic(type: 'light'|'medium'|'heavy'|'error') {
  if (!navigator.vibrate) return
  const p: Record<string,number|number[]> = { light:30, medium:60, heavy:100, error:[80,40,80] }
  navigator.vibrate(p[type])
}

// ── Weather mini widget ────────────────────────────────────
function WeatherBadge() {
  const [w, setW] = useState<{temp:string;icon:string;loc:string}|null>(null)
  useEffect(() => {
    const cached = sessionStorage.getItem('jarvis_weather')
    if (cached) { try { setW(JSON.parse(cached)) } catch {} return }
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const { latitude: lat, longitude: lon } = pos.coords
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=Asia%2FKolkata`)
        const d = await res.json()
        const code = d.current?.weather_code
        const iconMap: Record<string, string> = { '0':'☀️','1':'🌤','2':'⛅','3':'☁️','45':'🌫','61':'🌧','80':'🌦','95':'⛈' }
        const icon = iconMap[String(Math.floor(code/10)*10)] || '🌡️'
        const data = { temp: `${Math.round(d.current?.temperature_2m)}°`, icon, loc: `${Math.round(lat)}N` }
        setW(data); sessionStorage.setItem('jarvis_weather', JSON.stringify(data))
      } catch {}
    }, () => {})
  }, [])
  if (!w) return null
  return <span style={{fontSize:10,color:'var(--text-muted)',display:'flex',alignItems:'center',gap:3}}>{w.icon} {w.temp}</span>
}

// ── Battery badge ──────────────────────────────────────────
function BatteryBadge() {
  const [batt, setBatt] = useState<number|null>(null)
  useEffect(() => {
    ;(navigator as any).getBattery?.().then((b:any) => {
      setBatt(Math.round(b.level*100))
      b.addEventListener('levelchange', () => setBatt(Math.round(b.level*100)))
    })
  }, [])
  if (batt === null) return null
  const color = batt < 20 ? '#ff4444' : batt < 50 ? '#ffab00' : '#2a5070'
  return <span style={{fontSize:10,color,display:'flex',alignItems:'center',gap:2}}>🔋{batt}%</span>
}

// ── Clock ──────────────────────────────────────────────────
function Clock({ name }:{name:string}) {
  const [t,setT]=useState('')
  const [d,setD]=useState('')
  useEffect(()=>{
    const tick=()=>{
      const n=new Date()
      setT(n.toLocaleTimeString('hi-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit'}))
      setD(n.toLocaleDateString('hi-IN',{timeZone:'Asia/Kolkata',weekday:'short',day:'numeric',month:'short'}))
    }
    tick(); const id=setInterval(tick,1000); return ()=>clearInterval(id)
  },[])
  return (
    <div style={{textAlign:'center',padding:'20px 0 0'}}>
      <div style={{fontSize:44,fontWeight:800,color:'var(--text)',letterSpacing:2,fontFamily:"'Space Mono',monospace"}}>{t}</div>
      <div style={{fontSize:12,color:'var(--text-faint)',marginTop:2}}>{d}</div>
      {name&&<div style={{fontSize:13,color:'var(--text-muted)',marginTop:8}}>Kya scene hai, {name}? 👋</div>}
    </div>
  )
}

// ── SVG Icons ──────────────────────────────────────────────
const IconCopy = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
const IconCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
const IconThumbUp = ({on}:{on:boolean}) => <svg width="13" height="13" viewBox="0 0 24 24" fill={on?"currentColor":"none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
const IconThumbDown = ({on}:{on:boolean}) => <svg width="13" height="13" viewBox="0 0 24 24" fill={on?"currentColor":"none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
const IconPin = ({on}:{on:boolean}) => <svg width="13" height="13" viewBox="0 0 24 24" fill={on?"#ffab00":"none"} stroke={on?"#ffab00":"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
const IconEdit = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>

// ── IBtn — Claude-style labeled action button ───────────────
function IBtn({ onClick, title, children, active, label }: { onClick:()=>void; title:string; children:React.ReactNode; active?:boolean; label?:string }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{ background: hover?'var(--bg-surface)':'none', border:'none', cursor:'pointer', padding:'5px 6px', borderRadius:7, color: active ? 'var(--accent)' : hover?'var(--text)':'var(--text-faint)', display:'flex', alignItems:'center', gap:3, transition:'all .12s', fontSize:11, fontFamily:'inherit' }}>
      {children}
      {label && hover && <span style={{fontSize:10,fontWeight:500,whiteSpace:'nowrap'as const}}>{label}</span>}
    </button>
  )
}

// ── Share helper ────────────────────────────────────────────
function shareMsg(content: string) {
  try {
    if (navigator.share) { navigator.share({ text: content }) }
    else { navigator.clipboard.writeText(content) }
  } catch {}
}

// ── Message ────────────────────────────────────────────────
function Msg({ m, onFeed, onRetry, onPin, onEdit }:{ m:Msg; onFeed:(id:string,v:'up'|'down')=>void; onRetry:()=>void; onPin?:(id:string)=>void; onEdit?:(id:string,content:string)=>void }) {
  const isU = m.role==='user'
  const isErr = m.content.startsWith('⚠️')||m.content.startsWith('📡')
  const clean = cleanResponse(m.content)
  const time = new Date(m.timestamp).toLocaleTimeString('hi-IN',{hour:'2-digit',minute:'2-digit'})
  const [copied, setCopied] = useState(false)
  const [hovered, setHovered] = useState(false)
  const html = renderMarkdown

  function copyMsg() {
    navigator.clipboard?.writeText(clean).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(()=>{})
  }

  return (
    <div style={{padding:'4px 14px 2px',display:'flex',flexDirection:'column',alignItems:isU?'flex-end':'flex-start'}}
      onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}>
      {m.toolProgress&&<div style={{fontSize:10,color:'var(--text-muted)',marginBottom:4,display:'flex',gap:4,paddingLeft:4}}>⚙️ {m.toolProgress}</div>}
      {m.thinking&&(
        <details style={{marginBottom:4,maxWidth:'88%'}}>
          <summary style={{fontSize:10,color:'#6060a0',cursor:'pointer',padding:'2px 4px'}}>🧠 Reasoning</summary>
          <div style={{fontSize:11,color:'var(--text-faint)',padding:'6px 10px',background:'rgba(100,80,200,.06)',borderRadius:8,marginTop:4,maxHeight:120,overflow:'auto',whiteSpace:'pre-wrap',lineHeight:1.5}}>{m.thinking}</div>
        </details>
      )}
      {isU ? (
        // USER — bubble right side
        <div style={{maxWidth:'84%',padding:'10px 14px',borderRadius:'18px 18px 4px 18px',
          background:'var(--user-bg)',border:'1px solid var(--user-border)',
          color:'var(--text)',fontSize:14,lineHeight:1.65}}>
          <span dangerouslySetInnerHTML={{__html:html(clean)}}/>
        </div>
      ) : (
        // JARVIS — no bubble, left side
        <div style={{maxWidth:'92%',paddingLeft:2}}>
          {m.streaming&&!clean ? (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <span style={{color:'var(--text-muted)',fontSize:13}}>{m.toolProgress||''}</span>
              <div style={{display:'flex',gap:4,alignItems:'center'}}>
                <span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/>
              </div>
            </div>
          ) :
            clean.includes('|||MAP|||') ? (() => {
              const [title, url] = clean.split('|||MAP|||')
              return (<>
                {title && <div style={{fontWeight:600,marginBottom:8,fontSize:13,color:'var(--text)'}}>{title}</div>}
                <iframe src={url} width="100%" height={200} style={{borderRadius:10,border:'none'}} loading="lazy" title="Map"/>
              </>)
            })() :
            /!\[image\]\(https?:/.test(clean) ? (() => {
              const imgMatch = clean.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/)
              const textPart = clean.replace(/!\[.*?\]\(https?:\/\/[^\)]+\)/g,'').trim()
              return (<>
                {textPart && <div className="jarvis-msg" style={{marginBottom:8,color:'var(--jarvis-text)',fontSize:14,lineHeight:1.7}} dangerouslySetInnerHTML={{__html:html(textPart)}}/>}
                {imgMatch && <img src={imgMatch[1]} alt="Generated" style={{maxWidth:'100%',borderRadius:10,display:'block'}} loading="lazy" onError={e=>(e.currentTarget.style.display='none')}/>}
              </>)
            })() :
            isErr ? (
              <div style={{color:'#ff6060',fontSize:13.5,lineHeight:1.65}} dangerouslySetInnerHTML={{__html:html(clean)}}/>
            ) : (
              <div className="jarvis-msg" style={{color:'var(--jarvis-text)',fontSize:14,lineHeight:1.7}} dangerouslySetInnerHTML={{__html:html(clean)}}/>
            )
          }
          {m.streaming&&<span style={{display:'inline-block',width:2,height:15,background:'var(--accent)',marginLeft:2,verticalAlign:'middle',animation:'blink 1s step-end infinite'}}/>}
        </div>
      )}

      {/* ── Claude-style action toolbar — appears below on hover ── */}
      <div style={{
        display:'flex', alignItems:'center', gap:0, marginTop:3,
        opacity: (hovered || !!m.feedback) ? 1 : 0,
        maxHeight: (hovered || !!m.feedback) ? 40 : 0,
        overflow: 'hidden',
        alignSelf: isU ? 'flex-end' : 'flex-start',
        transition: 'opacity .15s, max-height .15s',
      }}>
        {/* Time always first */}
        <span style={{fontSize:9,color:'var(--text-faint)',fontFamily:'monospace',padding:'2px 6px'}}>{time}</span>
        {!isU&&m.responseTime&&(
          <span style={{fontSize:9,color:'var(--text-faint)',padding:'2px 6px',fontFamily:'monospace',borderLeft:'1px solid var(--border)',borderRight:'1px solid var(--border)',marginRight:2}}>
            {(m.responseTime/1000).toFixed(1)}s {m.mode==='think'?'🧠':m.mode==='deep'?'🔬':m.mode==='flash'?'⚡':'🤖'}
          </span>
        )}
        {isU&&!m.streaming&&<IBtn onClick={()=>{if(onEdit) onEdit(m.id,m.content)}} title="Edit message" label="Edit"><IconEdit/></IBtn>}
        {!isU&&!m.streaming&&(<>
          <IBtn onClick={copyMsg} title={copied?'Copied!':'Copy'} label={copied?'Copied!':undefined}>{copied?<IconCheck/>:<IconCopy/>}</IBtn>
          <IBtn onClick={()=>onFeed(m.id,'up')} title="Good response" active={m.feedback==='up'} label={m.feedback==='up'?'Liked':undefined}><IconThumbUp on={m.feedback==='up'}/></IBtn>
          <IBtn onClick={()=>onFeed(m.id,'down')} title="Bad response" active={m.feedback==='down'}><IconThumbDown on={m.feedback==='down'}/></IBtn>
          <IBtn onClick={()=>shareMsg(clean)} title="Share">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </IBtn>
          <IBtn onClick={()=>onPin?.(m.id)} title="Pin message" active={!!m.pinned}><IconPin on={!!m.pinned}/></IBtn>
          {isErr&&<IBtn onClick={onRetry} title="Retry"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.8"/></svg></IBtn>}
        </>)}
      </div>

      {m.toolsUsed?.length?<div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:4,paddingLeft:2,alignSelf:'flex-start'}}>{m.toolsUsed.map(t=><span key={t} style={{fontSize:9,padding:'2px 7px',borderRadius:9,background:'var(--bg-surface)',border:'1px solid var(--border)',color:'var(--text-muted)'}}>{t.replace(/_/g,' ')}</span>)}</div>:null}
      {m.card && <div style={{maxWidth:'88%',marginTop:4}}><RichCardView card={m.card}/></div>}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────
export default function Page() {
  const [msgs,setMsgs]=useState<Msg[]>([])
  const [input,setInput]=useState('')
  const [loading,setLoad]=useState(false)
  const [mode,setMode]=useState<'flash'|'think'|'deep'|'auto'>('auto')
  const [online,setOnline]=useState(true)
  const [syncStatus,setSyncStatus]=useState<'idle'|'syncing'|'done'|'error'>('idle')
  const [sessionTitle,setSessionTitle]=useState('')
  const [searchResults,setSearchResults]=useState<any[]|null>(null)
  const [searchLoading,setSearchLoading]=useState(false)
  const [slashHints,setSlashHints]=useState<typeof SLASH_COMMANDS>([])
  const [toast,setToast]=useState<{msg:string;type:'success'|'error'|'info'}|null>(null)
  const [name,setName]=useState('')
  const [onboard,setOnboard]=useState(false)
  const [oIn,setOIn]=useState('')
  const [urlChip,setUrlChip]=useState('')
  const [proactive,setProactive]=useState<string|null>(null)
  const [proactiveAction,setProactiveAction]=useState<{msg:string,label:string}|null>(null)
  const [showSummary,setShowSummary]=useState(false)
  const [searchOpen,setSearchOpen]=useState(false)
  const [searchQ,setSearchQ]=useState('')
  const [editingId,setEditingId]=useState<string|null>(null)
  const [editText,setEditText]=useState('')
  const [installPrompt,setInstallPrompt]=useState<any>(null)
  const [showInstall,setShowInstall]=useState(false)
  const [weeklyPrompt,setWeeklyPrompt]=useState(false)
  const [syncOk,setSyncOk]=useState<boolean|null>(null)
  const [navOpen,setNavOpen]=useState(false)
  const [plusOpen,setPlusOpen]=useState(false)
  const [compressOpen,setCompressOpen]=useState(false)
  const [historyOpen,setHistoryOpen]=useState(false)
  const [currentSessionId,setCurrentSessionId]=useState('')
  const [micActive,setMicActive]=useState(false)
  const micRef = useRef<any>(null)
  const abortRef = useRef<AbortController|null>(null)
  const [currentTheme,setCurrentTheme]=useState<Theme>('dark')
  const [themeOpen,setThemeOpen]=useState(false)
  const router = useRouter()

  // ── JARVIS App Control — executes commands from AI response ──────────
  const execAppCommand = useCallback((cmd: string) => {
    if (!cmd) return
    const [action, ...args] = cmd.split(':')
    const arg = args.join(':').trim()
    switch(action) {
      case 'navigate':
        if (arg) { setNavOpen(false); router.push(arg) } break
      case 'openNav':    setNavOpen(true); break
      case 'closeNav':   setNavOpen(false); break
      case 'setMode':
        if (['flash','think','deep','auto'].includes(arg)) setMode(arg as any); break
      case 'clearChat':
        setMsgs([]); break
      case 'toast':
        if (arg) setToast({ msg: arg, type: 'info' }); break
      case 'toastOk':
        if (arg) setToast({ msg: arg, type: 'success' }); break
      case 'toastErr':
        if (arg) setToast({ msg: arg, type: 'error' }); break
      case 'openSearch':  setSearchOpen(true); break
      case 'closeSearch': setSearchOpen(false); break
      case 'setInput':
        if (arg) setInput(arg); break
      case 'addReminder': {
        const [time, ...rest] = arg.split('|')
        const msg = rest.join('|') || time
        const parsed = parseReminderTime(msg)
        if (parsed) {
          addReminder(msg, parsed)
          setToast({ msg: `⏰ Reminder set: ${msg}`, type: 'success' })
        }; break
      }
      case 'openSettings': router.push('/settings'); break
      case 'openStudy':    router.push('/study'); break
      case 'openApps':     router.push('/apps'); break
      case 'openStudio':   router.push('/studio'); break
      case 'openIndia':    router.push('/india'); break
      case 'openMedia':    router.push('/media'); break
      case 'openVoice':    router.push('/voice'); break
    }
  }, [router])
  const taRef=useRef<HTMLTextAreaElement>(null)
  const botRef=useRef<HTMLDivElement>(null)
  const mainRef=useRef<HTMLDivElement>(null)
  const [scrolledUp,setScrolledUp]=useState(false)
  // Smart contextual chips based on last AI message topic
  const lastAIContent = msgs.filter(m=>m.role==='assistant'&&!m.streaming).slice(-1)[0]?.content||''
  const chips = (() => {
    const c = lastAIContent.toLowerCase()
    if (/formula|equation|law|theorem|physics|chemistry|neet|jee|\$/.test(c))
      return ['Aur formulas do','Example solve karo','Hindi mein explain karo','Practice question do']
    if (/weather|rain|temperature|aaj ka|barish|mausam/.test(c))
      return ['Agle 3 din?','Humidity kitna?','Wind speed?','AQI batao']
    if (/code|function|error|python|javascript|typescript|bug/.test(c))
      return ['Explain karo','Better version?','Test cases do','Copy karke run karo']
    if (/movie|film|show|series|netflix|imdb/.test(c))
      return ['Similar movies?','Rating kya hai?','Where to watch?','Cast batao']
    if (/recipe|food|khana|cook|ingredient/.test(c))
      return ['Aur easy version?','Ingredients?','Calories kitni?','Step by step']
    if (/news|latest|current|today|aaj/.test(c))
      return ['Aur news do','Background batao','Hindi mein','Impact kya hai?']
    if (/music|song|artist|album|gana/.test(c))
      return ['Similar songs?','Lyrics chahiye','Artist ke baare mein','Play karo']
    if (/github|npm|package|library|repo/.test(c))
      return ['Install kaise?','Docs link do','Alternative?','Example code']
    return ['Aur detail mein','Example do','Hindi mein','Ek line mein']
  })()

  const showToast=(msg:string,type:'success'|'error'|'info'='info')=>{ setToast({msg,type}); setTimeout(()=>setToast(null),2500) }

  // Init
  useEffect(()=>{
    // Pre-load Puter in background so first message is instant
    loadPuter().catch(()=>{})
    // Init theme from localStorage
    initTheme()
    setCurrentTheme(getTheme())
    // DB maintenance on start
    runMaintenance().catch(()=>{})
    // Create new session for this chat
    createHistorySession('New Chat').then(id => { if(id) setCurrentSessionId(id) }).catch(()=>{})
    // Auto-compress sessions older than 15 days (silent background)
    setTimeout(async () => {
      try {
        const toCompress = await getSessionsToCompress()
        for (const session of toCompress) {
          try {
            const preview = session.messages.slice(0,15).map(m=>`${m.role==='user'?'User':'JARVIS'}: ${m.content.slice(0,80)}`).join('\n')
            const res = await fetch('/api/jarvis/stream',{method:'POST',headers:{'Content-Type':'application/json'},
              body:JSON.stringify({message:`Yeh poori chat ka 3-4 line summary banao (Hinglish mein). Sirf summary do:\n\n${preview}`,chatMode:'flash',history:[],memoryContext:''})})
            if(!res.ok||!res.body) continue
            const reader=res.body.getReader();const dec=new TextDecoder();let summary=''
            while(true){const{done,value}=await reader.read();if(done)break
              for(const line of dec.decode(value).split('\n')){if(!line.startsWith('data: '))continue
                try{const d=JSON.parse(line.slice(6));if(d.type==='token')summary+=d.token}catch{}}}
            if(summary.trim()) await markSessionCompressed(session.id,summary.trim())
          } catch {}
        }
      } catch {}
    }, 5000)
    setOnline(navigator.onLine)
    const handleOnline = () => {
      setOnline(true)
      // Reconnected → sync immediately
      if (isSupabaseConfigured()) {
        setSyncStatus('syncing')
        syncAll().then(r => {
          setSyncStatus('done')
          setLastSyncTime()
          if (r.pulled > 0) showToast(`☁️ ${r.pulled} messages synced`, 'success')
          setTimeout(() => setSyncStatus('idle'), 3000)
        }).catch(() => setSyncStatus('error'))
      }
    }
    const handleOffline = () => setOnline(false)
    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    // PWA install prompt
    const beforeInstall = (e: any) => { e.preventDefault(); setInstallPrompt(e); setShowInstall(true) }
    window.addEventListener('beforeinstallprompt', beforeInstall)
    // Weekly summary check
    if (shouldShowWeeklySummary()) setTimeout(()=>setWeeklyPrompt(true), 5000)
    ;(async()=>{
      const n=await getProfile('name') as string|null
      if(!n){ setOnboard(true) }
      else {
        setName(n)
        const today=new Date().toDateString()
        if(localStorage.getItem('jarvis_greet')!==today){
          const h=new Date().getHours()
          const g=h<5?'Raat ko jaag rahe ho':h<12?'Subah ho gayi':h<17?'Din mein aaye':h<21?'Shaam ho gayi':'Raat ho gayi'
          setMsgs([{id:'g'+Date.now(),role:'assistant',content:`${g}, ${n}! 👋 Kya scene hai?`,timestamp:Date.now(),isSystem:true}])
          localStorage.setItem('jarvis_greet',today)
        }
        // Follow-up from yesterday
        try{
          const lt=JSON.parse(localStorage.getItem('jarvis_last_topic')||'null')
          if(lt&&lt.date!==new Date().toDateString())
            setTimeout(()=>setProactive(`Kal "${lt.topic.slice(0,30)}" ke baare mein baat thi — aur kuch chahiye?`),2000)
        }catch{}
      }
      // Reminders
      const {checkAndFireReminders:cr,requestNotifPermission:rp}=await import('../lib/reminders')
      cr(showToast)
      const ri=setInterval(()=>cr(showToast),30000)
      setTimeout(()=>rp(),8000)
      // Proactive engine
      checkProactive().then(ev=>{
        if(ev) setTimeout(()=>{
          if(ev.action==='daily_summary') setShowSummary(true)
          else { setProactive(ev.message); if(ev.action) setProactiveAction({msg:ev.action,label:ev.actionLabel||'Haan'}); else setProactiveAction(null) }
        },3000)
      }).catch(()=>{})
      return ()=>clearInterval(ri)
    })()
  },[])

  useEffect(()=>{ 
    if(!scrolledUp) botRef.current?.scrollIntoView({behavior:msgs.length>3?'smooth':'instant'}) 
  },[msgs,loading,scrolledUp])

  // Save current messages to history session
  useEffect(()=>{
    if(!currentSessionId||msgs.length<2) return
    const nonSystem=msgs.filter(m=>!m.isSystem&&!m.streaming)
    if(!nonSystem.length) return
    const histMsgs=nonSystem.map(m=>({role:m.role,content:m.content,timestamp:m.timestamp,card:m.card}))
    const firstUser=nonSystem.find(m=>m.role==='user')?.content||'New Chat'
    updateHistorySession(currentSessionId,histMsgs,sessionTitle||firstUser.slice(0,50)).catch(()=>{})
  },[msgs,currentSessionId,sessionTitle])

  const handleInput=(v:string)=>{
    setInput(v)
    if(themeOpen) setThemeOpen(false)
    const m=v.match(/https?:\/\/[^\s]{10,}/)
    setUrlChip(m?m[0]:'')
    if(taRef.current){ taRef.current.style.height='auto'; taRef.current.style.height=Math.min(taRef.current.scrollHeight,120)+'px' }
  }

  // ─── Slash command autocomplete ──────────────────────────

  const handleInputChange = (val: string) => {
    setInput(val)
    if (val.startsWith('/') && !val.includes(' ')) {
      const q = val.slice(1).toLowerCase()
      setSlashHints(q ? SLASH_COMMANDS.filter(c => c.cmd.slice(1).startsWith(q)) : SLASH_COMMANDS.slice(0, 6))
    } else {
      setSlashHints([])
    }
  }

  // ─── Slash command executor ───────────────────────────────
  const executeSlash = async (cmd: string, arg: string): Promise<boolean> => {
    const aId = 'a_' + Date.now()
    const ph: Msg = { id: aId, role: 'assistant', content: '', timestamp: Date.now(), streaming: true }
    const uMsg: Msg = { id: 'u_' + Date.now(), role: 'user', content: `/${cmd}${arg ? ' ' + arg : ''}`, timestamp: Date.now() }
    setMsgs(p => [...p, uMsg, ph])
    const show = (content: string) => setMsgs(p => p.map(m => m.id === aId ? { ...m, content, streaming: false } : m))
    const showImg = (url: string, title?: string) => setMsgs(p => p.map(m => m.id === aId
      ? { ...m, content: `${title ? `**${title}**\n\n` : ''}![image](${url})`, streaming: false } : m))
    const showMap = (url: string, title?: string) => setMsgs(p => p.map(m => m.id === aId
      ? { ...m, content: `${title || 'Map'}|||MAP|||${url}`, streaming: false } : m))
    try {
      const groqKey = typeof window !== 'undefined' ? localStorage.getItem('jarvis_key_GROQ_API_KEY') || undefined : undefined
      const nasaKey = typeof window !== 'undefined' ? localStorage.getItem('jarvis_key_NASA_API_KEY') || undefined : undefined
      switch (cmd) {
        case 'nasa': {
          const r = await cmdNasa(nasaKey)
          if (r.type === 'image') showImg(r.content, r.title)
          else show(r.content)
          break
        }
        case 'wiki': {
          if (!arg) { show('❓ Usage: /wiki [topic] — jaise /wiki quantum physics'); break }
          show('📖 Searching Wikipedia...')
          const r = await cmdWiki(arg)
          show(r.content)
          break
        }
        case 'joke': {
          show('😂 Joke dhundh raha hun...')
          const r = await cmdJoke()
          show(r.content)
          break
        }
        case 'shayari': {
          show('🌹 Shayari likh raha hun...')
          const r = await cmdShayari(groqKey)
          show(r.content)
          break
        }
        case 'map': {
          if (!arg) { show('❓ Usage: /map [jagah] — jaise /map Taj Mahal Agra'); break }
          const r = await cmdMap(arg)
          showMap(r.content, r.title)
          break
        }
        case 'quote': {
          const r = await cmdQuote()
          show(r.content)
          break
        }
        case 'qr': {
          if (!arg) { show('❓ Usage: /qr [text] — jaise /qr https://google.com'); break }
          const r = await cmdQR(arg)
          showImg(r.content, r.title)
          break
        }
        case 'meaning': {
          if (!arg) { show('❓ Usage: /meaning [word] — jaise /meaning ephemeral'); break }
          show('📚 Dictionary mein dekh raha hun...')
          const r = await cmdMeaning(arg)
          show(r.content)
          break
        }
        case 'search': {
          if (!arg) { show('❓ Usage: /search [query] — jaise /search best phones 2025'); break }
          show('🔍 Searching...')
          const braveKey = typeof window !== 'undefined' ? localStorage.getItem('jarvis_key_BRAVE_SEARCH_KEY') || undefined : undefined
          const r = await cmdSearch(arg, braveKey)
          show(r.content)
          break
        }
        case 'img': {
          if (!arg) { show('❓ Usage: /img [description] — DALL-E 3 quality image'); break }
          show('🎨 DALL-E 3 se image bana raha hun...')
          const loaded = await loadPuter()
          if (loaded) {
            const url = await puterImage(arg)
            if (url) { showImg(url, `🎨 ${arg.slice(0, 40)}`); break }
          }
          // Fallback: Pollinations
          const url = pollinationsUrl(arg, { width: 1024, height: 1024 })
          showImg(url, `🖼️ ${arg.slice(0, 40)}`)
          break
        }
        case 'image': {
          if (!arg) { show('❓ Usage: /image [description] — jaise /image sunset mountains'); break }
          const url = pollinationsUrl(arg, { width: 1024, height: 1024 })
          showImg(url, `🖼️ ${arg.slice(0, 40)}`)
          break
        }
        case 'canva':
        case 'design': {
          const r = await cmdCanva(arg)
          if (r.content.startsWith('CANVA_BRIEF:')) {
            const query = r.content.slice(12)
            show(`🎨 Design idea samjha: **${query}**\n\n[Canva Studio →](/canva)\n\nSeedha: [Canva Templates ↗](https://www.canva.com/templates/)`)
          } else {
            show(`🎨 **Canva Studio** kholo!\n\n[JARVIS Apps Hub →](/apps)`)
          }
          break
        }
        case 'apps': {
          show(`🔗 **Apps Hub** — 50+ app integrations\n\n[Apps Hub kholo →](/apps)\n\nSlash commands: /chatgpt /gemini /wolfram /desmos /github /irctc /translate /youtube aur bahut saare!`)
          break
        }
        // Universal app launcher — handles all other app slash commands
        default: {
          // Try as app command
          const APP_CMDS = ['chatgpt','gemini','perplexity','claude','figma','excalidraw','github','gist','replit','codepen','colab','python','gdocs','gsheets','gslides','notion','wolfram','desmos','graph','pdf','ilovepdf','translate','hindi','english','unsplash','pexels','youtube','spotify','calendar','gcal','irctc','train','pnr','digilocker','nta','neet','whatsapp','wa','telegram']
          if (APP_CMDS.includes(cmd)) {
            const r = await cmdApp(cmd, arg || undefined)
            if (r.content.startsWith('OPEN_APP:')) {
              const parts = r.content.slice(9).split(':')
              const url = parts.slice(0, -1).join(':')
              const name = parts[parts.length - 1]
              if (url.startsWith('/')) {
                window.location.href = url
              } else {
                window.open(url, '_blank', 'noopener,noreferrer')
              }
              show(`✅ **${name}** khul gaya! ↗`)
            }
            break
          }
          return false
        }
      }
    } catch (e: any) {
      show(`⚠️ Command fail hua: ${e.message || 'Unknown error'}. Dobara try karo.`)
    }
    return true
  }

  // ── Chat Export (plain text) ───────────────────────────────
  const exportChat = useCallback(() => {
    const title = sessionTitle || 'JARVIS Chat'
    const date = new Date().toLocaleDateString('en-IN')
    let txt = `JARVIS — ${title}\nDate: ${date}\n${'─'.repeat(40)}\n\n`
    msgs.filter(m=>!m.isSystem).forEach(m=>{
      const role = m.role==='user'?'You':'JARVIS'
      const time = new Date(m.timestamp).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})
      // Strip LaTeX for plain text
      const content = m.content.replace(/\$\$?[^$]+\$?\$/g,'[formula]').replace(/\[LEARN:[^\]]+\]/g,'').trim()
      txt += `[${time}] ${role}:\n${content}\n\n`
    })
    const blob = new Blob([txt], {type:'text/plain'})
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `jarvis-chat-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
    showToast('💾 Chat exported!','success')
  },[msgs, sessionTitle])

  // ── 🎙️ Mic voice-to-text ──────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { showToast('Voice supported nahi hai is browser mein', 'error'); return }

    if (micActive && micRef.current) {
      micRef.current.stop(); return
    }

    const rec = new SR()
    rec.lang = 'hi-IN'
    rec.interimResults = true
    rec.continuous = false
    micRef.current = rec

    rec.onstart = () => { setMicActive(true); haptic('light') }
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join('')
      setInput(transcript)
    }
    rec.onend = () => { setMicActive(false); micRef.current = null; if (taRef.current) taRef.current.focus() }
    rec.onerror = () => { setMicActive(false); micRef.current = null }
    rec.start()
  }, [micActive])

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setLoad(false)
    setMsgs(p => p.map(m => m.streaming ? {
      ...m, streaming: false,
      content: m.content || '⚠️ Generation rok diya.',
      responseTime: undefined,
    } : m))
    haptic('light')
  }, [])

  const send=useCallback(async(text:string)=>{
    if(!text.trim()||loading) return
    haptic('light')
    // Custom instructions prefix
    let finalText = text
    try {
      const ci = localStorage.getItem('jarvis_custom_instructions') || ''
      if (ci.trim()) finalText = text // will be prepended in memory context
    } catch {}
    setSlashHints([])
    // Check for slash command first
    const slashParsed = parseSlashCommand(text)
    if (slashParsed) {
      setInput('')
      await executeSlash(slashParsed.cmd, slashParsed.arg)
      return
    }
    const abort = new AbortController()
    abortRef.current = abort
    setLoad(true); setInput(''); setUrlChip(''); setProactive(null)
    const mood=detectMood(text)
    const uId='u_'+Date.now(), aId='a_'+Date.now()
    const uMsg:Msg={id:uId,role:'user',content:text,timestamp:Date.now(),mode}
    const smartStatus = getSmartStatus(text, mode)
    const ph:Msg={id:aId,role:'assistant',content:'',timestamp:Date.now(),streaming:true,mode,toolProgress:smartStatus}
    setMsgs(p=>[...p,uMsg,ph])
    const userTs = Date.now()
    const sendStartTime = Date.now()
    saveChat({role:'user',content:text,timestamp:userTs,mood}).catch(()=>{})
    syncSaveChat({role:'user',content:text,timestamp:userTs,mood}).catch(()=>{})
    trackWeeklyChat()
    trackHabit(text).catch(()=>{})

    // ── Android command check (TWA only) ──────────────
    if (isAndroid()) {
      const androidCmd = parseAndroidCommand(text)
      if (androidCmd) {
        const result = await executeAndroidCommand(androidCmd)
        const botMsg: Msg = { id:'a'+Date.now(), role:'assistant', content:result, timestamp:Date.now(), mode:'flash' }
        setMsgs(m=>[...m, botMsg])
        setLoad(false)
        setInput('')
        return
      }
    }
    try{localStorage.setItem('jarvis_last_topic',JSON.stringify({topic:text.slice(0,40),date:new Date().toDateString()}))}catch{}

    try{
      // Semantic memory: TF-IDF finds relevant memories (offline, zero API)
      const [basicCtx, semanticCtx] = await Promise.all([
        buildMemoryContext().catch(()=>''),
        buildSemanticContext(text, 600).catch(()=>''),
      ])
      const memCtx = semanticCtx || basicCtx
      // ── Auto mode routing ────────────────────────────────
      const q = text.toLowerCase()
      const effectiveMode = mode === 'auto' ? (
        /\b(solve|proof|derive|explain.*step|why.*happen|reason|analyze|neet|jee|math|physics|chemistry|theorem|proof|calculate.*complex|strategy|essay|story|poem|soch ke|samajh ke|deep|research)\b/i.test(text) ? 'think' :
        /\b(news|weather|mausam|image|photo|wallpaper|search|github|movie|song|gana|map|location|stock|crypto|price|trending|latest|aaj ka|current|live)\b/i.test(text) ? 'deep' :
        'flash'
      ) : mode

      if(effectiveMode==='deep'){
        const res=await fetch('/api/jarvis/deep-stream',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({message:text,history:msgs.slice(-10).map(m=>({role:m.role,content:m.content})),memoryContext:memCtx})})
        if(!res.ok||!res.body) throw new Error('deep_failed')
        const reader=res.body.getReader(); const dec=new TextDecoder(); let full=''
        while(true){
          const{done,value}=await reader.read(); if(done) break
          for(const line of dec.decode(value).split('\n')){
            if(!line.startsWith('data: ')) continue
            try{
              const d=JSON.parse(line.slice(6))
              if(d.type==='token'){full+=d.token;setMsgs(p=>p.map(m=>m.id===aId?{...m,content:full,streaming:true}:m))}
              else if(d.type==='tool'){const icon=d.status==='running'?'⏳':d.status==='cached'?'💾':'✅';setMsgs(p=>p.map(m=>m.id===aId?{...m,toolProgress:`${icon} ${d.tool.replace(/_/g,' ')}${d.status==='cached'?' (cached)':''}`}:m))}
              else if(d.type==='tool_perf'){/* silently track perf */}
              else if(d.type==='done'){
                const c=cleanResponse(full)
                const fin:Msg={id:aId,role:'assistant',content:c,timestamp:Date.now(),streaming:false,toolsUsed:d.toolsUsed||[],toolProgress:'',mode:effectiveMode,card:d.card||undefined,responseTime:Date.now()-sendStartTime}
                setMsgs(p=>p.map(m=>m.id===aId?fin:m))
                if(d.appCommand) execAppCommand(d.appCommand)
                const assistantTs = Date.now()
                saveChat({role:'assistant',content:c,timestamp:assistantTs}).catch(()=>{})
                syncSaveChat({role:'assistant',content:c,timestamp:assistantTs,mode}).catch(()=>{})
                cacheAIResponse(text, c, mode)
                invalidateMemoryCache()
                processLearn(text,full)
              }
            }catch{}
          }
        }
      } else {
        const res=await fetch('/api/jarvis/stream',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({message:text,chatMode:effectiveMode,history:msgs.slice(-10).map(m=>({role:m.role,content:m.content})),memoryContext:memCtx})})
        if(!res.ok||!res.body) throw new Error('stream_failed')
        const reader=res.body.getReader(); const dec=new TextDecoder(); let full='',thk=''
        while(true){
          const{done,value}=await reader.read(); if(done) break
          for(const line of dec.decode(value).split('\n')){
            if(!line.startsWith('data: ')) continue
            try{
              const d=JSON.parse(line.slice(6))
              if(d.type==='token'){full+=d.token;setMsgs(p=>p.map(m=>m.id===aId?{...m,content:full,streaming:true}:m))}
              else if(d.type==='thinking'){thk=d.thinking;setMsgs(p=>p.map(m=>m.id===aId?{...m,thinking:thk}:m))}
              else if(d.type==='done'){
                const c=cleanResponse(full)
                const fin:Msg={id:aId,role:'assistant',content:c,thinking:thk,timestamp:Date.now(),streaming:false,mode,responseTime:Date.now()-sendStartTime}
                setMsgs(p=>p.map(m=>m.id===aId?fin:m))
                const assistantTs2 = Date.now()
                saveChat({role:'assistant',content:c,timestamp:assistantTs2}).catch(()=>{})
                syncSaveChat({role:'assistant',content:c,timestamp:assistantTs2,mode}).catch(()=>{})
                cacheAIResponse(text, c, mode)
                invalidateMemoryCache()
                // Auto session title on first exchange
                if (msgs.filter(m=>m.role==='user').length <= 1) {
                  generateAndSaveTitle(text, c).then(title => setSessionTitle(title)).catch(()=>{})
                } else {
                  trackSessionMessage().catch(()=>{})
                }
                processLearn(text,full)
                if(/remind|yaad dila|alarm/i.test(text)){
                  const rt=parseReminderTime(text)
                  if(rt>Date.now()){const rep=parseRepeatPattern(text);addReminder(text.slice(0,80),rt,rep);showToast(rep!=='none'?`⏰ Recurring reminder set (${rep})!`:'⏰ Reminder set!','info')}
                }
              }
              else if(d.type==='error'){
                if(d.message==='server_providers_failed'){
                  // All server providers failed → use Puter client-side
                  const { puterStream } = await import('../lib/providers/puter')
                  const sysPrompt = `Tum JARVIS ho — "Jons Bhai". Hinglish. Short. Direct. Math: KaTeX.`
                  const hist = msgs.slice(-6).map(m=>({role:m.role,content:m.content}))
                  await puterStream([...hist,{role:'user',content:text}],
                    tok=>{full+=tok;setMsgs(p=>p.map(m=>m.id===aId?{...m,content:full,streaming:true}:m))},
                    ()=>{},
                    ()=>{ throw new Error('Puter bhi fail ho gaya') }
                  )
                } else throw new Error(d.message)
              }
            }catch{}
          }
        }
      }
    }catch{
      // Try offline cached response first
      const cachedReply = getOfflineFallback(text)
      const offlineMsg = '📡 Offline hoon. ' + getStaticOfflineReply()
      const errorMsg = cachedReply || (online ? '⚠️ Kuch gadbad. Dobara try karo.' : offlineMsg)
      setMsgs(p=>p.map(m=>m.id===aId?{...m,content:errorMsg,streaming:false}:m))
      if (!cachedReply) showToast(online ? 'Error aaya' : '📡 Offline', 'error')
    }
    setLoad(false)
  },[loading,msgs,mode,online])

  const processLearn=async(userMsg:string,aiReply:string,feedback?:'up'|'down')=>{
    // v2 — full extractor pipeline
    await processAndSave(userMsg, aiReply, feedback).catch(()=>{})
    // Also check name/goal fast-path for immediate UI update
    const nm=userMsg.match(/(?:mera naam|main hun|my name is|i am)\s+([A-Za-z\u0900-\u097F]+)/i)
    if(nm){await setProfile('name',nm[1]).catch(()=>{});setName(nm[1])}
    const gl=userMsg.match(/\b(UPSC|JEE|NEET|SSC|GATE|MBA|IAS|B\.?Tech|study|padhai|exam|coaching)\b/i)
    if(gl) await setProfile('goal',gl[0]).catch(()=>{})
    // Flush sync queue silently
    flushSyncQueue().then(r=>setSyncOk(r.failed===0)).catch(()=>setSyncOk(false))
  }

  // ── 🔄 Regenerate last AI response ───────────────────────────────────
  const regenerate = useCallback(() => {
    if (loading) return
    const lastUserMsg = [...msgs].reverse().find(m => m.role === 'user')
    if (!lastUserMsg) return
    // Remove last assistant message, then resend
    setMsgs(p => {
      const lastAiIdx = [...p].map((m,i)=>m.role==='assistant'?i:-1).filter(i=>i>=0).pop()
      return lastAiIdx !== undefined ? p.slice(0, lastAiIdx) : p
    })
    setTimeout(() => send(lastUserMsg.content), 50)
  }, [loading, msgs, send])

  const startEdit=(id:string,content:string)=>{ setEditingId(id); setEditText(content) }
  const submitEdit=()=>{
    if(!editText.trim()||!editingId) return
    const newText = editText.trim()
    setMsgs(p=>p.filter(m=>!(m.id===editingId||(m.role==='assistant'&&p.findIndex(x=>x.id===editingId)<p.findIndex(x=>x.id===m.id)))))
    setEditingId(null); setEditText('')
    send(newText)
  }

  const handlePin=(id:string)=>{
    setMsgs(p=>p.map(m=>m.id===id?{...m,pinned:!m.pinned}:m))
  }

  const handleFeed=async(id:string,v:'up'|'down')=>{
    setMsgs(p=>p.map(m=>m.id===id?{...m,feedback:v}:m))
    if(v==='down'){
      const msg=msgs.find(m=>m.id===id)
      if(msg) await addMemory('correction',`User ne dislike kiya: "${msg.content.slice(0,60)}"`,8).catch(()=>{})
      showToast('Feedback saved — JARVIS seekhega 📝','info')
    }
  }

  const retryLast=useCallback(()=>{
    const lu=[...msgs].reverse().find(m=>m.role==='user')
    if(lu){
      setMsgs(p=>p.filter(m=>!(m.role==='assistant'&&(m.content.startsWith('⚠️')||m.content.startsWith('📡')))))
      send(lu.content)
    }
  },[msgs,send])

  const submitOnboard=async()=>{
    if(!oIn.trim()) return
    await setProfile('name',oIn.trim())
    await addMemory('fact',`Naam: ${oIn.trim()}`,9)
    setName(oIn.trim()); setOnboard(false)
    setMsgs([{id:'w'+Date.now(),role:'assistant',content:`${oIn.trim()}! Main JARVIS hun — tera personal AI yaar. 🤖\nKya kaam hai?`,timestamp:Date.now()}])
  }

  const lastAI=[...msgs].reverse().find(m=>m.role==='assistant'&&!m.streaming&&m.content&&!m.isSystem)

  return (
    <div className="theme-switch" style={{position:'fixed',inset:0,display:'flex',flexDirection:'column',background:'var(--bg)',transition:'background .3s'}}>
      <div className="bg-grid"/>

      {searchOpen&&(
        <div style={{position:'absolute',inset:0,zIndex:200,background:'var(--overlay)',display:'flex',flexDirection:'column'}}>
          {/* Search Header */}
          <div style={{padding:'12px 14px',borderBottom:'1px solid rgba(255,255,255,.07)',display:'flex',gap:8,alignItems:'center'}}>
            <span style={{fontSize:16}}>🔍</span>
            <input value={searchQ} autoFocus
              onChange={e=>{
                const q=e.target.value; setSearchQ(q)
                if(q.length>1){
                  setSearchLoading(true)
                  searchChats(q,50).then(results=>{
                    setSearchResults(results); setSearchLoading(false)
                  }).catch(()=>setSearchLoading(false))
                } else { setSearchResults(null) }
              }}
              placeholder="Poori history mein search karo..."
              style={{flex:1,padding:'9px 12px',borderRadius:10,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'var(--text)',fontSize:14,outline:'none'}}/>
            <button onClick={()=>{setSearchOpen(false);setSearchQ('');setSearchResults(null)}}
              style={{padding:'9px 13px',borderRadius:10,background:'rgba(255,255,255,.06)',border:'none',color:'var(--text)',fontSize:14,cursor:'pointer'}}>✕</button>
          </div>

          {/* Tabs: Current Session + All History */}
          <div style={{padding:'8px 14px 0',display:'flex',gap:8}}>
            {[['🔴 Is Chat',false],['📚 History',true]].map(([label,useDB])=>(
              <button key={String(label)} style={{padding:'5px 12px',borderRadius:8,border:'none',fontSize:11,cursor:'pointer',
                background:'rgba(255,255,255,.05)',color:'#8ba8c8',fontWeight:400}}>
                {String(label)}
              </button>
            ))}
          </div>

          {/* Results */}
          <div style={{flex:1,overflowY:'auto',padding:'10px 14px'}}>
            {searchLoading&&<div style={{textAlign:'center',padding:20,color:'var(--text-faint)'}}>🔍 Search ho raha hai...</div>}

            {/* Current session results */}
            {!searchLoading&&searchQ.length>1&&(()=>{
              const cur=msgs.filter(m=>m.content.toLowerCase().includes(searchQ.toLowerCase()))
              const db=searchResults||[]
              const allResults=[
                ...cur.map(m=>({id:m.id,role:m.role,content:m.content,timestamp:m.timestamp,source:'current'})),
                ...db.filter(d=>!cur.some(c=>c.timestamp===d.timestamp)).map(d=>({...d,id:String(d.id),source:'history'}))
              ].sort((a,b)=>b.timestamp-a.timestamp)

              if(!allResults.length) return <div style={{textAlign:'center',padding:'40px 0',color:'var(--text-faint)',fontSize:13}}>"{searchQ}" — koi result nahi mila</div>

              return allResults.map(m=>(
                <div key={m.id} onClick={()=>{setSearchOpen(false);setSearchQ('');setSearchResults(null)}}
                  style={{padding:'10px 12px',background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',borderRadius:10,marginBottom:8,cursor:'pointer',borderLeft:`2px solid ${m.source==='current'?'#00e5ff':'#a78bfa'}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:10,color:m.role==='user'?'#00e5ff':'#a78bfa',fontWeight:600}}>{m.role==='user'?'Tu':'JARVIS'}</span>
                    <span style={{fontSize:9,color:'var(--text-faint)'}}>{new Date(m.timestamp).toLocaleDateString('hi-IN',{day:'numeric',month:'short'})} · {m.source==='history'?'📚':'🔴'}</span>
                  </div>
                  <div style={{fontSize:12,color:'#c8dff0',lineHeight:1.5}}>
                    {m.content.replace(new RegExp(`(${searchQ})`, 'gi'), '**$1**').slice(0,180).split('**').map((part:string,i:number)=>
                      i%2===1 ? <mark key={i} style={{background:'rgba(0,229,255,.25)',color:'var(--accent)',borderRadius:2,padding:'0 1px'}}>{part}</mark>
                               : <span key={i}>{part}</span>
                    )}
                  </div>
                </div>
              ))
            })()}

            {/* Empty state */}
            {!searchQ&&(
              <div style={{textAlign:'center',padding:'30px 0',color:'var(--text-faint)'}}>
                <div style={{fontSize:32,marginBottom:10}}>🔍</div>
                <div style={{fontSize:13}}>Koi bhi word type karo</div>
                <div style={{fontSize:11,marginTop:4}}>Current chat + poori history mein dhundega</div>
              </div>
            )}
          </div>
        </div>
      )}

      {showInstall&&installPrompt&&(
        <div style={{position:'fixed',bottom:80,left:12,right:12,zIndex:100,background:'var(--overlay)',border:'1px solid rgba(0,229,255,.2)',borderRadius:16,padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
          <div style={{fontSize:20}}>🤖</div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:600,color:'var(--text)'}}>JARVIS ko install karo</div>
            <div style={{fontSize:10,color:'var(--text-muted)'}}>Home screen pe add karo — offline bhi kaam karega</div>
          </div>
          <button onClick={()=>{installPrompt.prompt();setShowInstall(false)}} style={{padding:'7px 14px',borderRadius:10,background:'rgba(0,229,255,.15)',border:'1px solid rgba(0,229,255,.3)',color:'var(--accent)',fontSize:12,cursor:'pointer',whiteSpace:'nowrap'}}>Install</button>
          <button onClick={()=>setShowInstall(false)} style={{background:'none',border:'none',color:'var(--text-faint)',fontSize:16,cursor:'pointer'}}>✕</button>
        </div>
      )}

      {weeklyPrompt&&(
        <div style={{margin:'8px 14px',padding:'12px 14px',background:'rgba(167,139,250,.06)',border:'1px solid rgba(167,139,250,.15)',borderRadius:12,display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:12,color:'#8a70d0',flex:1}}>📊 Hafte ka summary sunoge?</span>
          <button onClick={async()=>{setWeeklyPrompt(false);const s=await generateWeeklySummary();send(`Weekly summary: ${s}`)}} style={{padding:'4px 10px',borderRadius:10,background:'rgba(167,139,250,.1)',border:'1px solid rgba(167,139,250,.2)',color:'#a78bfa',fontSize:11,cursor:'pointer'}}>Haan</button>
          <button onClick={()=>setWeeklyPrompt(false)} style={{background:'none',border:'none',color:'var(--text-faint)',fontSize:14,cursor:'pointer'}}>✕</button>
        </div>
      )}

      {editingId&&(
        <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.92)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{width:'100%',maxWidth:400,background:'var(--bg-card)',border:'1px solid rgba(0,229,255,.2)',borderRadius:16,padding:20}}>
            <div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:12}}>✏️ Message Edit karo</div>
            <textarea value={editText} onChange={e=>setEditText(e.target.value)} rows={4}
              style={{width:'100%',padding:'10px 12px',borderRadius:10,background:'rgba(255,255,255,.04)',border:'1px solid rgba(0,229,255,.2)',color:'var(--text)',fontSize:13,resize:'none',outline:'none',boxSizing:'border-box',fontFamily:'inherit',lineHeight:1.5}}/>
            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button onClick={submitEdit} style={{flex:1,padding:'11px',borderRadius:10,background:'rgba(0,229,255,.12)',border:'1px solid rgba(0,229,255,.3)',color:'var(--accent)',fontSize:13,fontWeight:600,cursor:'pointer'}}>↑ Re-send</button>
              <button onClick={()=>{setEditingId(null);setEditText('')}} style={{flex:1,padding:'11px',borderRadius:10,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',color:'var(--text-muted)',fontSize:13,cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {onboard&&(
        <div style={{position:'absolute',inset:0,zIndex:100,background:'rgba(0,0,0,.92)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{background:'var(--bg-card)',border:'1px solid rgba(0,229,255,.2)',borderRadius:20,padding:28,width:'100%',maxWidth:360}}>
            <div style={{fontSize:36,textAlign:'center',marginBottom:10}}>🤖</div>
            <div style={{fontSize:20,fontWeight:700,color:'var(--text)',textAlign:'center',marginBottom:6}}>Pehle milte hain!</div>
            <div style={{fontSize:12,color:'#3a6080',textAlign:'center',marginBottom:20,lineHeight:1.6}}>
              Apna naam batao — JARVIS hamesha yaad rakhega aur teri baaton mein context aayega.
            </div>
            <input value={oIn} onChange={e=>setOIn(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitOnboard()}
              placeholder="Apna naam..." autoFocus
              style={{width:'100%',padding:'13px 14px',borderRadius:12,background:'rgba(255,255,255,.04)',border:'1px solid rgba(0,229,255,.2)',color:'var(--text)',fontSize:15,outline:'none',boxSizing:'border-box',marginBottom:12}}/>
            <button onClick={submitOnboard} disabled={!oIn.trim()}
              style={{width:'100%',padding:13,borderRadius:12,background:oIn.trim()?'rgba(0,229,255,.15)':'rgba(255,255,255,.03)',border:`1px solid ${oIn.trim()?'rgba(0,229,255,.3)':'rgba(255,255,255,.05)'}`,color:oIn.trim()?'#00e5ff':'#1e3858',fontSize:14,fontWeight:600,cursor:'pointer'}}>
              Shuru karo →
            </button>
          </div>
        </div>
      )}

      <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px',borderBottom:'1px solid var(--border)',flexShrink:0,background:'var(--header-bg)',backdropFilter:'blur(10px)',zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div onClick={()=>setNavOpen(true)} style={{width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,var(--accent-bg),rgba(109,40,217,.15))',border:'1px solid var(--border-acc)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'var(--accent)',fontFamily:"'Space Mono',monospace",cursor:'pointer',userSelect:'none'}}>J</div>
          <button onClick={()=>setHistoryOpen(true)} title="Chat History" style={{width:28,height:28,borderRadius:8,background:'var(--bg-surface)',border:'1px solid var(--border)',color:'var(--text-muted)',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>🕐</button>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:'var(--text)',letterSpacing:3,fontFamily:"'Space Mono',monospace"}}>JARVIS</div>
            <div style={{fontSize:8,color:'var(--text-faint)',letterSpacing:1}}>{name?name.toUpperCase():'AI'} · {mode==='think'?'gemini-2.5-think':mode==='deep'?'gemini-2.5-deep':mode==='flash'?'gemini-flash':'auto'}</div>
          </div>
          <WeatherBadge/>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <BatteryBadge/>
          {(['auto','flash','think','deep'] as const).map(m=>(
            <button key={m} onClick={()=>setMode(m)}
              style={{padding:'3px 9px',borderRadius:10,fontSize:10,cursor:'pointer',border:`1px solid ${mode===m?'var(--border-acc)':'var(--border)'}`,background:mode===m?'var(--accent-bg)':'transparent',color:mode===m?'var(--accent)':'var(--text-faint)'}}>
              {m==='auto'?'🤖':m==='flash'?'⚡':m==='think'?'🧠':'🔬'}
            </button>
          ))}
          {/* 🎨 Theme picker */}
          <div style={{position:'relative'}}>
            <button onClick={()=>setThemeOpen(p=>!p)} title="Change theme"
              style={{width:26,height:26,borderRadius:7,background:'var(--bg-surface)',border:'1px solid var(--border)',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {THEME_META[currentTheme].icon}
            </button>
            {themeOpen&&(
              <div style={{position:'absolute',right:0,top:32,zIndex:200,background:'var(--bg-card)',border:'1px solid var(--border-acc)',borderRadius:12,padding:6,display:'flex',flexDirection:'column',gap:4,minWidth:130,boxShadow:'var(--shadow)'}}>
                {(Object.keys(THEME_META) as Theme[]).map(t=>(
                  <button key={t} onClick={()=>{setTheme(t);setCurrentTheme(t);setThemeOpen(false)}}
                    style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,border:`1px solid ${currentTheme===t?'var(--border-acc)':'transparent'}`,background:currentTheme===t?'var(--accent-bg)':'transparent',color:currentTheme===t?'var(--accent)':'var(--text-dim)',fontSize:12,cursor:'pointer',textAlign:'left',width:'100%'}}>
                    <span style={{fontSize:14}}>{THEME_META[t].icon}</span>
                    <div>
                      <div style={{fontWeight:600,fontSize:11}}>{THEME_META[t].label}</div>
                      <div style={{fontSize:9,opacity:.6}}>{THEME_META[t].desc}</div>
                    </div>
                    {currentTheme===t&&<span style={{marginLeft:'auto',fontSize:10,color:'var(--accent)'}}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span style={{width:5,height:5,borderRadius:'50%',background:online?'#00e676':'#ff4444'}} title={online?'Online':'Offline'}/>
          {syncStatus==='syncing'&&<span style={{fontSize:8,color:'#ffab00',animation:'pulse 1s infinite'}}>⚡sync</span>}
          {syncStatus==='done'&&<span style={{fontSize:8,color:'#00e676'}}>☁️✓</span>}
          {!online&&<span style={{fontSize:9,color:'#ff4444',fontWeight:700}}>OFFLINE</span>}
          {msgs.length>0&&<button onClick={()=>setSearchOpen(true)} style={{width:26,height:26,borderRadius:7,background:'transparent',border:'1px solid var(--border)',color:'var(--text-faint)',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>🔍</button>}
          {msgs.length>2&&<button onClick={exportChat} title="Export chat" style={{width:26,height:26,borderRadius:7,background:'transparent',border:'1px solid var(--border)',color:'var(--text-faint)',fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>⬇</button>}
          <button onClick={()=>{setMsgs([]);setSessionTitle('');startNewSession()}}
            title="New chat"
            style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,background:'transparent',border:'1px solid var(--border)',color:'var(--text-faint)',fontSize:10,cursor:'pointer',fontWeight:600}}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--border-acc)';(e.currentTarget as HTMLElement).style.color='var(--accent)'}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--border)';(e.currentTarget as HTMLElement).style.color='var(--text-faint)'}}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New
          </button>
        </div>
      </header>

      <main ref={mainRef} onScroll={()=>{
        const el=mainRef.current; if(!el) return
        const dist=el.scrollHeight-el.scrollTop-el.clientHeight
        setScrolledUp(dist>120)
      }} style={{flex:1,overflowY:'auto',paddingBottom:0,position:'relative'}}>
      {/* ↓ Scroll to bottom FAB */}
      {scrolledUp&&(
        <button onClick={()=>{setScrolledUp(false);botRef.current?.scrollIntoView({behavior:'smooth'})}}
          style={{position:'sticky',bottom:12,left:'50%',transform:'translateX(-50%)',zIndex:50,
            background:'var(--bg-card)',border:'1px solid var(--border-acc)',borderRadius:20,
            padding:'6px 14px',color:'var(--accent)',fontSize:11,cursor:'pointer',
            boxShadow:'var(--shadow)',display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap'}}>
          ↓ Neeche jao
        </button>
      )}
        {msgs.length===0?(
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'0 16px',paddingTop:8}}>
            <Clock name={name}/>
            {/* Claude/Gemini style — 2x2 grid suggestion cards */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,width:'100%',maxWidth:440,marginTop:20}}>
              {STARTERS.map(s=>(
                <button key={s.t} onClick={()=>send(s.t)}
                  style={{padding:'13px 12px',borderRadius:14,background:'var(--bg-surface)',border:'1px solid var(--border)',color:'var(--text)',textAlign:'left',cursor:'pointer',display:'flex',flexDirection:'column',gap:4,transition:'all .18s',outline:'none'}}
                  onMouseEnter={e=>{const el=e.currentTarget;el.style.borderColor='var(--border-acc)';el.style.background='var(--accent-bg)';el.style.transform='translateY(-1px)'}}
                  onMouseLeave={e=>{const el=e.currentTarget;el.style.borderColor='var(--border)';el.style.background='var(--bg-surface)';el.style.transform=''}}>
                  <span style={{fontSize:18}}>{s.icon}</span>
                  <span style={{fontSize:12,fontWeight:600,color:'var(--text)',lineHeight:1.3}}>{s.t}</span>
                  <span style={{fontSize:10,color:'var(--text-faint)',lineHeight:1.3}}>{s.sub}</span>
                </button>
              ))}
            </div>
            {/* Quick page shortcuts */}
            <div style={{display:'flex',gap:8,marginTop:14,width:'100%',maxWidth:440}}>
              {[
                {icon:'🧠',label:'Learn',href:'/learn'},
                {icon:'🌸',label:'Anime',href:'/anime'},
                {icon:'📅',label:'Briefing',href:'/briefing'},
                {icon:'🔌',label:'APIs',href:'/connected'},
              ].map(({icon,label,href})=>(
                <a key={href} href={href}
                  style={{flex:1,padding:'9px 4px',borderRadius:10,background:'var(--bg-surface)',border:'1px solid var(--border)',color:'var(--text-muted)',fontSize:10,textDecoration:'none',display:'flex',flexDirection:'column',alignItems:'center',gap:3,transition:'all .15s'}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--border-acc)';(e.currentTarget as HTMLElement).style.color='var(--accent)'}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--border)';(e.currentTarget as HTMLElement).style.color='var(--text-muted)'}}>
                  <span style={{fontSize:17}}>{icon}</span>
                  <span>{label}</span>
                </a>
              ))}
            </div>
          </div>
        ):(
          <>
            {msgs.some(m=>m.pinned)&&(
              <div style={{margin:'8px 14px',padding:'8px 12px',background:'rgba(255,171,0,.05)',border:'1px solid rgba(255,171,0,.12)',borderRadius:10}}>
                <div style={{fontSize:9,color:'#6a5020',marginBottom:6}}>📌 PINNED</div>
                {msgs.filter(m=>m.pinned).map(pm=>(
                  <div key={pm.id} style={{fontSize:12,color:'#c8a040',marginBottom:4,lineHeight:1.4}}>{pm.role==='user'?'Tu: ':'J: '}{pm.content.slice(0,80)}{pm.content.length>80?'…':''}</div>
                ))}
              </div>
            )}
            {msgs.map(m=><Msg key={m.id} m={m} onFeed={handleFeed} onRetry={retryLast} onPin={handlePin} onEdit={startEdit}/>)}
            {lastAI&&!loading&&chips.length>0&&(
              <div style={{padding:'4px 14px 8px'}}>
                <div style={{fontSize:9,color:'var(--text-faint)',letterSpacing:1,marginBottom:5,fontFamily:"'Space Mono',monospace"}}>RELATED</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {chips.map(c=>(
                    <button key={c} onClick={()=>send(c)}
                      style={{padding:'5px 12px',borderRadius:20,background:'transparent',border:'1px solid var(--border)',color:'var(--text-muted)',fontSize:11,cursor:'pointer',whiteSpace:'nowrap',transition:'all .15s'}}
                      onMouseEnter={e=>{const el=e.currentTarget;el.style.borderColor='var(--border-acc)';el.style.color='var(--accent)';el.style.background='var(--accent-bg)'}}
                      onMouseLeave={e=>{const el=e.currentTarget;el.style.borderColor='var(--border)';el.style.color='var(--text-muted)';el.style.background='transparent'}}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {proactive&&(
          <div style={{margin:'8px 14px',padding:'10px 14px',background:'rgba(0,229,255,.04)',border:'1px solid rgba(0,229,255,.1)',borderRadius:12,display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:12,color:'var(--text-muted)',flex:1}}>💡 {proactive}</span>
            {proactiveAction
              ? <button onClick={()=>{send(proactiveAction.msg);setProactive(null);setProactiveAction(null)}} style={{padding:'4px 10px',borderRadius:10,background:'rgba(0,229,255,.1)',border:'1px solid rgba(0,229,255,.2)',color:'var(--accent)',fontSize:11,cursor:'pointer',whiteSpace:'nowrap' as const}}>{proactiveAction.label}</button>
              : <button onClick={()=>send(proactive!)} style={{padding:'4px 10px',borderRadius:10,background:'rgba(0,229,255,.1)',border:'1px solid rgba(0,229,255,.2)',color:'var(--accent)',fontSize:11,cursor:'pointer'}}>Haan</button>
            }
            <button onClick={()=>{setProactive(null);setProactiveAction(null)}} style={{background:'none',border:'none',color:'var(--text-faint)',fontSize:14,cursor:'pointer'}}>✕</button>
          </div>
        )}

        {showSummary&&(
          <div style={{margin:'8px 14px',padding:'12px 14px',background:'rgba(167,139,250,.06)',border:'1px solid rgba(167,139,250,.15)',borderRadius:12,display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:12,color:'#8a70d0',flex:1}}>📊 Aaj ka daily summary banata hun?</span>
            <button onClick={async()=>{
              setShowSummary(false)
              const sum=await generateDailySummary()
              send(`Daily summary: ${sum}`)
            }} style={{padding:'4px 10px',borderRadius:10,background:'rgba(167,139,250,.1)',border:'1px solid rgba(167,139,250,.2)',color:'#a78bfa',fontSize:11,cursor:'pointer'}}>Haan</button>
            <button onClick={()=>setShowSummary(false)} style={{background:'none',border:'none',color:'var(--text-faint)',fontSize:14,cursor:'pointer'}}>✕</button>
          </div>
        )}
        <div ref={botRef} style={{height:4}}/>
      </main>

      {/* 🔄 Regenerate button — shows after last AI response */}
      {lastAI && !loading && msgs.length >= 2 && (
        <div style={{display:'flex',justifyContent:'center',padding:'0 16px 6px'}}>
          <button onClick={regenerate}
            style={{display:'flex',alignItems:'center',gap:5,padding:'5px 14px',borderRadius:20,background:'var(--bg-surface)',border:'1px solid var(--border)',color:'var(--text-muted)',fontSize:11,cursor:'pointer',transition:'all .2s'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,229,255,.3)';e.currentTarget.style.color='var(--accent)';e.currentTarget.style.background='var(--accent-bg)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--text-muted)';e.currentTarget.style.background='var(--bg-surface)'}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4"/></svg>
            Regenerate
          </button>
        </div>
      )}

      {urlChip&&(
        <div style={{padding:'4px 12px',display:'flex',alignItems:'center',gap:8,borderTop:'1px solid rgba(255,255,255,.04)',background:'var(--header-bg)'}}>
          <span style={{fontSize:10,color:'var(--text-muted)'}}>🔗 URL detect hua —</span>
          <button onClick={()=>{send(`Yeh URL summarize karo: ${urlChip}`);setInput('');setUrlChip('')}}
            style={{padding:'3px 10px',borderRadius:10,background:'rgba(0,229,255,.08)',border:'1px solid rgba(0,229,255,.2)',color:'var(--accent)',fontSize:11,cursor:'pointer'}}>✨ Summarize?</button>
          <button onClick={()=>setUrlChip('')} style={{background:'none',border:'none',color:'var(--text-faint)',fontSize:13,cursor:'pointer'}}>✕</button>
        </div>
      )}

      {/* Slash command autocomplete */}
      {slashHints.length > 0 && (
        <div style={{position:'absolute',bottom:80,left:8,right:8,background:'var(--overlay)',border:'1px solid rgba(0,229,255,.15)',borderRadius:12,overflow:'hidden',zIndex:10}}>
          {slashHints.map(h=>(
            <button key={h.cmd} onClick={()=>{setInput(h.cmd+' ');setSlashHints([]);if(taRef.current) taRef.current.focus()}}
              style={{width:'100%',padding:'10px 14px',display:'flex',alignItems:'center',gap:10,background:'transparent',border:'none',cursor:'pointer',textAlign:'left',borderBottom:'1px solid var(--border)'}}>
              <span style={{fontSize:16}}>{h.icon}</span>
              <div>
                <div style={{fontSize:13,color:'var(--accent)',fontWeight:600}}>{h.cmd}</div>
                <div style={{fontSize:11,color:'var(--text-faint)'}}>{h.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div style={{padding:'8px 12px 10px',borderTop:'1px solid var(--border)',background:'var(--header-bg)',flexShrink:0,position:'relative'}}>

        {/* ── Plus Popup (compact) ─────────────────── */}
        {plusOpen&&(
          <>
            <div onClick={()=>setPlusOpen(false)} style={{position:'fixed',inset:0,zIndex:40}}/>
            <div style={{position:'absolute',bottom:'calc(100% + 6px)',left:12,zIndex:50,
              background:'rgba(10,15,26,.98)',border:'1px solid rgba(0,229,255,.12)',
              borderRadius:14,padding:'10px',width:185,
              boxShadow:'0 -6px 24px rgba(0,0,0,.7)',backdropFilter:'blur(20px)'}}>
              <div style={{fontSize:8,color:'#1a3a50',letterSpacing:2,fontWeight:700,marginBottom:6}}>MODE</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,marginBottom:8}}>
                {([['auto','🤖','Auto'],['flash','⚡','Flash'],['think','🧠','Think'],['deep','🔬','Deep']] as const).map(([m,ic,lb])=>(
                  <button key={m} onClick={()=>{setMode(m);setPlusOpen(false)}}
                    style={{display:'flex',alignItems:'center',gap:5,padding:'6px 7px',borderRadius:8,
                      background:mode===m?'rgba(0,229,255,.1)':'rgba(255,255,255,.03)',
                      border:`1px solid ${mode===m?'rgba(0,229,255,.2)':'rgba(255,255,255,.05)'}`,cursor:'pointer'}}>
                    <span style={{fontSize:13}}>{ic}</span>
                    <span style={{fontSize:11,color:mode===m?'#00e5ff':'#8899aa',fontWeight:mode===m?600:400}}>{lb}</span>
                  </button>
                ))}
              </div>
              <div style={{height:1,background:'rgba(255,255,255,.05)',marginBottom:7}}/>
              <div style={{fontSize:8,color:'#1a3a50',letterSpacing:2,fontWeight:700,marginBottom:5}}>ATTACH</div>
              {([
                ['📷','Camera',()=>{const i=document.createElement('input');i.type='file';i.accept='image/*';(i as any).capture='environment';i.onchange=(e:any)=>{const f=e.target.files[0];if(f)setToast({msg:`📷 ${f.name}`,type:'info'})};i.click();setPlusOpen(false)}],
                ['🖼️','Image',()=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=(e:any)=>{const f=e.target.files[0];if(f)setToast({msg:`🖼️ ${f.name}`,type:'info'})};i.click();setPlusOpen(false)}],
                ['📄','PDF',()=>{const i=document.createElement('input');i.type='file';i.accept='.pdf';i.onchange=(e:any)=>{const f=e.target.files[0];if(f)setToast({msg:`📄 ${f.name}`,type:'info'})};i.click();setPlusOpen(false)}],
                ['🎵','Voice',()=>{setPlusOpen(false);window.location.href='/voice'}],
              ] as [string,string,()=>void][]).map(([ic,lb,fn])=>(
                <button key={lb} onClick={fn}
                  style={{display:'flex',alignItems:'center',gap:7,width:'100%',padding:'5px 6px',
                    borderRadius:7,background:'transparent',border:'none',cursor:'pointer',marginBottom:2}}>
                  <span style={{fontSize:14,width:18,textAlign:'center'as const}}>{ic}</span>
                  <span style={{fontSize:11,color:'#99aabb'}}>{lb}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Compress popup (typed text) ──────────── */}
        {compressOpen&&(
          <>
            <div onClick={()=>setCompressOpen(false)} style={{position:'fixed',inset:0,zIndex:40}}/>
            <div style={{position:'absolute',bottom:'calc(100% + 6px)',right:12,zIndex:50,
              background:'rgba(10,15,26,.98)',border:'1px solid rgba(167,139,250,.2)',
              borderRadius:12,padding:'8px',width:158,
              boxShadow:'0 -6px 20px rgba(0,0,0,.7)',backdropFilter:'blur(20px)'}}>
              <div style={{fontSize:8,color:'#4a3080',letterSpacing:2,fontWeight:700,marginBottom:6}}>COMPRESS TO</div>
              {([
                ['📝','Medium','Thoda chhota karo'],
                ['📌','Short','2-3 lines mein'],
                ['⚡','Tiny','Ek line mein'],
              ] as [string,string,string][]).map(([ic,lb,hint])=>(
                <button key={lb} onClick={async()=>{
                  setCompressOpen(false)
                  if(!input.trim()){setToast({msg:'Pehle kuch likho!',type:'info'});return}
                  setToast({msg:`⏳ ${lb} mein compress ho raha hai...`,type:'info'})
                  try{
                    const res=await fetch('/api/jarvis/stream',{method:'POST',headers:{'Content-Type':'application/json'},
                      body:JSON.stringify({
                        message:`Yeh message ko ${lb==='Medium'?'thoda shorter aur cleaner rewrite karo':lb==='Short'?'2-3 lines mein rewrite karo':'bilkul ek chhoti line mein likhdo'}. Sirf rewritten message do, koi explanation nahi. Hindi/Hinglish style same rakho:\n\n"${input}"`,
                        chatMode:'flash',history:[],memoryContext:''
                      })})
                    if(!res.ok||!res.body)throw new Error('fail')
                    const reader=res.body.getReader();const dec=new TextDecoder();let out=''
                    while(true){
                      const{done,value}=await reader.read();if(done)break
                      for(const line of dec.decode(value).split('\n')){
                        if(!line.startsWith('data: '))continue
                        try{const d=JSON.parse(line.slice(6));if(d.type==='token')out+=d.token}catch{}
                      }
                    }
                    const cleaned=out.trim().replace(/^["']|["']$/g,'')
                    if(cleaned){setInput(cleaned);setToast({msg:`✅ ${lb} mein compress hua!`,type:'success'})}
                  }catch{setToast({msg:'Compress fail hua',type:'error'})}
                }}
                  style={{display:'flex',alignItems:'center',gap:7,width:'100%',padding:'7px 8px',
                    borderRadius:8,background:'rgba(167,139,250,.06)',
                    border:'1px solid rgba(167,139,250,.12)',cursor:'pointer',marginBottom:4}}>
                  <span style={{fontSize:14}}>{ic}</span>
                  <div>
                    <div style={{fontSize:11,fontWeight:600,color:'#a78bfa',textAlign:'left'as const}}>{lb}</div>
                    <div style={{fontSize:8,color:'#4a3080',textAlign:'left'as const}}>{hint}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Input Container — ChatGPT/Claude style ─── */}
        <div style={{
          background:'var(--bg-input)',
          border:`1.5px solid ${loading?'var(--accent)':'var(--border)'}`,
          borderRadius:20,overflow:'hidden',
          boxShadow:loading?'0 0 0 3px rgba(0,229,255,.07)':'0 2px 12px rgba(0,0,0,.2)',
          transition:'border-color .2s,box-shadow .2s',
        }}>
          <textarea ref={taRef} value={input}
            onChange={e=>{handleInput(e.target.value);handleInputChange(e.target.value)}}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(input)}}}
            placeholder={loading?'Soch raha hun...':'Kuch poocho ya batao...'}
            rows={1} disabled={loading}
            style={{
              display:'block',width:'100%',padding:'14px 16px 6px',
              background:'transparent',border:'none',color:'var(--text)',
              fontSize:14,resize:'none',outline:'none',lineHeight:1.6,
              maxHeight:180,overflow:'auto',fontFamily:'inherit',
            }}/>
          {/* Toolbar row */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 8px 8px'}}>
            <div style={{display:'flex',gap:1,alignItems:'center'}}>
              {/* + Attach/Mode */}
              <button onClick={()=>{setPlusOpen(p=>!p);setCompressOpen(false)}}
                style={{width:30,height:28,borderRadius:7,background:plusOpen?'var(--accent-bg)':'transparent',border:`1px solid ${plusOpen?'var(--border-acc)':'transparent'}`,color:plusOpen?'var(--accent)':'var(--text-faint)',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:300,transition:'all .15s'}}>
                {plusOpen?'×':'+'}
              </button>
              {/* Compress */}
              <button onClick={()=>{if(!input.trim()){setToast({msg:'Pehle type karo!',type:'info'});return}setCompressOpen(p=>!p);setPlusOpen(false)}}
                style={{padding:'4px 7px',borderRadius:7,background:compressOpen?'rgba(167,139,250,.12)':'transparent',border:`1px solid ${compressOpen?'rgba(167,139,250,.3)':'transparent'}`,color:compressOpen?'#a78bfa':'var(--text-faint)',fontSize:10,cursor:'pointer',transition:'all .15s',letterSpacing:.3,fontWeight:600}}>
                Aa
              </button>
              {/* Mode chip */}
              <button onClick={()=>{setPlusOpen(p=>!p);setCompressOpen(false)}}
                style={{padding:'3px 9px',borderRadius:20,background:'transparent',border:'1px solid transparent',color:'var(--text-faint)',fontSize:10,cursor:'pointer',letterSpacing:.3,transition:'all .15s',whiteSpace:'nowrap'}}>
                {mode==='auto'?`🤖 Auto·${(()=>{const q2=input.toLowerCase();return /solve|math|reason|explain.*step/i.test(q2)?'Think':/news|weather|image|search|movie|song|map/i.test(q2)?'Deep':'Flash'})()}`:mode==='flash'?'⚡ Flash':mode==='think'?'🧠 Think':'🔬 Deep'}
              </button>
            </div>
            <div style={{display:'flex',gap:3,alignItems:'center'}}>
              {/* Mic */}
              <button onClick={toggleMic}
                style={{width:30,height:28,borderRadius:7,background:micActive?'rgba(255,50,50,.15)':'transparent',border:`1px solid ${micActive?'rgba(255,80,80,.4)':'transparent'}`,color:micActive?'#ff5555':'var(--text-faint)',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s',animation:micActive?'pulse 1.2s ease-in-out infinite':undefined}}
                title={micActive?'Stop':'Voice'}>
                {micActive?'⏹':'🎙️'}
              </button>
              {/* Stop / Send */}
              {loading ? (
                <button onClick={stopGeneration} style={{width:32,height:32,borderRadius:8,background:'rgba(255,80,80,.15)',border:'1px solid rgba(255,80,80,.35)',color:'#ff6060',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s'}} title="Stop generating">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="#ff6060"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                </button>
              ) : (
                <button onClick={()=>send(input)} disabled={!input.trim()}
                  style={{width:32,height:32,borderRadius:8,background:input.trim()?'var(--accent)':'transparent',border:`1px solid ${input.trim()?'var(--accent)':'transparent'}`,color:input.trim()?'#000':'var(--text-faint)',cursor:input.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s'}}
                  title="Send (Enter)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <NavDrawer open={navOpen} onClose={()=>setNavOpen(false)}/>
      <ChatHistorySidebar
        open={historyOpen}
        onClose={()=>setHistoryOpen(false)}
        currentSessionId={currentSessionId}
        onNewChat={async()=>{
          setMsgs([]);setSessionTitle('');startNewSession()
          const id=await createHistorySession('New Chat').catch(()=>'')
          if(id) setCurrentSessionId(id)
        }}
        onSelectSession={(session)=>{
          setCurrentSessionId(session.id)
          setSessionTitle(session.title)
          if(session.compressed){
            setMsgs([{id:'comp_'+Date.now(),role:'assistant',content:`📦 **Yeh chat compress ho gayi hai**\n\n${session.summary||''}`,timestamp:Date.now(),isSystem:true}])
          } else {
            const loaded=session.messages.map((m,i)=>({
              id:`hist_${i}_${m.timestamp}`,role:m.role as 'user'|'assistant',
              content:m.content,timestamp:m.timestamp,card:m.card as any,
            }))
            setMsgs(loaded)
          }
        }}
      />
      {toast&&<Toast msg={toast.msg} type={toast.type}/>}
      <style>{`
        @keyframes blink{50%{opacity:0}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,80,80,.4)}50%{box-shadow:0 0 0 6px rgba(255,80,80,0)}}
        .bg-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(0,229,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,.015) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;z-index:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(0,229,255,.1);border-radius:2px}
        main>*{position:relative;z-index:1}
      `}</style>
    </div>
  )
}
