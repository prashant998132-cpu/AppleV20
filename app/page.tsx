'use client'
// app/page.tsx — JARVIS Chat v20 Upgraded
// Dexie DB | Proactive | Memory | Feedback loop | Weather header
import { useState, useRef, useEffect, useCallback } from 'react'
import BottomNav from '../components/shared/BottomNav'
import NavDrawer from '../components/shared/NavDrawer'
import Toast from '../components/shared/Toast'
import { cleanResponse, parseLearnTags, detectMood } from '../lib/personality'
import { renderMarkdown } from '../lib/render/markdown'
import { addMemory, buildMemoryContext, getProfile, setProfile, saveChat, getTodayChats } from '../lib/db'
import { checkAndFireReminders, requestNotifPermission, addReminder, parseReminderTime } from '../lib/reminders'
import { checkProactive, trackHabit, generateDailySummary } from '../lib/proactive/engine'
import { processAndSave } from '../lib/memory/extractor'
import { routeWithBattery } from '../lib/core/orchestrator'
import { parseSlashCommand, cmdNasa, cmdWiki, cmdJoke, cmdShayari, cmdMap, cmdQuote, cmdQR, cmdMeaning, cmdSearch, cmdCanva, cmdApp, SLASH_COMMANDS } from '../lib/chat/slashCommands'
import { pollinationsUrl } from '../lib/media/image'
import { puterImage, loadPuter } from '../lib/providers/puter'
import { flushSyncQueue } from '../lib/providers/syncManager'
import { generateAndSaveTitle, startNewSession, trackSessionMessage } from '../lib/chat/autoTitle'
import { shouldShowWeeklySummary, generateWeeklySummary, trackWeeklyChat } from '../lib/proactive/weekly'
import { parseRepeatPattern } from '../lib/reminders'
import { runMaintenance, searchChats } from '../lib/db'
import { saveChat as syncSaveChat, syncAll, flushSyncQueue as syncFlush, isSupabaseConfigured, setLastSyncTime } from '../lib/providers/syncManager'
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

interface Msg {
  id: string; role: 'user'|'assistant'; content: string
  timestamp: number; streaming?: boolean; thinking?: string
  toolsUsed?: string[]; toolProgress?: string
  feedback?: 'up'|'down'; mode?: string; isSystem?: boolean; pinned?: boolean
  card?: RichCard
}

// ── Rich Inline Card Renderer ──────────────────────────────
function RichCardView({ card }: { card: RichCard }) {
  const S = {
    wrap: { marginTop:8, borderRadius:12, overflow:'hidden', border:'1px solid rgba(0,229,255,.12)', background:'rgba(0,0,0,.3)' } as const,
    row: { display:'flex', gap:10, padding:'10px 12px', alignItems:'center' } as const,
    title: { fontSize:12, fontWeight:700, color:'#e8f4ff', lineHeight:1.3 } as const,
    sub: { fontSize:10, color:'#4a7090', marginTop:2 } as const,
    btn: { display:'block', textAlign:'center' as const, padding:'8px', background:'rgba(0,229,255,.1)', border:'1px solid rgba(0,229,255,.2)', borderRadius:8, color:'#00e5ff', fontSize:11, textDecoration:'none', cursor:'pointer', marginTop:8 } as const,
  }

  if (card.type === 'image') return (
    <div style={S.wrap}>
      <img src={card.url} alt={card.prompt||'AI Image'} style={{width:'100%',display:'block',maxHeight:300,objectFit:'cover'}} loading="lazy"
        onError={e=>(e.currentTarget.style.display='none')}/>
      {card.prompt && <div style={{padding:'6px 10px',fontSize:10,color:'#2a6080'}}>{card.prompt}</div>}
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
          <div style={{fontSize:11,color:'#3a7090',marginTop:4,lineHeight:1.4,display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{card.plot}</div>
        </div>
      </div>
    </div>
  )

  if (card.type === 'gif') return (
    <div style={S.wrap}>
      <img src={card.url} alt={card.title} style={{width:'100%',maxHeight:200,objectFit:'cover',display:'block'}} loading="lazy" onError={e=>(e.currentTarget.style.display='none')}/>
      {card.title && <div style={{padding:'4px 10px',fontSize:9,color:'#2a5070'}}>{card.title}</div>}
    </div>
  )

  if (card.type === 'canva') return (
    <div style={S.wrap}>
      <div style={{padding:'12px 14px'}}>
        <div style={{fontSize:11,color:'#4a7090',marginBottom:4}}>🎨 Canva Design Ready</div>
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
            <div style={{fontSize:11,color:'#2a7090'}}>{card.city}</div>
            <div style={{fontSize:28,fontWeight:700,color:'#00e5ff',lineHeight:1}}>{card.temp}</div>
            <div style={{fontSize:11,color:'#3a8090',marginTop:2}}>{card.desc}</div>
          </div>
          <div style={{fontSize:48}}>{card.icon}</div>
        </div>
        <div style={{display:'flex',gap:12,borderTop:'1px solid rgba(0,229,255,.08)',paddingTop:8}}>
          {[['Feels','🌡️',card.feels],['Humidity','💧',card.humidity],['Wind','💨',card.wind]].map(([l,i,v])=>(
            <div key={l} style={{textAlign:'center' as const,flex:1}}>
              <div style={{fontSize:14}}>{i}</div>
              <div style={{fontSize:11,color:'#00e5ff',fontWeight:700}}>{v}</div>
              <div style={{fontSize:9,color:'#1e3858'}}>{l}</div>
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
        <div style={{fontSize:11,color:'#3a7090',marginTop:4,lineHeight:1.4}}>{card.desc}</div>
        <div style={{display:'flex',gap:12,marginTop:8}}>
          {[['⭐',card.stars],['🍴',card.forks],['💻',card.lang]].map(([i,v])=>(
            <span key={i} style={{fontSize:10,color:'#2a6080'}}>{i} {v}</span>
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
            style={{display:'block',padding:'8px 12px',borderBottom:'1px solid rgba(255,255,255,.04)',textDecoration:'none',transition:'background .1s'}}>
            <div style={{fontSize:11,color:'#ddeeff',lineHeight:1.4,marginBottom:3}}>{a.title}</div>
            <div style={{display:'flex',gap:8}}>
              <span style={{fontSize:9,color:'#2a5070'}}>{a.source}</span>
              <span style={{fontSize:9,color:'#1e3858'}}>{a.time}</span>
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
          <div style={{fontSize:10,color:'#2a6080',marginTop:4,lineHeight:1.4,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{card.desc}</div>
          {card.url && <a href={card.url} target="_blank" rel="noopener" style={{fontSize:10,color:'#00e5ff',textDecoration:'none',display:'inline-block',marginTop:4}}>Read Online →</a>}
        </div>
      </div>
    </div>
  )

  return null
}

const STARTERS = [
  { icon:'🌤️', t:'Rewa ka mausam?' },
  { icon:'📰', t:'Koi khabar suna aaj ki' },
  { icon:'💡', t:'Ek interesting fact batao' },
  { icon:'🔢', t:'18% of 4500' },
  { icon:'😄', t:'Ek acha joke sunao' },
  { icon:'⚡', t:'Newton ka second law explain karo' },
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
  return <span style={{fontSize:10,color:'#2a5070',display:'flex',alignItems:'center',gap:3}}>{w.icon} {w.temp}</span>
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
      <div style={{fontSize:44,fontWeight:800,color:'#e8f4ff',letterSpacing:2,fontFamily:"'Space Mono',monospace"}}>{t}</div>
      <div style={{fontSize:12,color:'#1e3858',marginTop:2}}>{d}</div>
      {name&&<div style={{fontSize:13,color:'#2a5070',marginTop:8}}>Kya scene hai, {name}? 👋</div>}
    </div>
  )
}

// ── Message ────────────────────────────────────────────────
function Msg({ m, onFeed, onRetry, onPin, onEdit }:{ m:Msg; onFeed:(id:string,v:'up'|'down')=>void; onRetry:()=>void; onPin?:(id:string)=>void; onEdit?:(id:string,content:string)=>void }) {
  const isU = m.role==='user'
  const isErr = m.content.startsWith('⚠️')||m.content.startsWith('📡')
  const clean = cleanResponse(m.content)
  const time = new Date(m.timestamp).toLocaleTimeString('hi-IN',{hour:'2-digit',minute:'2-digit'})
  // Full markdown + KaTeX math rendering (v17)
  const html = renderMarkdown
  return (
    <div style={{padding:'4px 14px',display:'flex',flexDirection:'column',alignItems:isU?'flex-end':'flex-start'}}>
      {m.toolProgress&&<div style={{fontSize:10,color:'#2a6080',marginBottom:3,display:'flex',gap:4}}>⚙️ {m.toolProgress}</div>}
      {m.thinking&&(
        <details style={{marginBottom:4,maxWidth:'85%'}}>
          <summary style={{fontSize:10,color:'#4a5090',cursor:'pointer'}}>🧠 Reasoning</summary>
          <div style={{fontSize:11,color:'#2a3060',padding:'6px 8px',background:'rgba(100,80,200,.06)',borderRadius:8,marginTop:4,maxHeight:100,overflow:'auto',whiteSpace:'pre-wrap'}}>{m.thinking}</div>
        </details>
      )}
      <div style={{maxWidth:'85%',padding:'10px 13px',borderRadius:isU?'16px 16px 4px 16px':'4px 16px 16px 16px',
        background:isU?'rgba(0,229,255,.12)':isErr?'rgba(255,80,80,.08)':'rgba(255,255,255,.04)',
        border:`1px solid ${isU?'rgba(0,229,255,.2)':isErr?'rgba(255,80,80,.2)':'rgba(255,255,255,.06)'}`,
        color:'#ddeeff',fontSize:13.5,lineHeight:1.6}}>
        {m.streaming&&!clean?<span style={{color:'#2a5070'}}>...</span>:
          clean.includes('|||MAP|||') ? (() => {
            const [title, url] = clean.split('|||MAP|||')
            return (<>
              {title && <div style={{fontWeight:600,marginBottom:8,fontSize:12}}>{title}</div>}
              <iframe src={url} width="100%" height={200} style={{borderRadius:8,border:'none'}} loading="lazy" title="Map"/>
            </>)
          })() :
          /!\[image\]\(https?:/.test(clean) ? (() => {
            const imgMatch = clean.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/)
            const textPart = clean.replace(/!\[.*?\]\(https?:\/\/[^\)]+\)/g,'').trim()
            return (<>
              {textPart && <div style={{marginBottom:8}} dangerouslySetInnerHTML={{__html:html(textPart)}}/>}
              {imgMatch && <img src={imgMatch[1]} alt="Generated" style={{maxWidth:'100%',borderRadius:8,display:'block'}} loading="lazy" onError={e=>(e.currentTarget.style.display='none')}/>}
            </>)
          })() :
          <span dangerouslySetInnerHTML={{__html:html(clean)}}/>
        }
        {m.streaming&&<span style={{display:'inline-block',width:2,height:14,background:'#00e5ff',marginLeft:2,verticalAlign:'middle',animation:'blink 1s step-end infinite'}}/>}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8,marginTop:3}}>
        <span style={{fontSize:9,color:'#1a3050',fontFamily:'monospace'}}>{time}</span>
        {isU&&!m.streaming&&<button onClick={()=>onEdit?.(m.id,m.content)} style={{background:'none',border:'none',color:'#1a3050',fontSize:10,cursor:'pointer'}} title="Edit">✏️</button>}
        {!isU&&!m.streaming&&(<>
          <button onClick={()=>onFeed(m.id,'up')} style={{background:'none',border:'none',cursor:'pointer',fontSize:12,opacity:m.feedback==='up'?1:.25}} title="Badiya tha">👍</button>
          <button onClick={()=>onFeed(m.id,'down')} style={{background:'none',border:'none',cursor:'pointer',fontSize:12,opacity:m.feedback==='down'?1:.25}} title="Theek nahi tha">👎</button>
          <button onClick={()=>navigator.clipboard?.writeText(clean).catch(()=>{})} style={{background:'none',border:'none',color:'#1a3050',fontSize:11,cursor:'pointer'}} title="Copy">⎘</button>
          <button onClick={()=>onPin?.(m.id)} style={{background:'none',border:'none',color:m.pinned?'#ffab00':'#1a3050',fontSize:11,cursor:'pointer'}} title="Pin">📌</button>
          <button onClick={()=>navigator.share?navigator.share({text:clean}).catch(()=>{}):navigator.clipboard?.writeText(clean).catch(()=>{})} style={{background:'none',border:'none',color:'#1a3050',fontSize:11,cursor:'pointer'}} title="Share">↗</button>
          {isErr&&<button onClick={onRetry} style={{padding:'2px 8px',borderRadius:10,border:'1px solid rgba(255,80,80,.3)',color:'#ff6060',background:'none',fontSize:10,cursor:'pointer'}}>↺ Retry</button>}
        </>)}
      </div>
      {m.toolsUsed?.length?<div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:2}}>{m.toolsUsed.map(t=><span key={t} style={{fontSize:9,padding:'1px 6px',borderRadius:8,background:'rgba(0,229,255,.06)',color:'#1e4060'}}>{t.replace(/_/g,' ')}</span>)}</div>:null}
      {m.card && <div style={{maxWidth:'85%'}}><RichCardView card={m.card}/></div>}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────
export default function Page() {
  const [msgs,setMsgs]=useState<Msg[]>([])
  const [input,setInput]=useState('')
  const [loading,setLoad]=useState(false)
  const [mode,setMode]=useState<'flash'|'think'|'deep'>('flash')
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
  const taRef=useRef<HTMLTextAreaElement>(null)
  const botRef=useRef<HTMLDivElement>(null)
  // Smart contextual chips based on last AI message topic
  const lastAIContent = msgs.filter(m=>m.role==='assistant'&&!m.streaming).slice(-1)[0]?.content||''
  const chips = (() => {
    const c = lastAIContent.toLowerCase()
    if (/formula|equation|law|theorem|physics|chemistry|neet|jee|\$/.test(c))
      return ['Aur formulas do','Example solve karo','Hindi mein explain karo','NEET question do']
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
    // DB maintenance on start
    runMaintenance().catch(()=>{})
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
          else setProactive(ev.message)
        },3000)
      }).catch(()=>{})
      return ()=>clearInterval(ri)
    })()
  },[])

  useEffect(()=>{ botRef.current?.scrollIntoView({behavior:msgs.length>3?'smooth':'instant'}) },[msgs,loading])

  const handleInput=(v:string)=>{
    setInput(v)
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

  const send=useCallback(async(text:string)=>{
    if(!text.trim()||loading) return
    haptic('light')
    setSlashHints([])
    // Check for slash command first
    const slashParsed = parseSlashCommand(text)
    if (slashParsed) {
      setInput('')
      await executeSlash(slashParsed.cmd, slashParsed.arg)
      return
    }
    setLoad(true); setInput(''); setUrlChip(''); setProactive(null)
    const mood=detectMood(text)
    const uId='u_'+Date.now(), aId='a_'+Date.now()
    const uMsg:Msg={id:uId,role:'user',content:text,timestamp:Date.now(),mode}
    const ph:Msg={id:aId,role:'assistant',content:'',timestamp:Date.now(),streaming:true,mode}
    setMsgs(p=>[...p,uMsg,ph])
    const userTs = Date.now()
    saveChat({role:'user',content:text,timestamp:userTs,mood}).catch(()=>{})
    syncSaveChat({role:'user',content:text,timestamp:userTs,mood}).catch(()=>{})
    trackWeeklyChat()
    trackHabit(text).catch(()=>{})
    try{localStorage.setItem('jarvis_last_topic',JSON.stringify({topic:text.slice(0,40),date:new Date().toDateString()}))}catch{}

    try{
      // Semantic memory: TF-IDF finds relevant memories (offline, zero API)
      const [basicCtx, semanticCtx] = await Promise.all([
        buildMemoryContext().catch(()=>''),
        buildSemanticContext(text, 600).catch(()=>''),
      ])
      const memCtx = semanticCtx || basicCtx
      if(mode==='deep'){
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
                const fin:Msg={id:aId,role:'assistant',content:c,timestamp:Date.now(),streaming:false,toolsUsed:d.toolsUsed||[],toolProgress:'',mode,card:d.card||undefined}
                setMsgs(p=>p.map(m=>m.id===aId?fin:m))
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
          body:JSON.stringify({message:text,chatMode:mode,history:msgs.slice(-10).map(m=>({role:m.role,content:m.content})),memoryContext:memCtx})})
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
                const fin:Msg={id:aId,role:'assistant',content:c,thinking:thk,timestamp:Date.now(),streaming:false,mode}
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
    const gl=userMsg.match(/\b(UPSC|JEE|NEET|SSC|GATE|MBA|IAS|B\.?Tech)\b/i)
    if(gl) await setProfile('goal',gl[0]).catch(()=>{})
    // Flush sync queue silently
    flushSyncQueue().then(r=>setSyncOk(r.failed===0)).catch(()=>setSyncOk(false))
  }


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
    <div style={{position:'fixed',inset:0,display:'flex',flexDirection:'column',background:'#090d18'}}>
      <div className="bg-grid"/>

      {searchOpen&&(
        <div style={{position:'absolute',inset:0,zIndex:200,background:'rgba(9,13,24,.98)',display:'flex',flexDirection:'column'}}>
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
              style={{flex:1,padding:'9px 12px',borderRadius:10,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'#e8f4ff',fontSize:14,outline:'none'}}/>
            <button onClick={()=>{setSearchOpen(false);setSearchQ('');setSearchResults(null)}}
              style={{padding:'9px 13px',borderRadius:10,background:'rgba(255,255,255,.06)',border:'none',color:'#e8f4ff',fontSize:14,cursor:'pointer'}}>✕</button>
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
            {searchLoading&&<div style={{textAlign:'center',padding:20,color:'#1e3858'}}>🔍 Search ho raha hai...</div>}

            {/* Current session results */}
            {!searchLoading&&searchQ.length>1&&(()=>{
              const cur=msgs.filter(m=>m.content.toLowerCase().includes(searchQ.toLowerCase()))
              const db=searchResults||[]
              const allResults=[
                ...cur.map(m=>({id:m.id,role:m.role,content:m.content,timestamp:m.timestamp,source:'current'})),
                ...db.filter(d=>!cur.some(c=>c.timestamp===d.timestamp)).map(d=>({...d,id:String(d.id),source:'history'}))
              ].sort((a,b)=>b.timestamp-a.timestamp)

              if(!allResults.length) return <div style={{textAlign:'center',padding:'40px 0',color:'#1e3858',fontSize:13}}>"{searchQ}" — koi result nahi mila</div>

              return allResults.map(m=>(
                <div key={m.id} onClick={()=>{setSearchOpen(false);setSearchQ('');setSearchResults(null)}}
                  style={{padding:'10px 12px',background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,marginBottom:8,cursor:'pointer',borderLeft:`2px solid ${m.source==='current'?'#00e5ff':'#a78bfa'}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:10,color:m.role==='user'?'#00e5ff':'#a78bfa',fontWeight:600}}>{m.role==='user'?'Tu':'JARVIS'}</span>
                    <span style={{fontSize:9,color:'#1e3858'}}>{new Date(m.timestamp).toLocaleDateString('hi-IN',{day:'numeric',month:'short'})} · {m.source==='history'?'📚':'🔴'}</span>
                  </div>
                  <div style={{fontSize:12,color:'#c8dff0',lineHeight:1.5}}>
                    {m.content.replace(new RegExp(`(${searchQ})`, 'gi'), '**$1**').slice(0,180).split('**').map((part:string,i:number)=>
                      i%2===1 ? <mark key={i} style={{background:'rgba(0,229,255,.25)',color:'#00e5ff',borderRadius:2,padding:'0 1px'}}>{part}</mark>
                               : <span key={i}>{part}</span>
                    )}
                  </div>
                </div>
              ))
            })()}

            {/* Empty state */}
            {!searchQ&&(
              <div style={{textAlign:'center',padding:'30px 0',color:'#1e3858'}}>
                <div style={{fontSize:32,marginBottom:10}}>🔍</div>
                <div style={{fontSize:13}}>Koi bhi word type karo</div>
                <div style={{fontSize:11,marginTop:4}}>Current chat + poori history mein dhundega</div>
              </div>
            )}
          </div>
        </div>
      )}

      {showInstall&&installPrompt&&(
        <div style={{position:'fixed',bottom:80,left:12,right:12,zIndex:100,background:'rgba(9,13,24,.97)',border:'1px solid rgba(0,229,255,.2)',borderRadius:16,padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
          <div style={{fontSize:20}}>🤖</div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:600,color:'#e8f4ff'}}>JARVIS ko install karo</div>
            <div style={{fontSize:10,color:'#2a5070'}}>Home screen pe add karo — offline bhi kaam karega</div>
          </div>
          <button onClick={()=>{installPrompt.prompt();setShowInstall(false)}} style={{padding:'7px 14px',borderRadius:10,background:'rgba(0,229,255,.15)',border:'1px solid rgba(0,229,255,.3)',color:'#00e5ff',fontSize:12,cursor:'pointer',whiteSpace:'nowrap'}}>Install</button>
          <button onClick={()=>setShowInstall(false)} style={{background:'none',border:'none',color:'#1e3858',fontSize:16,cursor:'pointer'}}>✕</button>
        </div>
      )}

      {weeklyPrompt&&(
        <div style={{margin:'8px 14px',padding:'12px 14px',background:'rgba(167,139,250,.06)',border:'1px solid rgba(167,139,250,.15)',borderRadius:12,display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:12,color:'#8a70d0',flex:1}}>📊 Hafte ka summary sunoge?</span>
          <button onClick={async()=>{setWeeklyPrompt(false);const s=await generateWeeklySummary();send(`Weekly summary: ${s}`)}} style={{padding:'4px 10px',borderRadius:10,background:'rgba(167,139,250,.1)',border:'1px solid rgba(167,139,250,.2)',color:'#a78bfa',fontSize:11,cursor:'pointer'}}>Haan</button>
          <button onClick={()=>setWeeklyPrompt(false)} style={{background:'none',border:'none',color:'#1e3858',fontSize:14,cursor:'pointer'}}>✕</button>
        </div>
      )}

      {editingId&&(
        <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.92)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{width:'100%',maxWidth:400,background:'#0c1422',border:'1px solid rgba(0,229,255,.2)',borderRadius:16,padding:20}}>
            <div style={{fontSize:13,fontWeight:600,color:'#e8f4ff',marginBottom:12}}>✏️ Message Edit karo</div>
            <textarea value={editText} onChange={e=>setEditText(e.target.value)} rows={4}
              style={{width:'100%',padding:'10px 12px',borderRadius:10,background:'rgba(255,255,255,.04)',border:'1px solid rgba(0,229,255,.2)',color:'#e8f4ff',fontSize:13,resize:'none',outline:'none',boxSizing:'border-box',fontFamily:'inherit',lineHeight:1.5}}/>
            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button onClick={submitEdit} style={{flex:1,padding:'11px',borderRadius:10,background:'rgba(0,229,255,.12)',border:'1px solid rgba(0,229,255,.3)',color:'#00e5ff',fontSize:13,fontWeight:600,cursor:'pointer'}}>↑ Re-send</button>
              <button onClick={()=>{setEditingId(null);setEditText('')}} style={{flex:1,padding:'11px',borderRadius:10,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',color:'#2a5070',fontSize:13,cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {onboard&&(
        <div style={{position:'absolute',inset:0,zIndex:100,background:'rgba(0,0,0,.92)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{background:'#0c1422',border:'1px solid rgba(0,229,255,.2)',borderRadius:20,padding:28,width:'100%',maxWidth:360}}>
            <div style={{fontSize:36,textAlign:'center',marginBottom:10}}>🤖</div>
            <div style={{fontSize:20,fontWeight:700,color:'#e8f4ff',textAlign:'center',marginBottom:6}}>Pehle milte hain!</div>
            <div style={{fontSize:12,color:'#3a6080',textAlign:'center',marginBottom:20,lineHeight:1.6}}>
              Apna naam batao — JARVIS hamesha yaad rakhega aur teri baaton mein context aayega.
            </div>
            <input value={oIn} onChange={e=>setOIn(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitOnboard()}
              placeholder="Apna naam..." autoFocus
              style={{width:'100%',padding:'13px 14px',borderRadius:12,background:'rgba(255,255,255,.04)',border:'1px solid rgba(0,229,255,.2)',color:'#e8f4ff',fontSize:15,outline:'none',boxSizing:'border-box',marginBottom:12}}/>
            <button onClick={submitOnboard} disabled={!oIn.trim()}
              style={{width:'100%',padding:13,borderRadius:12,background:oIn.trim()?'rgba(0,229,255,.15)':'rgba(255,255,255,.03)',border:`1px solid ${oIn.trim()?'rgba(0,229,255,.3)':'rgba(255,255,255,.05)'}`,color:oIn.trim()?'#00e5ff':'#1e3858',fontSize:14,fontWeight:600,cursor:'pointer'}}>
              Shuru karo →
            </button>
          </div>
        </div>
      )}

      <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px',borderBottom:'1px solid rgba(255,255,255,.05)',flexShrink:0,background:'rgba(9,13,24,.96)',backdropFilter:'blur(10px)',zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div onClick={()=>setNavOpen(true)} style={{width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,rgba(0,229,255,.15),rgba(109,40,217,.15))',border:'1px solid rgba(0,229,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'#00e5ff',fontFamily:"'Space Mono',monospace",cursor:'pointer',userSelect:'none'}}>J</div>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:'#e8f4ff',letterSpacing:3,fontFamily:"'Space Mono',monospace"}}>JARVIS</div>
            <div style={{fontSize:8,color:'#0e1e30',letterSpacing:1}}>{name?name.toUpperCase():'AI'} · v20</div>
          </div>
          <WeatherBadge/>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <BatteryBadge/>
          {(['flash','think','deep'] as const).map(m=>(
            <button key={m} onClick={()=>setMode(m)}
              style={{padding:'3px 9px',borderRadius:10,fontSize:10,cursor:'pointer',border:`1px solid ${mode===m?'rgba(0,229,255,.3)':'rgba(255,255,255,.06)'}`,background:mode===m?'rgba(0,229,255,.1)':'transparent',color:mode===m?'#00e5ff':'#1e3858'}}>
              {m==='flash'?'⚡':m==='think'?'🧠':'🔬'}
            </button>
          ))}
          {sessionTitle&&<span style={{fontSize:9,color:'#1e4060',maxWidth:100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sessionTitle}</span>}
          <span style={{width:5,height:5,borderRadius:'50%',background:online?'#00e676':'#ff4444'}} title={online?'Online':'Offline'}/>
          {syncStatus==='syncing'&&<span style={{fontSize:8,color:'#ffab00',animation:'pulse 1s infinite'}}>⚡sync</span>}
          {syncStatus==='done'&&<span style={{fontSize:8,color:'#00e676'}}>☁️✓</span>}
          {!online&&<span style={{fontSize:9,color:'#ff4444',fontWeight:700}}>OFFLINE</span>}
          {isSupabaseConfigured()&&syncStatus==='idle'&&<span style={{fontSize:8,color:'#1e3858'}}>☁️</span>}
          {msgs.length>0&&<button onClick={()=>setSearchOpen(true)} style={{width:26,height:26,borderRadius:7,background:'transparent',border:'1px solid rgba(255,255,255,.06)',color:'#1e3040',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>🔍</button>}
          {msgs.length>2&&<button onClick={exportChat} title="Export chat" style={{width:26,height:26,borderRadius:7,background:'transparent',border:'1px solid rgba(255,255,255,.06)',color:'#1e3040',fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>⬇</button>}
          {msgs.length>0&&<button onClick={()=>{setMsgs([]);setSessionTitle('');startNewSession()}} style={{width:26,height:26,borderRadius:7,background:'transparent',border:'1px solid rgba(255,255,255,.06)',color:'#1e3040',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>⊘</button>}
        </div>
      </header>

      <main style={{flex:1,overflowY:'auto',paddingBottom:0}}>
        {msgs.length===0?(
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'0 16px'}}>
            <Clock name={name}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,width:'100%',maxWidth:440,marginTop:28}}>
              {STARTERS.map(s=>(
                <button key={s.t} onClick={()=>send(s.t)}
                  style={{padding:'12px',borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.05)',color:'#2a5070',fontSize:12,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:8}}>
                  <span>{s.icon}</span><span>{s.t}</span>
                </button>
              ))}
            </div>
            {/* Quick shortcuts row */}
            <div style={{display:'flex',gap:8,marginTop:16,width:'100%',maxWidth:440}}>
              {[
                {icon:'🇮🇳',label:'India Hub',href:'/india'},
                {icon:'📚',label:'Study',href:'/study'},
                {icon:'🔗',label:'Apps',href:'/apps'},
                {icon:'🎨',label:'Studio',href:'/studio'},
              ].map(({icon,label,href})=>(
                <a key={href} href={href}
                  style={{flex:1,padding:'8px 4px',borderRadius:10,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.04)',color:'#1e3858',fontSize:10,textDecoration:'none',display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                  <span style={{fontSize:16}}>{icon}</span>
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
            {lastAI&&!loading&&(
              <div style={{padding:'2px 14px 6px',display:'flex',gap:6,flexWrap:'wrap'}}>
                {chips.map(c=>(
                  <button key={c} onClick={()=>send(c)}
                    style={{padding:'5px 12px',borderRadius:20,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)',color:'#2a5070',fontSize:11,cursor:'pointer',whiteSpace:'nowrap'}}>
                    {c}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {proactive&&(
          <div style={{margin:'8px 14px',padding:'10px 14px',background:'rgba(0,229,255,.04)',border:'1px solid rgba(0,229,255,.1)',borderRadius:12,display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:12,color:'#2a6080',flex:1}}>💡 {proactive}</span>
            <button onClick={()=>send(proactive!)} style={{padding:'4px 10px',borderRadius:10,background:'rgba(0,229,255,.1)',border:'1px solid rgba(0,229,255,.2)',color:'#00e5ff',fontSize:11,cursor:'pointer'}}>Haan</button>
            <button onClick={()=>setProactive(null)} style={{background:'none',border:'none',color:'#1e3858',fontSize:14,cursor:'pointer'}}>✕</button>
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
            <button onClick={()=>setShowSummary(false)} style={{background:'none',border:'none',color:'#1e3858',fontSize:14,cursor:'pointer'}}>✕</button>
          </div>
        )}
        <div ref={botRef} style={{height:4}}/>
      </main>

      {urlChip&&(
        <div style={{padding:'4px 12px',display:'flex',alignItems:'center',gap:8,borderTop:'1px solid rgba(255,255,255,.04)',background:'rgba(9,13,24,.95)'}}>
          <span style={{fontSize:10,color:'#2a5070'}}>🔗 URL detect hua —</span>
          <button onClick={()=>{send(`Yeh URL summarize karo: ${urlChip}`);setInput('');setUrlChip('')}}
            style={{padding:'3px 10px',borderRadius:10,background:'rgba(0,229,255,.08)',border:'1px solid rgba(0,229,255,.2)',color:'#00e5ff',fontSize:11,cursor:'pointer'}}>✨ Summarize?</button>
          <button onClick={()=>setUrlChip('')} style={{background:'none',border:'none',color:'#1e3858',fontSize:13,cursor:'pointer'}}>✕</button>
        </div>
      )}

      {/* Slash command autocomplete */}
      {slashHints.length > 0 && (
        <div style={{position:'absolute',bottom:80,left:8,right:8,background:'rgba(9,13,24,.97)',border:'1px solid rgba(0,229,255,.15)',borderRadius:12,overflow:'hidden',zIndex:10}}>
          {slashHints.map(h=>(
            <button key={h.cmd} onClick={()=>{setInput(h.cmd+' ');setSlashHints([]);if(taRef.current) taRef.current.focus()}}
              style={{width:'100%',padding:'10px 14px',display:'flex',alignItems:'center',gap:10,background:'transparent',border:'none',cursor:'pointer',textAlign:'left',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
              <span style={{fontSize:16}}>{h.icon}</span>
              <div>
                <div style={{fontSize:13,color:'#00e5ff',fontWeight:600}}>{h.cmd}</div>
                <div style={{fontSize:11,color:'#1e3858'}}>{h.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div style={{padding:'8px 12px',borderTop:'1px solid rgba(255,255,255,.05)',background:'rgba(9,13,24,.97)',flexShrink:0}}>
        <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
          <textarea ref={taRef} value={input}
            onChange={e=>{handleInput(e.target.value);handleInputChange(e.target.value)}}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(input)}}}
            placeholder={loading?'Soch raha hun...':'Kuch poocho ya batao...'}
            rows={1} disabled={loading}
            style={{flex:1,padding:'10px 12px',borderRadius:12,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',color:'#e8f4ff',fontSize:14,resize:'none',outline:'none',lineHeight:1.5,maxHeight:120,overflow:'hidden',fontFamily:'inherit'}}/>
          <button onClick={()=>send(input)} disabled={!input.trim()||loading}
            style={{width:42,height:42,borderRadius:12,background:input.trim()&&!loading?'rgba(0,229,255,.15)':'rgba(255,255,255,.03)',border:`1px solid ${input.trim()&&!loading?'rgba(0,229,255,.3)':'rgba(255,255,255,.06)'}`,color:input.trim()&&!loading?'#00e5ff':'#1e3858',fontSize:18,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            {loading?<span style={{width:14,height:14,border:'2px solid rgba(0,229,255,.3)',borderTopColor:'#00e5ff',borderRadius:'50%',animation:'spin .8s linear infinite',display:'block'}}/>:'↑'}
          </button>
        </div>
        <div style={{fontSize:8,color:'#080f1a',textAlign:'center',marginTop:4}}>
          {mode==='flash'?'⚡ Groq Fast':mode==='think'?'🧠 DeepSeek R1':' 🔬 Gemini + Tools'} · Enter to send · v20
        </div>
      </div>

      <NavDrawer open={navOpen} onClose={()=>setNavOpen(false)}/>
      {toast&&<Toast msg={toast.msg} type={toast.type}/>}
      <style>{`
        @keyframes blink{50%{opacity:0}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .bg-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(0,229,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,.015) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;z-index:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(0,229,255,.1);border-radius:2px}
        main>*{position:relative;z-index:1}
      `}</style>
    </div>
  )
}
