'use client'
// app/page.tsx — JARVIS v27 Complete
// All features from v25 + MdRenderer (no overlap) + correct AI cascade
// Cascade: Server(Groq→Together→Gemini) → Pollinations → Puter(last)

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import MdRenderer from '../components/markdown/MdRenderer'
import { getTheme, setTheme, initTheme, THEME_META, type Theme } from '../lib/theme'
import { addMemory, buildMemoryContext, getProfile, setProfile, saveChat,
         runMaintenance, searchChats, createHistorySession, updateHistorySession } from '../lib/db'
import { checkAndFireReminders, requestNotifPermission, addReminder, parseReminderTime } from '../lib/reminders/index'
import { canRequest } from '../lib/rateLimit'
import { puterStream, loadPuter } from '../lib/providers/puter'
import { freeAIChat } from '../lib/providers/freeAI'
import { SLASH_COMMANDS, parseSlashCommand } from '../lib/chat/slashCommands'
import { generateAndSaveTitle, startNewSession } from '../lib/chat/autoTitle'
import { checkProactive, generateDailySummary } from '../lib/proactive/engine'
import { shouldShowWeeklySummary, generateWeeklySummary } from '../lib/proactive/weekly'
import { processAndSave } from '../lib/memory/extractor'
import NavDrawer from '../components/ui/NavDrawer'
import Toast from '../components/ui/Toast'

const ChatHistorySidebar = dynamic(() => import('../components/ui/ChatHistorySidebar'), { ssr: false })

/* ── Model Info ──────────────────────────────────────────── */
const MODEL_CHAIN = {
  flash: [
    { name:'Groq · Llama 4 Scout 17B', speed:'~1s', free:true, note:'Fastest. Server key chahiye.' },
    { name:'Together · Llama 3.3 70B', speed:'~2s', free:true, note:'Fallback. Better quality.' },
    { name:'Gemini 2.5 Flash', speed:'~3s', free:true, note:'Google. Agar Groq+Together fail.' },
    { name:'Pollinations (OpenAI)', speed:'~5s', free:true, note:'No key. Browser direct call.' },
    { name:'Puter · GPT-4o-mini', speed:'~6s', free:true, note:'Last resort. Puter login chahiye.' },
  ],
  think: [
    { name:'OpenRouter · DeepSeek R1', speed:'~8s', free:false, note:'Best reasoning. Key chahiye.' },
    { name:'Gemini 2.5 Flash', speed:'~5s', free:true, note:'Fallback. Good reasoning.' },
    { name:'Pollinations (OpenAI)', speed:'~5s', free:true, note:'No key fallback.' },
    { name:'Puter · GPT-4o-mini', speed:'~6s', free:true, note:'Last resort.' },
  ],
  deep: [
    { name:'Gemini 2.5 Flash + Tools', speed:'~5s', free:true, note:'Tools use karta hai. Weather, news etc.' },
    { name:'Pollinations (OpenAI)', speed:'~5s', free:true, note:'Fallback.' },
    { name:'Puter · GPT-4o-mini', speed:'~6s', free:true, note:'Last resort.' },
  ],
}

function ModelInfoDrawer({ open, onClose }: { open:boolean; onClose:()=>void }) {
  const [tab, setTab] = React.useState<'flash'|'think'|'deep'>('flash')
  if (!open) return null
  const chain = MODEL_CHAIN[tab]
  return (
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.85)',display:'flex',alignItems:'flex-end'}} onClick={onClose}>
      <div style={{width:'100%',background:'var(--bg-card)',borderRadius:'20px 20px 0 0',padding:'0 0 24px',maxHeight:'80vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'16px 16px 10px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:700}}>🤖 AI Model Chain</div>
            <div style={{fontSize:10,color:'var(--text-3)',marginTop:2}}>Pehle wala fail → agla try hota hai</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-3)',fontSize:20,cursor:'pointer'}}>✕</button>
        </div>

        {/* Mode tabs */}
        <div style={{display:'flex',padding:'8px 16px',gap:6}}>
          {(['flash','think','deep'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'7px',borderRadius:10,background:tab===t?'var(--accent-bg)':'rgba(255,255,255,.04)',border:`1px solid ${tab===t?'var(--border-a)':'var(--border)'}`,color:tab===t?'var(--accent)':'var(--text-3)',fontSize:12,fontWeight:600,cursor:'pointer'}}>
              {t==='flash'?'⚡ Flash':t==='think'?'🧠 Think':'🔬 Deep'}
            </button>
          ))}
        </div>

        {/* Chain */}
        <div style={{padding:'0 16px'}}>
          {chain.map((m,i)=>(
            <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 0',borderBottom:i<chain.length-1?'1px solid var(--border)':'none'}}>
              <div style={{width:22,height:22,borderRadius:'50%',background:i===0?'var(--accent-bg)':'rgba(255,255,255,.06)',border:`1px solid ${i===0?'var(--border-a)':'var(--border)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:i===0?'var(--accent)':'var(--text-3)',flexShrink:0,marginTop:2}}>{i+1}</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                  <span style={{fontSize:13,fontWeight:700,color:i===0?'var(--text)':'var(--text-2)'}}>{m.name}</span>
                  <span style={{fontSize:9,color:'#22c55e',background:'rgba(34,197,94,.1)',padding:'1px 6px',borderRadius:4}}>FREE</span>
                  <span style={{fontSize:9,color:'var(--text-4)',background:'rgba(255,255,255,.05)',padding:'1px 6px',borderRadius:4}}>{m.speed}</span>
                </div>
                <div style={{fontSize:11,color:'var(--text-3)'}}>{m.note}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Info box */}
        <div style={{margin:'10px 16px 0',padding:'10px 12px',background:'rgba(0,229,255,.04)',border:'1px solid rgba(0,229,255,.1)',borderRadius:10}}>
          <div style={{fontSize:11,color:'var(--text-3)',lineHeight:1.6}}>
            <strong style={{color:'var(--accent)'}}>Auto mode:</strong> Short question → ⚡ Flash · Long/deep question → 🧠 Think · Weather/news/image → 🔬 Deep
          </div>
        </div>
      </div>
    </div>
  )
}



/* ── TTS — speak JARVIS reply ────────────────────────────── */
async function speakText(text: string) {
  const clean = text.replace(/[*_`#>]/g,'').replace(/\$[^$]+\$/g,'').slice(0,500)
  // Browser TTS first (instant, free)
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(clean)
    utt.lang = 'hi-IN'; utt.rate = 1.1; utt.pitch = 1
    // Try Hindi voice
    const voices = window.speechSynthesis.getVoices()
    const hiVoice = voices.find(v => v.lang.startsWith('hi')) || voices.find(v => v.lang.startsWith('en-IN'))
    if (hiVoice) utt.voice = hiVoice
    window.speechSynthesis.speak(utt)
    return
  }
  // Fallback: Pollinations TTS
  try {
    const res = await fetch('/api/speech', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({text:clean}) })
    const d = await res.json()
    if (d.url) { const a=new Audio(d.url); a.play() }
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
  | { type:'links'; title:string; items:{icon:string;label:string;url:string}[] }
  | { type:'movie'; title:string; year:string; rating:string; poster:string; plot:string; genre:string }
  | { type:'book'; title:string; author:string; year:string; cover:string; desc:string; url:string }
  | { type:'github'; name:string; desc:string; stars:string; lang:string; url:string; forks:string }

interface Msg {
  id:string; role:'user'|'assistant'; content:string; timestamp:number
  streaming?:boolean; card?:RichCard; responseTime?:number
  mode?:string; feedback?:'up'|'down'; pinned?:boolean; isSystem?:boolean
  toolsUsed?:string[]; thinking?:string; provider?:string
}

/* ── Reply sound ─────────────────────────────────────────── */
function playReplySound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.setValueAtTime(880, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.12)
    g.gain.setValueAtTime(0.15, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
    o.start(); o.stop(ctx.currentTime + 0.18)
  } catch {}
}

/* ── Rich Card ───────────────────────────────────────────── */
function RichCardView({ card }:{ card:RichCard }) {
  const W:React.CSSProperties = { marginTop:8, borderRadius:12, overflow:'hidden', border:'1px solid var(--border-a)', background:'var(--bg-card)' }
  if (card.type==='image') return <div style={W}><img src={card.url} alt={card.prompt||''} style={{width:'100%',display:'block'}} onError={e=>(e.currentTarget.style.display='none')}/><div style={{padding:'5px 10px',fontSize:11,color:'var(--text-3)'}}>{card.prompt||'AI Image'}</div></div>
  if (card.type==='youtube') return <div style={W}><div style={{position:'relative',paddingBottom:'56.25%',height:0}}><iframe src={`https://www.youtube.com/embed/${card.videoId}?rel=0`} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',border:'none'}} allowFullScreen loading="lazy" title={card.title}/></div></div>
  if (card.type==='maps') return <div style={W}><div style={{fontSize:10,color:'#fb923c',padding:'7px 12px 3px'}}>📍 {card.query}</div><iframe src={card.embedUrl} style={{width:'100%',height:220,border:'none'}} loading="lazy" title="Map" allowFullScreen/></div>
  if (card.type==='weather') return <div style={W}><div style={{padding:'12px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div style={{fontSize:11,color:'var(--text-3)'}}>{card.city}</div><div style={{fontSize:30,fontWeight:700,color:'var(--accent)',lineHeight:1}}>{card.temp}</div><div style={{fontSize:11,color:'var(--text-3)',marginTop:2}}>{card.desc} · 💧{card.humidity}</div></div><div style={{fontSize:50}}>{card.icon}</div></div></div>
  if (card.type==='news') return <div style={W}><div style={{padding:'6px 0'}}>{card.articles.slice(0,4).map((a,i)=><a key={i} href={a.url} target="_blank" rel="noopener" style={{display:'block',padding:'8px 12px',borderBottom:'1px solid var(--border)',textDecoration:'none'}}><div style={{fontSize:11,color:'var(--text)',lineHeight:1.4,marginBottom:3}}>{a.title}</div><span style={{fontSize:9,color:'var(--text-3)'}}>{a.source} · {a.time}</span></a>)}</div></div>
  if (card.type==='music') return <div style={W}><div style={{display:'flex',gap:10,padding:'10px 12px',alignItems:'center'}}>{card.cover&&<img src={card.cover} alt="" style={{width:50,height:50,borderRadius:8,objectFit:'cover',flexShrink:0}} loading="lazy" onError={e=>(e.currentTarget.style.display='none')}/>}<div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:700,color:'var(--text)'}}>{card.title}</div><div style={{fontSize:10,color:'var(--text-3)',marginTop:2}}>🎤 {card.artist}</div>{card.previewUrl&&<audio controls style={{width:'100%',marginTop:5,height:30}} preload="none"><source src={card.previewUrl} type="audio/mpeg"/></audio>}</div></div></div>
  if (card.type==='links') return <div style={W}><div style={{padding:'10px 12px'}}><div style={{fontSize:11,fontWeight:700,color:'var(--text)',marginBottom:8}}>🔗 {card.title}</div>{card.items.map((it,i)=><a key={i} href={it.url} target="_blank" rel="noopener" style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',textDecoration:'none',color:'var(--text)',fontSize:11,marginBottom:4}}><span style={{fontSize:16}}>{it.icon}</span><span>{it.label}</span><span style={{marginLeft:'auto',color:'var(--text-4)',fontSize:10}}>→</span></a>)}</div></div>
  return null
}

/* ── Battery ─────────────────────────────────────────────── */
function BatteryBadge() {
  const [b,setB] = useState<number|null>(null)
  useEffect(()=>{
    ;(navigator as any).getBattery?.().then((bat:any)=>{
      setB(Math.round(bat.level*100))
      bat.addEventListener('levelchange',()=>setB(Math.round(bat.level*100)))
    })
  },[])
  if(b===null) return null
  return <span style={{fontSize:10,color:b<20?'#ff4444':b<50?'#ffab00':'var(--text-4)',display:'flex',alignItems:'center',gap:2}}>🔋{b}%</span>
}

/* ── Weather badge ───────────────────────────────────────── */
function WeatherBadge() {
  const [w,setW] = useState<{temp:string;icon:string}|null>(null)
  useEffect(()=>{
    const c = sessionStorage.getItem('jw')
    if(c){try{setW(JSON.parse(c))}catch{};return}
    if(!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async p=>{
      try{
        const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.coords.latitude}&longitude=${p.coords.longitude}&current=temperature_2m,weather_code&timezone=Asia%2FKolkata`)
        const d=await r.json()
        const ic:Record<string,string>={'0':'☀️','1':'🌤','2':'⛅','3':'☁️','45':'🌫','61':'🌧','80':'🌦','95':'⛈'}
        const data={temp:`${Math.round(d.current?.temperature_2m)}°`,icon:ic[String(Math.floor((d.current?.weather_code||0)/10)*10)]||'🌡️'}
        setW(data);sessionStorage.setItem('jw',JSON.stringify(data))
      }catch{}
    },()=>{})
  },[])
  if(!w) return null
  return <span style={{fontSize:10,color:'var(--text-3)',display:'flex',alignItems:'center',gap:3}}>{w.icon} {w.temp}</span>
}

/* ── Clock ───────────────────────────────────────────────── */
function Clock({name}:{name:string}) {
  const [t,setT]=useState(''); const [d,setD]=useState('')
  useEffect(()=>{
    const tick=()=>{
      const n=new Date()
      setT(n.toLocaleTimeString('hi-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit'}))
      setD(n.toLocaleDateString('hi-IN',{timeZone:'Asia/Kolkata',weekday:'short',day:'numeric',month:'short'}))
    }; tick(); const id=setInterval(tick,1000); return()=>clearInterval(id)
  },[])
  return (
    <div style={{textAlign:'center',padding:'24px 0 4px'}}>
      <div style={{fontSize:46,fontWeight:800,color:'var(--text)',letterSpacing:2,fontFamily:"'JetBrains Mono',monospace"}}>{t}</div>
      <div style={{fontSize:11,color:'var(--text-3)',marginTop:2}}>{d}</div>
      {name&&<div style={{fontSize:13,color:'var(--text-2)',marginTop:10}}>Kya scene hai, {name}? 👋</div>}
    </div>
  )
}

const STARTERS = [
  {icon:'🌤️',t:'Rewa ka mausam?',sub:'Aaj ka temp + forecast'},
  {icon:'📰',t:'Aaj ki top khabar?',sub:'India & world news'},
  {icon:'🧠',t:'Python sikhana hai',sub:'Beginner se shuru'},
  {icon:'🎵',t:'Song recommend karo',sub:'Mood batao'},
  {icon:'🪙',t:'Bitcoin aaj kitna hai?',sub:'Live crypto price'},
  {icon:'🥇',t:'Sone ka bhav?',sub:'Gold + silver 10g rate'},
  {icon:'📚',t:'NEET physics doubt',sub:'Formula + explanation'},
  {icon:'🚀',t:'JARVIS setup karo',sub:'Goals + reminders set'},
]

/* ── Main ────────────────────────────────────────────────── */
export default function Page() {
  const [msgs,setMsgs]=useState<Msg[]>([])
  const [input,setInput]=useState('')
  const [loading,setLoad]=useState(false)
  const [mode,setMode]=useState<'auto'|'flash'|'think'|'deep'>('auto')
  const [online,setOnline]=useState(true)
  const [name,setName]=useState('')
  const [onboard,setOnboard]=useState(false)
  const [oIn,setOIn]=useState('')
  const [toast,setToast]=useState<{msg:string;type:'success'|'error'|'info'}|null>(null)
  const [navOpen,setNavOpen]=useState(false)
  const [histOpen,setHistOpen]=useState(false)
  const [currentSessionId,setCurrentSessionId]=useState('')
  const [sessionTitle,setSessionTitle]=useState('')
  const [themeOpen,setThemeOpen]=useState(false)
  const [currentTheme,setCurrentTheme]=useState<Theme>('dark')
  const [plusOpen,setPlusOpen]=useState(false)
  const [slashHints,setSlashHints]=useState<typeof SLASH_COMMANDS>([])
  const [micActive,setMicActive]=useState(false)
  const [scrolledUp,setScrolledUp]=useState(false)
  const [proactive,setProactive]=useState<string|null>(null)
  const [showSummary,setShowSummary]=useState(false)
  const [weeklyPrompt,setWeeklyPrompt]=useState(false)
  const [urlChip,setUrlChip]=useState('')
  const [searchOpen,setSearchOpen]=useState(false)
  const [searchQ,setSearchQ]=useState('')
  const [searchResults,setSearchResults]=useState<any[]|null>(null)
  const [searchLoading,setSearchLoading]=useState(false)
  const [editingId,setEditingId]=useState<string|null>(null)
  const [editText,setEditText]=useState('')
  const [installPrompt,setInstallPrompt]=useState<any>(null)
  const [showInstall,setShowInstall]=useState(false)
  const [modelName,setModelName]=useState('')
  const [modelDrawerOpen,setModelDrawerOpen]=useState(false)
  const [userLocation,setUserLocation]=useState<{lat:number;lon:number;city:string}|null>(null)
  const [persona,setPersona]=useState<'jarvis'|'desi'|'sherlock'|'yoda'>('jarvis')
  const [attachedFile,setAttachedFile]=useState<{name:string;content:string;type:'file'|'image'}|null>(null)
  const [plusTab,setPlusTab]=useState<'attach'|'mode'|'persona'>('attach')
  const [forcedProvider,setForcedProvider]=useState<string|null>(null)

  const taRef=useRef<HTMLTextAreaElement>(null)
  const botRef=useRef<HTMLDivElement>(null)
  const mainRef=useRef<HTMLDivElement>(null)
  const abortRef=useRef<AbortController|null>(null)
  const micRef=useRef<any>(null)
  const fileInputRef=useRef<HTMLInputElement>(null)
  const cameraInputRef=useRef<HTMLInputElement>(null)
  const galleryInputRef=useRef<HTMLInputElement>(null)
  const router=useRouter()

  const lastAI=msgs.filter(m=>m.role==='assistant'&&!m.streaming).slice(-1)[0]?.content||''
  const showToast=(msg:string,type:'success'|'error'|'info'='info')=>{setToast({msg,type});setTimeout(()=>setToast(null),2500)}

  /* ── App command executor ────────────────────────────── */
  const execAppCmd=useCallback((cmd:string)=>{
    if(!cmd) return
    const [action,...args]=cmd.split(':'); const arg=args.join(':').trim()
    switch(action){
      case 'navigate': if(arg){setNavOpen(false);router.push(arg)};break
      case 'openNav': setNavOpen(true);break
      case 'closeNav': setNavOpen(false);break
      case 'setMode': if(['flash','think','deep','auto'].includes(arg))setMode(arg as any);break
      case 'clearChat': setMsgs([]);break
      case 'toast': if(arg)setToast({msg:arg,type:'info'});break
      case 'toastOk': if(arg)setToast({msg:arg,type:'success'});break
      case 'toastErr': if(arg)setToast({msg:arg,type:'error'});break
      case 'openSearch': setSearchOpen(true);break
      case 'setInput': if(arg)setInput(arg);break
      case 'addReminder':{const rmsg=arg;const parsed=parseReminderTime(rmsg);if(parsed){addReminder(rmsg,parsed);setToast({msg:`⏰ Reminder: ${rmsg}`,type:'success'})};break}
      case 'openSettings': router.push('/settings');break
    }
  },[router])

  /* ── Init ────────────────────────────────────────────── */
  useEffect(()=>{
    initTheme(); setCurrentTheme(getTheme())
    setOnline(navigator.onLine)
    window.addEventListener('online',()=>setOnline(true))
    window.addEventListener('offline',()=>setOnline(false))
    const beforeInstall=(e:any)=>{e.preventDefault();setInstallPrompt(e);setShowInstall(true)}
    window.addEventListener('beforeinstallprompt',beforeInstall)
    runMaintenance().catch(()=>{})
    createHistorySession('New Chat').then(id=>{if(id)setCurrentSessionId(id)}).catch(()=>{})
    if(shouldShowWeeklySummary()) setTimeout(()=>setWeeklyPrompt(true),5000)
    if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{})
    loadPuter().catch(()=>{})
    // Auto-fetch user location
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(async p=>{
        try{
          const{latitude:lat,longitude:lon}=p.coords
          // Reverse geocode with Nominatim
          const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,{headers:{'User-Agent':'JARVIS/1.0'}})
          if(r.ok){const d=await r.json();const city=d.address?.city||d.address?.town||d.address?.village||d.address?.state||'Your Location';setUserLocation({lat,lon,city})}
        }catch{}
      },()=>{},{timeout:8000,maximumAge:300000})
    }

    ;(async()=>{
      const n=await getProfile('name') as string|null
      if(!n){setOnboard(true)}
      else{
        setName(n)
        const today=new Date().toDateString()
        if(localStorage.getItem('jarvis_greet')!==today){
          const h=new Date().getHours()
          const g=h<5?'Raat ko bhi':h<12?'Subah ho gayi':h<17?'Din mein':h<21?'Shaam ho gayi':'Raat ho gayi'
          setMsgs([{id:'g0',role:'assistant',content:`${g}, ${n}! 👋 Kya scene hai?`,timestamp:Date.now(),isSystem:true}])
          localStorage.setItem('jarvis_greet',today)
        }
        try{const lt=JSON.parse(localStorage.getItem('jarvis_last_topic')||'null');if(lt&&lt.date!==new Date().toDateString())setTimeout(()=>setProactive(`Kal "${lt.topic.slice(0,30)}" ke baare mein baat thi — aur kuch?`),2000)}catch{}
      }
      checkAndFireReminders(showToast)
      setInterval(()=>checkAndFireReminders(showToast),30000)
      setTimeout(()=>requestNotifPermission(),8000)
      checkProactive().then(ev=>{if(ev?.message)setTimeout(()=>{if(ev.action==='daily_summary')setShowSummary(true);else setProactive(ev.message)},3000)}).catch(()=>{})
    })()

    return()=>{window.removeEventListener('online',()=>{}); window.removeEventListener('offline',()=>{})}
  },[])

  useEffect(()=>{if(!scrolledUp)botRef.current?.scrollIntoView({behavior:msgs.length>3?'smooth':'instant'})},[msgs,loading,scrolledUp])
  useEffect(()=>{
    if(!currentSessionId||msgs.length<2) return
    const ns=msgs.filter(m=>!m.isSystem&&!m.streaming); if(!ns.length) return
    const hm=ns.map(m=>({role:m.role,content:m.content,timestamp:m.timestamp}))
    const fu=ns.find(m=>m.role==='user')?.content||'New Chat'
    updateHistorySession(currentSessionId,hm,sessionTitle||fu.slice(0,50)).catch(()=>{})
  },[msgs,currentSessionId,sessionTitle])

  const handleInput=(v:string)=>{
    setInput(v)
    if(themeOpen)setThemeOpen(false)
    const urlM=v.match(/https?:\/\/[^\s]{10,}/); setUrlChip(urlM?urlM[0]:'')
    if(taRef.current){taRef.current.style.height='auto';taRef.current.style.height=Math.min(taRef.current.scrollHeight,130)+'px'}
    if(v.startsWith('/')&&!v.includes(' ')){const q=v.slice(1).toLowerCase();setSlashHints(q?SLASH_COMMANDS.filter(c=>c.cmd.slice(1).startsWith(q)):SLASH_COMMANDS.slice(0,6))}
    else setSlashHints([])
  }

  const getEffectiveMode=(text:string,m:typeof mode)=>{
    if(m!=='auto') return m
    const words = text.trim().split(/\s+/).length
    const t = text.toLowerCase()

    // DEEP mode: needs tools/live data
    if(/weather|mausam|news|khabar|song|music|map|price|rate|gold|silver|bitcoin|crypto|movie|film|wiki|search|image|photo|draw/i.test(t)) return 'deep'

    // THINK mode: complex reasoning needed
    if(/syllabus|explain.*detail|kaise kaam|difference between|compare|pros.*cons|why|kyon|mechanism|reaction|formula|theorem|proof|essay|article|long|detail|elaborate|comprehensive|full.*explain/i.test(t)) return 'think'

    // THINK for long questions (>12 words = complex)
    if(words > 12) return 'think'

    // FLASH for short simple questions (<5 words or simple patterns)
    return 'flash'
  }

  /* ── SEND ── correct cascade: Server(Groq→Gemini) → Pollinations → Puter ─ */
  const send=useCallback(async(text:string)=>{
    const fileCtx=attachedFile?`\n\n[Attached ${attachedFile.type==='image'?'Image':'File'}: ${attachedFile.name}]\n${attachedFile.type==='file'?attachedFile.content:'[Image data attached]'}`:''
    const t=(text.trim()+(fileCtx?'\n'+fileCtx:'')).trim(); if(!t||loading) return
    if(attachedFile)setAttachedFile(null)
    if(!canRequest()){showToast('Thoda ruk — rate limit!','error');return}
    setInput(''); setSlashHints([]); setUrlChip('')
    if(taRef.current)taRef.current.style.height='auto'

    const uId='u_'+Date.now(); const aId='a_'+Date.now()
    const uMsg:Msg={id:uId,role:'user',content:t,timestamp:Date.now(),mode}
    const effectiveMode=getEffectiveMode(t,mode)
    const statusMsg=
      /image|photo|draw/i.test(t)?'🎨 Image bana raha hoon...':
      /weather|mausam/i.test(t)?'🌤️ Mausam check kar raha hoon...':
      /news|khabar/i.test(t)?'📰 News dhoondh raha hoon...':
      /neet|physics|math/i.test(t)?'📚 Soch raha hoon...':'💭 Soch raha hoon...'

    setMsgs(p=>[...p,uMsg,{id:aId,role:'assistant',content:statusMsg,timestamp:Date.now(),streaming:true}])
    setLoad(true)
    localStorage.setItem('jarvis_last_topic',JSON.stringify({topic:t,date:new Date().toDateString()}))

    const ab=new AbortController(); abortRef.current=ab
    const start=Date.now()
    let replied=false, full=''
    const hist=msgs.slice(-12).filter(m=>!m.isSystem&&!m.streaming).map(m=>({role:m.role,content:m.content}))
    const memCtx=await buildMemoryContext().catch(()=>'')
    // Inject live location into context
    const locCtx = userLocation ? `User ki current location: ${userLocation.city} (${userLocation.lat.toFixed(4)},${userLocation.lon.toFixed(4)})` : ''

    const PERSONAS = {
      jarvis: `Tum JARVIS ho — "Jons Bhai". Hinglish mein baat karo. Short (1-4 lines). Sarcastic but caring. Direct.`,
      desi: `Tu ek desi yaar hai. Hinglish mein baat kar. Shuruaat mein "Yaar," ya "Bhai," se karo. Bahut casual, funny, street-smart. Short answers.`,
      sherlock: `You are Sherlock Holmes. Respond with deductive reasoning, sharp observations, slight condescension but helpfulness. Occasionally say "Elementary". Concise.`,
      yoda: `Like Yoda, speak you must. Word order inverted, wise you are. Short sentences. "Hmmmm." often say. Help you I will.`
    }
    const SYS=PERSONAS[persona]+`\nMath: KaTeX ($formula$ inline, $$display$$). "As an AI" kabhi mat kaho. NEET: proper formulas.`
    const locStr = userLocation ? `\n\nUser Location: ${userLocation.city} (${userLocation.lat.toFixed(3)},${userLocation.lon.toFixed(3)})` : ''
    const aiMsgs=[{role:'system',content:SYS+(memCtx?`\n\nContext:\n${memCtx}`:'')+locStr}, ...hist, {role:'user',content:t}]

    // ── Level 1: Server stream (Groq Llama4 → Together → Gemini 2.5) ──────
    try{
      const route=effectiveMode==='deep'?'/api/jarvis/deep-stream':'/api/jarvis/stream'
      const res=await fetch(route,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:t,chatMode:effectiveMode,history:hist,memoryContext:memCtx+(locCtx?'\n\n'+locCtx:''),userLat:userLocation?.lat,userLon:userLocation?.lon,userCity:userLocation?.city,forceProvider:forcedProvider||undefined}),
        signal:AbortSignal.timeout(25000),
      })
      if(res.ok&&res.body){
        const reader=res.body.getReader(); const dec=new TextDecoder()
        while(true){
          const{done,value}=await reader.read(); if(done) break
          for(const line of dec.decode(value).split('\n')){
            if(!line.startsWith('data: ')||line==='data: [DONE]') continue
            try{
              const d=JSON.parse(line.slice(6))
              if(d.type==='token'&&d.token){full+=d.token;replied=true;setMsgs(p=>p.map(m=>m.id===aId?{...m,content:full}:m))}
              if(d.type==='model'&&d.name)setModelName(d.name)
              if(d.type==='card')setMsgs(p=>p.map(m=>m.id===aId?{...m,card:d.card}:m))
              if(d.type==='learn')addMemory(d.content,d.memType||'fact').catch(()=>{})
              if(d.type==='appCommand')execAppCmd(d.cmd)
            }catch{}
          }
        }
      }
    }catch(e:any){
      if(e?.name==='AbortError'){setMsgs(p=>p.map(m=>m.id===aId?{...m,streaming:false}:m));setLoad(false);return}
    }

    // ── Level 2: Pollinations (fast, free, no key) ──────────────────────
    if(!replied||!full.trim()){
      full=''
      await freeAIChat(aiMsgs,
        tok=>{full+=tok;replied=true;setMsgs(p=>p.map(m=>m.id===aId?{...m,content:full}:m))},
        done=>{replied=true;full=done;setMsgs(p=>p.map(m=>m.id===aId?{...m,content:full}:m))},
        ()=>{}
      )
    }

    // ── Level 2.5: If forcedProvider=puter skip to puter ─────────────────
    if(forcedProvider==='puter' && (!replied||!full.trim())){
      full=''; setModelName('Puter · GPT-4o-mini')
      await puterStream(aiMsgs,
        tok=>{full+=tok;replied=true;setMsgs(p=>p.map(m=>m.id===aId?{...m,content:full}:m))},
        done=>{replied=true;full=done;setMsgs(p=>p.map(m=>m.id===aId?{...m,content:full}:m))},
        ()=>{}
      )
    }

    // ── Level 3: Puter (last resort) ────────────────────────────────────
    if(!replied||!full.trim()){
      full=''
      setModelName('Puter · GPT-4o-mini')
      await puterStream(aiMsgs,
        tok=>{full+=tok;replied=true;setMsgs(p=>p.map(m=>m.id===aId?{...m,content:full}:m))},
        done=>{replied=true;full=done;setMsgs(p=>p.map(m=>m.id===aId?{...m,content:full}:m))},
        ()=>{}
      )
    }

    if(!replied||!full.trim()){
      setMsgs(p=>p.map(m=>m.id===aId?{...m,content:'Koi bhi provider respond nahi kar raha. Settings mein Groq/Gemini key check karo ya Puter login karo.'}:m))
    }

    const rt=Date.now()-start
    setMsgs(p=>p.map(m=>m.id===aId?{...m,streaming:false,responseTime:rt,mode:effectiveMode}:m))
    if(replied) playReplySound()

    // Background tasks
    if(msgs.filter(m=>m.role==='user').length===0&&full){
      generateAndSaveTitle(t,full,currentSessionId).then(ti=>{if(ti)setSessionTitle(ti)}).catch(()=>{})
    }
    processAndSave(t,full,'neutral').catch(()=>{})
    setLoad(false)
  },[msgs,loading,mode,currentSessionId,execAppCmd])

  /* ── File attach handler ────────────────────────────── */
  const handleFileAttach=(e:React.ChangeEvent<HTMLInputElement>,type:'file'|'image')=>{
    const file=e.target.files?.[0]; if(!file) return
    if(type==='image'){
      const reader=new FileReader()
      reader.onload=()=>{
        const b64=(reader.result as string).split(',')[1]||''
        setAttachedFile({name:file.name,content:b64,type:'image'})
        showToast(`📷 ${file.name} attached`,'success')
      }
      reader.readAsDataURL(file)
    } else {
      const reader=new FileReader()
      reader.onload=()=>{
        const text=(reader.result as string).slice(0,8000)
        setAttachedFile({name:file.name,content:text,type:'file'})
        showToast(`📄 ${file.name} attached`,'success')
      }
      reader.readAsText(file)
    }
    e.target.value=''
    setPlusOpen(false)
  }

  /* ── Mic ─────────────────────────────────────────────── */
  const toggleMic=()=>{
    if(micActive){micRef.current?.stop();setMicActive(false);return}
    const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition
    if(!SR){showToast('Speech recognition support nahi hai','error');return}
    const r=new SR(); r.lang='hi-IN'; r.interimResults=true; r.continuous=false
    r.onresult=(e:any)=>{const txt=Array.from(e.results).map((rr:any)=>rr[0].transcript).join('');setInput(txt);handleInput(txt)}
    r.onend=()=>setMicActive(false)
    r.start(); micRef.current=r; setMicActive(true)
  }

  /* ── Regenerate ──────────────────────────────────────── */
  const regenerate=useCallback(()=>{
    const lastUser=msgs.filter(m=>m.role==='user').slice(-1)[0]
    const lastAIMsg=msgs.filter(m=>m.role==='assistant').slice(-1)[0]
    if(!lastUser||loading) return
    setMsgs(p=>p.filter(m=>m.id!==lastAIMsg?.id))
    setTimeout(()=>send(lastUser.content),50)
  },[msgs,loading,send])

  /* ── Edit ────────────────────────────────────────────── */
  const submitEdit=()=>{
    if(!editText.trim()||!editingId) return
    const newText=editText.trim()
    setMsgs(p=>p.filter(m=>!(m.id===editingId||(m.role==='assistant'&&p.findIndex(x=>x.id===editingId)<p.findIndex(x=>x.id===m.id)))))
    setEditingId(null); setEditText(''); send(newText)
  }

  /* ── Export ──────────────────────────────────────────── */
  const exportChat=useCallback(()=>{
    const title=sessionTitle||'JARVIS Chat'; const date=new Date().toLocaleDateString('en-IN')
    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#111}h1{font-size:18px;border-bottom:2px solid #00b4d8;padding-bottom:8px;color:#00b4d8}.msg{margin:12px 0;padding:10px 14px;border-radius:8px}.user{background:#e8f4ff;text-align:right}.jarvis{background:#f5f5f5}.role{font-size:10px;font-weight:bold;color:#666;margin-bottom:4px}.content{font-size:13px;line-height:1.6;white-space:pre-wrap}</style></head><body><h1>🤖 ${title}</h1><p style="color:#666;font-size:12px">Date: ${date} · ${msgs.filter(m=>!m.isSystem).length} messages</p>${msgs.filter(m=>!m.isSystem).map(m=>`<div class="msg ${m.role==='user'?'user':'jarvis'}"><div class="role">${m.role==='user'?'You':'JARVIS'} · ${new Date(m.timestamp).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div><div class="content">${m.content.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div></div>`).join('')}</body></html>`
    const w=window.open('','_blank'); if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),500)}
    showToast('💾 Chat exported!','success')
  },[msgs,sessionTitle])

  /* ── Smart chips ─────────────────────────────────────── */
  const chips=(()=>{
    const c=lastAI.toLowerCase()
    if(/formula|physics|chemistry|neet/.test(c)) return ['Aur formulas do','Example solve karo','Hindi mein','MCQ do']
    if(/weather|mausam/.test(c)) return ['Agle 3 din?','Humidity?','AQI batao','Wind speed?']
    if(/code|python|javascript|function/.test(c)) return ['Explain karo','Better version?','Test cases do','Bugs?']
    if(/news|khabar/.test(c)) return ['Aur news do','Hindi mein','Background?','Impact kya?']
    if(/song|music|artist/.test(c)) return ['Similar songs?','Lyrics chahiye','Artist info','Play karo']
    return ['Aur detail mein','Example do','Hindi mein','Ek line mein']
  })()

  /* ── Onboard ─────────────────────────────────────────── */
  const submitOnboard=async()=>{
    if(!oIn.trim()) return
    await setProfile('name',oIn.trim()); setName(oIn.trim()); setOnboard(false)
    setMsgs([{id:'g0',role:'assistant',content:`Shukriya! Main hoon JARVIS — tumhara personal AI. 🤖\n\nKya karna hai aaj?`,timestamp:Date.now(),isSystem:true}])
  }

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div style={{position:'fixed',inset:0,display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div className="bg-grid"/>
      <NavDrawer open={navOpen} onClose={()=>setNavOpen(false)}/>
      <ChatHistorySidebar open={histOpen} onClose={()=>setHistOpen(false)} currentSessionId={currentSessionId}
        onNewChat={async()=>{setMsgs([]);setSessionTitle('');startNewSession();const id=await createHistorySession('New Chat').catch(()=>'');if(id)setCurrentSessionId(id)}}
        onSelectSession={(s:any)=>{setCurrentSessionId(s.id);setSessionTitle(s.title);setMsgs(s.messages.map((m:any,i:number)=>({id:`h${i}_${m.timestamp}`,role:m.role,content:m.content,timestamp:m.timestamp})))}}
      />

      {/* Onboard */}
      {onboard&&<div style={{position:'absolute',inset:0,zIndex:100,background:'rgba(0,0,0,.9)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
        <div style={{background:'var(--bg-card)',border:'1px solid var(--border-a)',borderRadius:20,padding:28,width:'100%',maxWidth:360}}>
          <div style={{fontSize:36,textAlign:'center',marginBottom:10}}>🤖</div>
          <div style={{fontSize:20,fontWeight:700,textAlign:'center',marginBottom:6}}>Pehle milte hain!</div>
          <div style={{fontSize:12,color:'var(--text-3)',textAlign:'center',marginBottom:20,lineHeight:1.6}}>Apna naam batao — JARVIS hamesha yaad rakhega.</div>
          <input value={oIn} onChange={e=>setOIn(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitOnboard()} placeholder="Apna naam..." autoFocus style={{width:'100%',marginBottom:12}}/>
          <button onClick={submitOnboard} disabled={!oIn.trim()} style={{width:'100%',padding:12,borderRadius:10,background:oIn.trim()?'var(--accent-bg)':'transparent',border:`1px solid ${oIn.trim()?'var(--border-a)':'var(--border)'}`,color:oIn.trim()?'var(--accent)':'var(--text-3)',fontSize:14,fontWeight:600,cursor:'pointer'}}>
            Shuru karo →
          </button>
        </div>
      </div>}

      {/* Search overlay */}
      {searchOpen&&<div style={{position:'absolute',inset:0,zIndex:200,background:'var(--overlay)',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'12px 14px',borderBottom:'1px solid var(--border)',display:'flex',gap:8,alignItems:'center'}}>
          <span>🔍</span>
          <input value={searchQ} autoFocus onChange={e=>{const q=e.target.value;setSearchQ(q);if(q.length>1){setSearchLoading(true);searchChats(q,50).then(r=>{setSearchResults(r);setSearchLoading(false)}).catch(()=>setSearchLoading(false))}else setSearchResults(null)}} placeholder="Poori history mein search karo..." style={{flex:1,padding:'9px 12px',borderRadius:10,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'var(--text)',fontSize:14}}/>
          <button onClick={()=>{setSearchOpen(false);setSearchQ('');setSearchResults(null)}} style={{padding:'9px 13px',borderRadius:10,background:'rgba(255,255,255,.06)',border:'none',color:'var(--text)',fontSize:14,cursor:'pointer'}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'10px 14px'}}>
          {searchLoading&&<div style={{textAlign:'center',padding:20,color:'var(--text-3)'}}>🔍 Searching...</div>}
          {!searchLoading&&searchQ.length>1&&(()=>{
            const cur=msgs.filter(m=>m.content.toLowerCase().includes(searchQ.toLowerCase()))
            const db=searchResults||[]
            const all=[...cur.map(m=>({id:m.id,role:m.role,content:m.content,timestamp:m.timestamp,source:'current'})),...db.filter(d=>!cur.some(c=>c.timestamp===d.timestamp)).map(d=>({...d,id:String(d.id),source:'history'}))].sort((a,b)=>b.timestamp-a.timestamp)
            if(!all.length) return <div style={{textAlign:'center',padding:'40px 0',color:'var(--text-3)',fontSize:13}}>"{searchQ}" — koi result nahi</div>
            return all.map(m=><div key={m.id} onClick={()=>{setSearchOpen(false);setSearchQ('');setSearchResults(null)}} style={{padding:'10px 12px',background:'rgba(255,255,255,.03)',border:`1px solid var(--border)`,borderRadius:10,marginBottom:8,cursor:'pointer',borderLeft:`2px solid ${m.source==='current'?'#00e5ff':'#a78bfa'}`}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontSize:10,color:m.role==='user'?'#00e5ff':'#a78bfa',fontWeight:600}}>{m.role==='user'?'Tu':'JARVIS'}</span><span style={{fontSize:9,color:'var(--text-4)'}}>{new Date(m.timestamp).toLocaleDateString('hi-IN',{day:'numeric',month:'short'})}</span></div>
              <div style={{fontSize:12,color:'var(--text-2)',lineHeight:1.5}}>{m.content.slice(0,180)}</div>
            </div>)
          })()}
          {!searchQ&&<div style={{textAlign:'center',padding:'30px 0',color:'var(--text-3)'}}><div style={{fontSize:32,marginBottom:10}}>🔍</div><div style={{fontSize:13}}>Koi bhi word type karo</div></div>}
        </div>
      </div>}

      {/* Edit modal */}
      {editingId&&<div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.92)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
        <div style={{width:'100%',maxWidth:400,background:'var(--bg-card)',border:'1px solid var(--border-a)',borderRadius:16,padding:20}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>✏️ Message Edit karo</div>
          <textarea value={editText} onChange={e=>setEditText(e.target.value)} rows={4} style={{width:'100%',padding:'10px 12px',borderRadius:10,background:'rgba(255,255,255,.04)',border:'1px solid var(--border-a)',color:'var(--text)',fontSize:13,resize:'none',outline:'none',fontFamily:'inherit',lineHeight:1.5}}/>
          <div style={{display:'flex',gap:8,marginTop:12}}>
            <button onClick={submitEdit} style={{flex:1,padding:'11px',borderRadius:10,background:'var(--accent-bg)',border:'1px solid var(--border-a)',color:'var(--accent)',fontSize:13,fontWeight:600,cursor:'pointer'}}>↑ Re-send</button>
            <button onClick={()=>{setEditingId(null);setEditText('')}} style={{flex:1,padding:'11px',borderRadius:10,background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',color:'var(--text-3)',fontSize:13,cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      </div>}

      {/* PWA install */}
      {showInstall&&<div style={{position:'fixed',bottom:80,left:12,right:12,zIndex:50,background:'var(--bg-card)',border:'1px solid var(--border-a)',borderRadius:14,padding:'12px 16px',display:'flex',alignItems:'center',gap:10,boxShadow:'var(--shadow)'}}>
        <span style={{fontSize:20}}>📱</span>
        <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600}}>JARVIS install karo</div><div style={{fontSize:10,color:'var(--text-3)'}}>Home screen pe add karo</div></div>
        <button onClick={()=>{installPrompt?.prompt();setShowInstall(false)}} style={{padding:'6px 14px',borderRadius:8,background:'var(--accent)',color:'#000',border:'none',fontSize:12,fontWeight:700,cursor:'pointer'}}>Install</button>
        <button onClick={()=>setShowInstall(false)} style={{background:'none',border:'none',color:'var(--text-3)',fontSize:16,cursor:'pointer'}}>✕</button>
      </div>}

      {/* Header */}
      <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px',borderBottom:'1px solid var(--border)',flexShrink:0,background:'var(--header)',backdropFilter:'blur(10px)',zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button onClick={()=>setNavOpen(true)} style={{width:28,height:28,borderRadius:8,background:'var(--accent-bg)',border:'1px solid var(--border-a)',color:'var(--accent)',fontSize:14,fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>J</button>
          <button onClick={()=>setHistOpen(true)} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',color:'var(--text-3)',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>🕐</button>
          <WeatherBadge/>
          {userLocation&&<span style={{fontSize:9,color:'var(--text-4)',display:'flex',alignItems:'center',gap:2}}>📍{userLocation.city.split(',')[0].slice(0,10)}</span>}
          <BatteryBadge/>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,position:'relative'}}>
          <div style={{position:'relative'}}>
            <button onClick={()=>setThemeOpen(p=>!p)} style={{width:26,height:26,borderRadius:7,background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center'}}>{THEME_META[currentTheme].icon}</button>
            {themeOpen&&<div style={{position:'absolute',right:0,top:32,zIndex:200,background:'var(--bg-card)',border:'1px solid var(--border-a)',borderRadius:12,padding:6,minWidth:130,boxShadow:'var(--shadow)'}}>
              {(Object.keys(THEME_META) as Theme[]).map(t=>(
                <button key={t} onClick={()=>{setTheme(t);setCurrentTheme(t);setThemeOpen(false)}} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,border:`1px solid ${currentTheme===t?'var(--border-a)':'transparent'}`,background:currentTheme===t?'var(--accent-bg)':'transparent',color:currentTheme===t?'var(--accent)':'var(--text-2)',fontSize:12,cursor:'pointer',width:'100%'}}>
                  {THEME_META[t].icon} {THEME_META[t].label}
                </button>
              ))}
            </div>}
          </div>
          <span style={{width:5,height:5,borderRadius:'50%',background:online?'#00e676':'#ff4444'}}/>
          {msgs.length>0&&<button onClick={()=>setSearchOpen(true)} style={{width:26,height:26,borderRadius:7,background:'transparent',border:'1px solid var(--border)',color:'var(--text-4)',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center'}}>🔍</button>}
          {msgs.length>2&&<button onClick={exportChat} style={{width:26,height:26,borderRadius:7,background:'transparent',border:'1px solid var(--border)',color:'var(--text-4)',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center'}}>📄</button>}
          <button onClick={()=>{setMsgs([]);setSessionTitle('');startNewSession()}} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,background:'transparent',border:'1px solid var(--border)',color:'var(--text-4)',fontSize:10,fontWeight:600}}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New
          </button>
        </div>
      </header>

      {/* Messages */}
      <div ref={mainRef} onScroll={()=>{const el=mainRef.current;if(!el)return;setScrolledUp(el.scrollHeight-el.scrollTop-el.clientHeight>120)}} style={{flex:1,overflowY:'auto',overflowX:'hidden',paddingBottom:8,minHeight:0}}>
        {msgs.length===0&&(
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'0 16px 16px',paddingTop:8}}>
            <Clock name={name}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,width:'100%',maxWidth:440,marginTop:20}}>
              {STARTERS.map(s=>(
                <button key={s.t} onClick={()=>send(s.t)} style={{padding:'13px 12px',borderRadius:14,background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',color:'var(--text)',textAlign:'left',cursor:'pointer',display:'flex',flexDirection:'column',gap:4}}>
                  <span style={{fontSize:18}}>{s.icon}</span>
                  <span style={{fontSize:12,fontWeight:600,lineHeight:1.3}}>{s.t}</span>
                  <span style={{fontSize:10,color:'var(--text-4)',lineHeight:1.3}}>{s.sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map(m=>(
          <div key={m.id} className="msg-fadein">
            {m.role==='user'?(
              <div className="msg-u">
                <div className="msg-u-inner">
                  {m.content}
                  <button onClick={()=>{setEditingId(m.id);setEditText(m.content)}} style={{background:'none',border:'none',color:'rgba(255,255,255,.25)',fontSize:10,cursor:'pointer',marginLeft:6,verticalAlign:'middle'}}>✏️</button>
                </div>
              </div>
            ):(
              <div className="msg-j">
                {m.streaming?(
                  <div style={{display:'flex',alignItems:'center',gap:6,minHeight:24}}>
                    <span className="dot"/><span className="dot"/><span className="dot"/>
                    <span style={{fontSize:11,color:'var(--text-3)',marginLeft:2}}>{m.content}</span>
                  </div>
                ):(
                  <>
                    {m.thinking&&<details style={{marginBottom:6}}><summary style={{fontSize:10,color:'#6060a0',cursor:'pointer'}}>🧠 Soch</summary><div style={{fontSize:11,color:'var(--text-4)',padding:'6px 8px',background:'rgba(100,80,200,.06)',borderRadius:6,marginTop:4,whiteSpace:'pre-wrap',lineHeight:1.5}}>{m.thinking}</div></details>}
                    <MdRenderer content={m.content}/>
                    {m.card&&<div style={{marginTop:8}}><RichCardView card={m.card}/></div>}
                    <div style={{display:'flex',alignItems:'center',gap:5,marginTop:4,flexWrap:'wrap'}}>
                      {m.responseTime&&<span style={{fontSize:9,color:'var(--text-4)',fontFamily:"'JetBrains Mono',monospace"}}>⚡{(m.responseTime/1000).toFixed(1)}s</span>}
                      {m.mode&&<span style={{fontSize:9,color:'var(--text-4)',background:'rgba(255,255,255,.04)',padding:'1px 5px',borderRadius:4}}>{m.mode==='flash'?'⚡':m.mode==='think'?'🧠':m.mode==='deep'?'🔬':'🤖'} {m.mode}</span>}
                      {modelName&&msgs.filter(x=>x.role==='assistant').slice(-1)[0]?.id===m.id&&<button onClick={()=>setModelDrawerOpen(true)} style={{fontSize:9,color:'#3a8060',background:'rgba(0,229,100,.06)',padding:'2px 8px',borderRadius:4,border:'1px solid rgba(0,200,80,.2)',cursor:'pointer'}}>🤖 {modelName} ▾</button>}
                      <button onClick={()=>navigator.clipboard.writeText(m.content).then(()=>showToast('Copied!','success')).catch(()=>{})} style={{background:'none',border:'none',color:'var(--text-4)',fontSize:10,cursor:'pointer',padding:'1px 5px'}}>⎘</button>
                      <button onClick={()=>setMsgs(p=>p.map(x=>x.id===m.id?{...x,feedback:'up'}:x))} style={{background:'none',border:'none',color:m.feedback==='up'?'#22c55e':'var(--text-4)',fontSize:11,cursor:'pointer'}}>👍</button>
                      <button onClick={()=>setMsgs(p=>p.map(x=>x.id===m.id?{...x,feedback:'down'}:x))} style={{background:'none',border:'none',color:m.feedback==='down'?'#ef4444':'var(--text-4)',fontSize:11,cursor:'pointer'}}>👎</button>
                      <button onClick={()=>setMsgs(p=>p.map(x=>x.id===m.id?{...x,pinned:!x.pinned}:x))} style={{background:'none',border:'none',color:m.pinned?'#f59e0b':'var(--text-4)',fontSize:11,cursor:'pointer'}}>📌</button>
                      <button onClick={()=>speakText(m.content)} style={{background:'none',border:'none',color:'var(--text-4)',fontSize:11,cursor:'pointer'}} title='Sunao'>🔊</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={botRef} style={{height:4}}/>
      </div>

      {scrolledUp&&<div style={{textAlign:'center',padding:'2px 0',flexShrink:0}}>
        <button onClick={()=>{setScrolledUp(false);botRef.current?.scrollIntoView({behavior:'smooth'})}} style={{background:'var(--bg-card)',border:'1px solid var(--border-a)',borderRadius:20,padding:'5px 14px',color:'var(--accent)',fontSize:11,cursor:'pointer'}}>↓ Neeche jao</button>
      </div>}

      {/* Weekly prompt */}
      {weeklyPrompt&&<div style={{margin:'0 14px 4px',padding:'10px 14px',background:'rgba(167,139,250,.06)',border:'1px solid rgba(167,139,250,.15)',borderRadius:12,display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
        <span style={{fontSize:12,color:'#8a70d0',flex:1}}>📊 Weekly summary banata hun?</span>
        <button onClick={async()=>{setWeeklyPrompt(false);const s=await generateWeeklySummary();send(`Weekly summary: ${s}`)}} style={{padding:'4px 10px',borderRadius:10,background:'rgba(167,139,250,.1)',border:'1px solid rgba(167,139,250,.2)',color:'#a78bfa',fontSize:11,cursor:'pointer'}}>Haan</button>
        <button onClick={()=>setWeeklyPrompt(false)} style={{background:'none',border:'none',color:'var(--text-4)',fontSize:14,cursor:'pointer'}}>✕</button>
      </div>}

      {/* Daily summary */}
      {showSummary&&<div style={{margin:'0 14px 4px',padding:'10px 14px',background:'rgba(167,139,250,.06)',border:'1px solid rgba(167,139,250,.15)',borderRadius:12,display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
        <span style={{fontSize:12,color:'#8a70d0',flex:1}}>📊 Aaj ka daily summary banata hun?</span>
        <button onClick={async()=>{setShowSummary(false);const s=await generateDailySummary();send(`Daily summary: ${s}`)}} style={{padding:'4px 10px',borderRadius:10,background:'rgba(167,139,250,.1)',border:'1px solid rgba(167,139,250,.2)',color:'#a78bfa',fontSize:11,cursor:'pointer'}}>Haan</button>
        <button onClick={()=>setShowSummary(false)} style={{background:'none',border:'none',color:'var(--text-4)',fontSize:14,cursor:'pointer'}}>✕</button>
      </div>}

      {/* Proactive */}
      {proactive&&<div style={{margin:'0 14px 4px',padding:'9px 14px',background:'rgba(0,229,255,.04)',border:'1px solid rgba(0,229,255,.1)',borderRadius:12,display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
        <span style={{fontSize:12,color:'var(--text-3)',flex:1}}>💡 {proactive}</span>
        <button onClick={()=>{send(proactive!);setProactive(null)}} style={{padding:'3px 10px',borderRadius:10,background:'var(--accent-bg)',border:'1px solid var(--border-a)',color:'var(--accent)',fontSize:11,cursor:'pointer'}}>Haan</button>
        <button onClick={()=>setProactive(null)} style={{background:'none',border:'none',color:'var(--text-4)',fontSize:14,cursor:'pointer'}}>✕</button>
      </div>}

      {/* URL chip */}
      {urlChip&&<div style={{padding:'4px 12px',display:'flex',alignItems:'center',gap:8,flexShrink:0,borderTop:'1px solid rgba(255,255,255,.04)'}}>
        <span style={{fontSize:10,color:'var(--text-3)'}}>🔗 URL detect hua —</span>
        <button onClick={()=>{send(`Yeh URL summarize karo: ${urlChip}`);setInput('');setUrlChip('')}} style={{padding:'3px 10px',borderRadius:10,background:'var(--accent-bg)',border:'1px solid var(--border-a)',color:'var(--accent)',fontSize:11,cursor:'pointer'}}>✨ Summarize?</button>
        <button onClick={()=>setUrlChip('')} style={{background:'none',border:'none',color:'var(--text-4)',fontSize:13,cursor:'pointer'}}>✕</button>
      </div>}

      {/* Smart chips */}
      {lastAI&&!loading&&chips.length>0&&<div style={{padding:'4px 12px 2px',display:'flex',gap:5,overflowX:'auto',flexShrink:0}} className="no-scroll">
        {chips.map(c=><button key={c} onClick={()=>send(c)} style={{padding:'4px 11px',borderRadius:16,background:'transparent',border:'1px solid var(--border)',color:'var(--text-3)',fontSize:11,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>{c}</button>)}
      </div>}

      {/* Regenerate */}
      {lastAI&&!loading&&msgs.length>=2&&<div style={{display:'flex',justifyContent:'center',padding:'0 16px 3px',flexShrink:0}}>
        <button onClick={regenerate} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 14px',borderRadius:20,background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',color:'var(--text-3)',fontSize:11}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4"/></svg>Regenerate
        </button>
      </div>}

      {/* Slash hints */}
      {slashHints.length>0&&<div style={{position:'absolute',bottom:80,left:8,right:8,background:'var(--overlay)',border:'1px solid var(--border-a)',borderRadius:12,overflow:'hidden',zIndex:10}}>
        {slashHints.map(h=><button key={h.cmd} onClick={()=>{setInput(h.cmd+' ');setSlashHints([]);taRef.current?.focus()}} style={{width:'100%',padding:'9px 14px',display:'flex',alignItems:'center',gap:10,background:'transparent',border:'none',borderBottom:'1px solid var(--border)',cursor:'pointer',textAlign:'left'}}>
          <span style={{fontSize:15}}>{h.icon}</span>
          <div><div style={{fontSize:12,color:'var(--accent)',fontWeight:600}}>{h.cmd}</div><div style={{fontSize:10,color:'var(--text-3)'}}>{h.desc}</div></div>
        </button>)}
      </div>}

      {/* Attached file chip */}
      {attachedFile&&<div style={{padding:'4px 12px',display:'flex',alignItems:'center',gap:8,flexShrink:0,borderTop:'1px solid rgba(0,229,255,.08)',background:'rgba(0,229,255,.03)'}}>
        <span style={{fontSize:13}}>{attachedFile.type==='image'?'🖼️':'📄'}</span>
        <span style={{fontSize:11,color:'var(--accent)',flex:1}}>{attachedFile.name}</span>
        <span style={{fontSize:9,color:'var(--text-4)'}}>attached</span>
        <button onClick={()=>setAttachedFile(null)} style={{background:'none',border:'none',color:'#f87171',fontSize:14,cursor:'pointer',padding:'0 2px'}}>✕</button>
      </div>}

      {/* Input */}
      <div style={{padding:'8px 12px 10px',borderTop:'1px solid var(--border)',background:'var(--header)',flexShrink:0,position:'relative'}}>
        {plusOpen&&<>
          {/* Hidden file inputs */}
          <input ref={fileInputRef} type="file" accept=".txt,.pdf,.md,.csv,.js,.ts,.py,.json,.html,.css" style={{display:'none'}} onChange={e=>handleFileAttach(e,'file')}/>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={e=>handleFileAttach(e,'image')}/>
          <input ref={galleryInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>handleFileAttach(e,'image')}/>
          <div onClick={()=>setPlusOpen(false)} style={{position:'fixed',inset:0,zIndex:40}}/>
          <div style={{position:'absolute',bottom:'calc(100% + 8px)',left:8,zIndex:50,background:'rgba(6,10,20,.97)',border:'1px solid var(--border-a)',borderRadius:16,width:260,boxShadow:'0 -8px 32px rgba(0,0,0,.8)',backdropFilter:'blur(24px)',overflow:'hidden'}}>
            {/* Tab bar */}
            <div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,.07)'}}>
              {([['attach','📎','Attach'],['mode','⚡','Mode'],['persona','🎭','Persona']] as const).map(([t,ic,lb])=>(
                <button key={t} onClick={()=>setPlusTab(t)}
                  style={{flex:1,padding:'9px 4px',background:plusTab===t?'rgba(0,229,255,.06)':'transparent',border:'none',borderBottom:`2px solid ${plusTab===t?'var(--accent)':'transparent'}`,color:plusTab===t?'var(--accent)':'#667',fontSize:11,fontWeight:600,cursor:'pointer',transition:'all .15s'}}>
                  {ic} {lb}
                </button>
              ))}
            </div>

            {/* ATTACH tab */}
            {plusTab==='attach'&&<div style={{padding:10}}>
              <div style={{fontSize:8,color:'var(--text-4)',letterSpacing:2,fontWeight:700,marginBottom:8}}>ATTACH TO MESSAGE</div>
              <div style={{display:'flex',flexDirection:'column' as const,gap:5}}>
                {[
                  {icon:'📁',label:'File',sub:'txt, pdf, code...',ref:fileInputRef,color:'#60a5fa'},
                  {icon:'📷',label:'Camera',sub:'Photo leke bhejo',ref:cameraInputRef,color:'#34d399'},
                  {icon:'🖼️',label:'Gallery',sub:'Photo library',ref:galleryInputRef,color:'#a78bfa'},
                ].map(it=>(
                  <button key={it.label} onClick={()=>it.ref.current?.click()}
                    style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,background:'rgba(255,255,255,.04)',border:`1px solid rgba(255,255,255,.07)`,cursor:'pointer',textAlign:'left' as const}}>
                    <div style={{width:32,height:32,borderRadius:8,background:`${it.color}18`,border:`1px solid ${it.color}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{it.icon}</div>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:'var(--text)'}}>{it.label}</div>
                      <div style={{fontSize:10,color:'var(--text-4)',marginTop:1}}>{it.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
              {attachedFile&&<div style={{marginTop:8,padding:'7px 10px',background:'rgba(0,229,255,.06)',border:'1px solid rgba(0,229,255,.15)',borderRadius:8,display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:14}}>{attachedFile.type==='image'?'🖼️':'📄'}</span>
                <span style={{fontSize:11,color:'var(--accent)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{attachedFile.name}</span>
                <button onClick={()=>setAttachedFile(null)} style={{background:'none',border:'none',color:'#f87171',fontSize:13,cursor:'pointer'}}>✕</button>
              </div>}
            </div>}

            {/* MODE tab */}
            {plusTab==='mode'&&<div style={{padding:10}}>
              <div style={{fontSize:8,color:'var(--text-4)',letterSpacing:2,fontWeight:700,marginBottom:6}}>MODE + PROVIDER</div>
              <div style={{fontSize:9,color:'var(--text-4)',marginBottom:8,lineHeight:1.4}}>Mode → auto cascade, ya neeche koi provider lock karo</div>

              {/* Mode select row */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:4,marginBottom:10}}>
                {([['auto','🤖','Auto','var(--accent)'],['flash','⚡','Flash','#f59e0b'],['think','🧠','Think','#818cf8'],['deep','🔬','Deep','#34d399']] as const).map(([m,ic,lb,col])=>(
                  <button key={m} onClick={()=>{setMode(m);setForcedProvider(null)}}
                    style={{padding:'7px 4px',borderRadius:9,cursor:'pointer',textAlign:'center' as const,background:mode===m?`${col}15`:'rgba(255,255,255,.03)',border:`1px solid ${mode===m?col+'40':'rgba(255,255,255,.06)'}`,transition:'all .15s'}}>
                    <div style={{fontSize:15}}>{ic}</div>
                    <div style={{fontSize:10,fontWeight:mode===m?700:400,color:mode===m?col as string:'#778',marginTop:2}}>{lb}</div>
                  </button>
                ))}
              </div>

              {/* Provider chips for selected mode */}
              {(()=>{
                const providers:{key:string;label:string;color:string;note:string}[] =
                  mode==='think'?[
                    {key:'auto',    label:'Auto',           color:'var(--accent)', note:'Best available'},
                    {key:'deepseek',label:'DeepSeek R1',    color:'#60a5fa',       note:'Best reasoning'},
                    {key:'gemini',  label:'Gemini 2.5',     color:'#4ade80',       note:'Google'},
                    {key:'pollinations',label:'Pollinations',color:'#e879f9',      note:'No key'},
                    {key:'puter',   label:'Puter',          color:'#00e5ff',       note:'Last resort'},
                  ]:mode==='deep'?[
                    {key:'auto',    label:'Auto',           color:'var(--accent)', note:'Best available'},
                    {key:'gemini',  label:'Gemini+Tools',   color:'#4ade80',       note:'Weather/news'},
                    {key:'pollinations',label:'Pollinations',color:'#e879f9',      note:'No key'},
                    {key:'puter',   label:'Puter',          color:'#00e5ff',       note:'Last resort'},
                  ]:mode==='auto'?[
                    {key:'auto',    label:'Auto detect',    color:'var(--accent)', note:'Recommended'},
                  ]:[
                    {key:'auto',    label:'Auto',           color:'var(--accent)', note:'Full cascade'},
                    {key:'groq',    label:'Groq Llama4',    color:'#f59e0b',       note:'~1s fastest'},
                    {key:'together',label:'Together 70B',   color:'#fb923c',       note:'~2s quality'},
                    {key:'gemini',  label:'Gemini 2.5',     color:'#4ade80',       note:'~3s google'},
                    {key:'pollinations',label:'Pollinations',color:'#e879f9',      note:'~5s no key'},
                    {key:'puter',   label:'Puter',          color:'#00e5ff',       note:'~6s fallback'},
                  ]
                const cur=forcedProvider||'auto'
                return (
                  <div>
                    <div style={{fontSize:8,color:'var(--text-4)',letterSpacing:1.5,fontWeight:700,marginBottom:5}}>LOCK PROVIDER</div>
                    <div style={{display:'flex',flexWrap:'wrap' as const,gap:5}}>
                      {providers.map(p=>(
                        <button key={p.key} onClick={()=>{setForcedProvider(p.key==='auto'?null:p.key);if(p.key!=='auto')showToast(`🔒 ${p.label} locked`,'info')}}
                          style={{padding:'5px 9px',borderRadius:8,cursor:'pointer',fontSize:10,fontWeight:cur===p.key?700:400,
                            background:cur===p.key?`${p.color}20`:'rgba(255,255,255,.03)',
                            border:`1px solid ${cur===p.key?p.color+'50':'rgba(255,255,255,.07)'}`,
                            color:cur===p.key?p.color as string:'#667',
                            display:'flex',alignItems:'center',gap:4,
                          }}>
                          {cur===p.key&&<span style={{fontSize:8}}>🔒</span>}
                          <span>{p.label}</span>
                          <span style={{fontSize:8,color:'#445'}}>{p.note}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>}

            {/* PERSONA tab */}
            {plusTab==='persona'&&<div style={{padding:10}}>
              <div style={{fontSize:8,color:'var(--text-4)',letterSpacing:2,fontWeight:700,marginBottom:8}}>JARVIS PERSONA</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
                {([
                  ['jarvis','🤖','JARVIS','Default — Hinglish sarcastic'],
                  ['desi','🇮🇳','Desi Yaar','Casual street-smart'],
                  ['sherlock','🔍','Sherlock','Deductive, sharp'],
                  ['yoda','🌟','Yoda','Wise inverted speech'],
                ] as const).map(([p,ic,lb,sub])=>(
                  <button key={p} onClick={()=>setPersona(p)}
                    style={{padding:'8px 7px',borderRadius:9,background:persona===p?'var(--accent-bg)':'rgba(255,255,255,.03)',border:`1px solid ${persona===p?'var(--border-a)':'rgba(255,255,255,.05)'}`,cursor:'pointer',textAlign:'left' as const}}>
                    <div style={{fontSize:18,marginBottom:3}}>{ic}</div>
                    <div style={{fontSize:11,fontWeight:700,color:persona===p?'var(--accent)':'var(--text)'}}>{lb}</div>
                    <div style={{fontSize:9,color:'var(--text-4)',marginTop:1,lineHeight:1.3}}>{sub}</div>
                  </button>
                ))}
              </div>
            </div>}
          </div>
        </>}

        <div style={{background:'var(--bg-input)',border:`1.5px solid ${loading?'var(--accent)':'var(--border)'}`,borderRadius:20,overflow:'hidden',transition:'border-color .2s'}}>
          <textarea ref={taRef} value={input} onChange={e=>handleInput(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(input)}}}
            placeholder={loading?'Soch raha hun...':'Kuch poocho ya batao...'}
            rows={1} style={{display:'block',width:'100%',padding:'13px 16px 6px',background:'transparent',border:'none',color:'var(--text)',fontSize:14,resize:'none',outline:'none',lineHeight:1.6,maxHeight:130,overflow:'auto',fontFamily:'inherit'}}
          />
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 8px 8px'}}>
            <div style={{display:'flex',gap:1,alignItems:'center'}}>
              <button onClick={()=>{setPlusTab('attach');setPlusOpen(p=>!p)}} style={{width:30,height:28,borderRadius:7,background:plusOpen?'var(--accent-bg)':'transparent',border:`1px solid ${plusOpen?'var(--border-a)':'transparent'}`,color:plusOpen?'var(--accent)':'var(--text-3)',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>{plusOpen?'×':'+'}</button>
              <button onClick={()=>{setPlusTab('mode');setPlusOpen(true)}} style={{padding:'3px 9px',fontSize:10,color:forcedProvider?'#f59e0b':'var(--accent)',background:forcedProvider?'rgba(245,158,11,.1)':'var(--accent-bg)',border:`1px solid ${forcedProvider?'rgba(245,158,11,.3)':'var(--border-acc)'}`,borderRadius:6,cursor:'pointer',fontWeight:600}}>
                {forcedProvider?`🔒 ${forcedProvider}`:mode==='auto'?'🤖 Auto':mode==='flash'?'⚡ Flash':mode==='think'?'🧠 Think':'🔬 Deep'}
              </button>
              {input.length>50&&<span style={{fontSize:9,color:input.length>800?'#ff6060':input.length>400?'#ffab00':'var(--text-4)',padding:'2px 5px'}}>{input.length}</span>}
            </div>
            <div style={{display:'flex',gap:3}}>
              <button onClick={toggleMic} style={{width:30,height:28,borderRadius:7,background:micActive?'rgba(255,50,50,.15)':'transparent',border:`1px solid ${micActive?'rgba(255,80,80,.4)':'transparent'}`,color:micActive?'#ff5555':'var(--text-3)',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center'}}>{micActive?'⏹':'🎙️'}</button>
              {loading
                ?<button onClick={()=>abortRef.current?.abort()} style={{width:32,height:32,borderRadius:8,background:'rgba(255,80,80,.15)',border:'1px solid rgba(255,80,80,.35)',color:'#ff6060',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="11" height="11" viewBox="0 0 24 24" fill="#ff6060"><rect x="4" y="4" width="16" height="16" rx="2"/></svg></button>
                :<button onClick={()=>send(input)} disabled={!input.trim()} style={{width:32,height:32,borderRadius:8,background:input.trim()?'var(--accent)':'transparent',border:`1px solid ${input.trim()?'var(--accent)':'transparent'}`,color:input.trim()?'#000':'var(--text-3)',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg></button>
              }
            </div>
          </div>
        </div>
      </div>

      {toast&&<Toast msg={toast.msg} type={toast.type}/>}
      <ModelInfoDrawer open={modelDrawerOpen} onClose={()=>setModelDrawerOpen(false)}/>
    </div>
  )
}
