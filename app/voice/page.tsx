'use client'
// app/voice/page.tsx — JARVIS Voice v13
// Custom wake word + sensitivity + noise gate + conversation mode (6 exchanges)
import { useState, useRef, useEffect, useCallback } from 'react'
import BottomNav from '../../components/shared/BottomNav'
import { cleanResponse } from '../../lib/personality'
import { addMemory, buildMemoryContext, saveChat } from '../../lib/db'

type VS = 'idle'|'wake'|'listening'|'thinking'|'speaking'
const haptic = {
  light:  ()=>navigator.vibrate?.(30),
  medium: ()=>navigator.vibrate?.(60),
  double: ()=>navigator.vibrate?.([50,30,50]),
  wake:   ()=>navigator.vibrate?.([30,20,30,20,50]),
  error:  ()=>navigator.vibrate?.([80,40,80]),
}

const VOICES = [
  { id:'hi-IN-SwaraNeural',  l:'Swara ♀', lang:'hi' },
  { id:'hi-IN-MadhurNeural', l:'Madhur ♂', lang:'hi' },
  { id:'hi-IN-KavyaNeural',  l:'Kavya ♀', lang:'hi' },
  { id:'en-IN-NeerjaNeural', l:'Neerja ♀', lang:'en' },
  { id:'en-IN-PrabhatNeural',l:'Prabhat ♂', lang:'en' },
]

function Waveform({ active, level=0.5 }: { active: boolean; level?: number }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:3,height:36,justifyContent:'center'}}>
      {[1,.6,.9,.4,.8,.5,1,.6,.3].map((h,i)=>(
        <div key={i} style={{width:3,borderRadius:2,
          background:active?'#00e5ff':'rgba(0,229,255,.2)',
          height:active?`${Math.max(15,h*level*100)}%`:'15%',
          transition:'height .1s',
          animation:active?`wave ${.5+i*.1}s ease-in-out infinite alternate`:'none'}}/>
      ))}
      <style>{`@keyframes wave{from{transform:scaleY(.3)}to{transform:scaleY(1)}}`}</style>
    </div>
  )
}

export default function VoicePage() {
  const [st,setSt]         = useState<VS>('idle')
  const [transcript,setTr] = useState('')
  const [reply,setReply]   = useState('')
  const [thinking,setThk]  = useState('')
  const [continuous,setCont] = useState(false)
  const [wakeOn,setWakeOn] = useState(false)
  const [history,setHist]  = useState<{role:string;content:string}[]>([])
  const [voice,setVoice]   = useState('hi-IN-SwaraNeural')
  const [speed,setSpeed]   = useState(1.0)
  const [battery,setBatt]  = useState<number|null>(null)
  const [showCfg,setShowCfg] = useState(false)
  const [imgUrl,setImgUrl] = useState('')
  const [audioLevel,setAudioLevel] = useState(0.5)
  // Custom wake word
  const [customWake,setCustomWake] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('jarvis_wake_word') || '' : '')
  const [sensitivity,setSens] = useState<'high'|'medium'|'low'>(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('jarvis_wake_sens') as any) || 'medium' : 'medium')
  // Noise gate
  const [noiseGate,setNoiseGate] = useState(false)
  const [convMode,setConvMode]   = useState(false)

  const recRef   = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement|null>(null)
  const wakeRef  = useRef<any>(null)
  const stRef    = useRef<VS>('idle')
  const audioCtxRef = useRef<any>(null)
  useEffect(()=>{stRef.current=st},[st])

  useEffect(()=>{
    ;(navigator as any).getBattery?.().then((b:any)=>{
      setBatt(Math.round(b.level*100))
      b.addEventListener('levelchange',()=>setBatt(Math.round(b.level*100)))
    })
  },[])

  // Save custom wake word
  useEffect(()=>{
    if(customWake) localStorage.setItem('jarvis_wake_word',customWake)
    localStorage.setItem('jarvis_wake_sens',sensitivity)
  },[customWake,sensitivity])

  // Noise gate via Web Audio API
  const startNoiseGate = useCallback(async(stream:MediaStream):Promise<MediaStream>=>{
    if(!noiseGate) return stream
    try{
      const AudioContext=(window as any).AudioContext||(window as any).webkitAudioContext
      if(!AudioContext) return stream
      const ctx=new AudioContext(); audioCtxRef.current=ctx
      const src=ctx.createMediaStreamSource(stream)
      const dest=ctx.createMediaStreamDestination()
      const gain=ctx.createGain(); gain.gain.value=1.2
      // Dynamics compressor acts as noise gate
      const comp=ctx.createDynamicsCompressor()
      comp.threshold.value=-50; comp.knee.value=40
      comp.ratio.value=12; comp.attack.value=0; comp.release.value=0.25
      src.connect(comp); comp.connect(gain); gain.connect(dest)
      return dest.stream
    }catch{ return stream }
  },[noiseGate])

  // Build wake phrases (default + custom)
  const getWakePhrases = useCallback(()=>{
    const defaults = ['hey jarvis','jarvis','bhai']
    if(customWake.trim()) defaults.push(customWake.trim().toLowerCase())
    return defaults
  },[customWake])

  // Sensitivity → confidence threshold
  const getSensThreshold = ()=>({ high:0.5, medium:0.7, low:0.85 }[sensitivity])

  // Wake word listener
  useEffect(()=>{
    if(!wakeOn){ try{wakeRef.current?.stop()}catch{}; return }
    const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition
    if(!SR) return
    const phrases = getWakePhrases()
    const setup=()=>{
      if(stRef.current!=='idle'&&stRef.current!=='wake') return
      const rec=new SR(); wakeRef.current=rec
      rec.continuous=false; rec.interimResults=true; rec.lang='hi-IN'
      rec.onresult=(e:any)=>{
        const results=[...e.results]
        const lastResult=results[results.length-1]
        const conf=lastResult[0]?.confidence||0
        const t=results.map((r:any)=>r[0].transcript).join(' ').toLowerCase()
        const hit=phrases.some(p=>t.includes(p))
        if(hit&&conf>=getSensThreshold()){ haptic.wake(); rec.stop(); startListen() }
      }
      rec.onend=()=>{ if(wakeOn&&(stRef.current==='idle'||stRef.current==='wake')){ setSt('wake'); setTimeout(setup,500) } }
      rec.onerror=()=>setTimeout(setup,1000)
      setSt('wake'); try{rec.start()}catch{}
    }
    setup()
    return ()=>{ try{wakeRef.current?.stop()}catch{} }
  },[wakeOn,customWake,sensitivity])

  const speak=useCallback(async(text:string,dl:'hi'|'en'='hi')=>{
    setSt('speaking'); haptic.double()
    const short=text.slice(0,500)
    const lowBatt=battery!==null&&battery<20

    // Always try browser first if low battery
    if(lowBatt){
      window.speechSynthesis.cancel()
      const utt=new SpeechSynthesisUtterance(short)
      utt.lang=dl==='en'?'en-IN':'hi-IN'; utt.rate=speed
      const vv=window.speechSynthesis.getVoices()
      const m=vv.find(v=>v.lang.startsWith(dl==='en'?'en':'hi'))
      if(m) utt.voice=m
      await new Promise<void>(r=>{utt.onend=()=>r();utt.onerror=()=>r();window.speechSynthesis.speak(utt)})
      setSt('idle'); if(continuous||convMode) setTimeout(()=>startListen(),600); return
    }

    try{
      // Server returns binary audio stream (not base64) — 33% less Vercel bandwidth
      const res=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({text:short,lang:dl,speed,voiceName:voice}),
        signal:AbortSignal.timeout(15000)})
      
      if(res.ok){
        const contentType=res.headers.get('content-type')||''
        
        if(contentType.startsWith('audio/')){
          // Binary stream — create blob URL, no base64 overhead
          const blob=await res.blob()
          const audioUrl=URL.createObjectURL(blob)
          const audio=new Audio(audioUrl)
          audioRef.current=audio; audio.playbackRate=speed
          await new Promise<void>(r=>{
            audio.onended=()=>{ URL.revokeObjectURL(audioUrl); r() }
            audio.onerror=()=>{ URL.revokeObjectURL(audioUrl); r() }
            audio.play().catch(()=>{ URL.revokeObjectURL(audioUrl); r() })
          })
          setSt('idle'); if(continuous||convMode) setTimeout(()=>startListen(),600); return
        }
        
        // JSON response = use browser fallback
        const data=await res.json()
        if(!data.useBrowser&&data.audioBase64){
          // Legacy base64 fallback (shouldn't happen with v2 route)
          const audio=new Audio(`data:${data.mimeType||'audio/mpeg'};base64,${data.audioBase64}`)
          audioRef.current=audio; audio.playbackRate=speed
          await new Promise<void>(r=>{audio.onended=()=>r();audio.onerror=()=>r();audio.play().catch(()=>r())})
          setSt('idle'); if(continuous||convMode) setTimeout(()=>startListen(),600); return
        }
      }
    }catch{}

    // Browser Web Speech API fallback (zero Vercel, always works)
    window.speechSynthesis.cancel()
    const utt=new SpeechSynthesisUtterance(short)
    utt.lang=dl==='en'?'en-IN':'hi-IN'; utt.rate=speed
    const vv=window.speechSynthesis.getVoices()
    const m=vv.find(v=>v.lang.startsWith(dl==='en'?'en':'hi'))
    if(m) utt.voice=m
    await new Promise<void>(r=>{utt.onend=()=>r();utt.onerror=()=>r();window.speechSynthesis.speak(utt)})
    setSt('idle'); if(continuous||convMode) setTimeout(()=>startListen(),600)
  },[voice,speed,battery,continuous,convMode])

  const sendToJARVIS=useCallback(async(text:string,dl:'hi'|'en'='hi')=>{
    if(!text.trim()){setSt('idle');return}
    setSt('thinking'); setReply(''); setImgUrl(''); haptic.medium()

    // Short affirmations in conv mode
    if(convMode&&/^(theek hai|haan|okay|ok|sure|bilkul|sahi|yes|nahi|no|nope)$/i.test(text.trim())){
      const ack=['Haan bhai, bata aage','Theek hai, sun raha hun','Okay, kya chahiye?'][Math.floor(Math.random()*3)]
      setReply(ack); await speak(ack,dl); return
    }

    if(/image|photo|tasveer|wallpaper|draw|banao.*pic/i.test(text)){
      const url=`https://image.pollinations.ai/prompt/${encodeURIComponent(text.replace(/image|photo|banao|dikhao|tasveer|please|karo|picture|wallpaper/gi,'').trim())}?width=768&height=768&model=flux&nologo=true`
      setImgUrl(url); const r='Lo — image ban gayi! 🎨'; setReply(r)
      setHist(h=>[...h,{role:'user',content:text},{role:'assistant',content:r}].slice(-12))
      await speak(r,dl); return
    }

    saveChat({role:'user',content:text,timestamp:Date.now()}).catch(()=>{})
    try{
      const memCtx=await buildMemoryContext()
      // Conversation mode carries last 6 exchanges
      const ctxHistory = convMode ? history.slice(-12) : history.slice(-4)
      const res=await fetch('/api/jarvis/stream',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:text,chatMode:'flash',history:ctxHistory,memoryContext:memCtx})})
      if(!res.ok||!res.body) throw new Error('failed')
      const reader=res.body.getReader(); const dec=new TextDecoder(); let full='',thk=''
      while(true){
        const{done,value}=await reader.read(); if(done) break
        for(const line of dec.decode(value).split('\n')){
          if(!line.startsWith('data: ')) continue
          try{
            const d=JSON.parse(line.slice(6))
            if(d.type==='token'){full+=d.token;setReply(cleanResponse(full))}
            else if(d.type==='thinking'){thk=d.thinking;setThk(thk)}
            else if(d.type==='done'){
              const clean=cleanResponse(full)
              setReply(clean)
              setHist(h=>[...h,{role:'user',content:text},{role:'assistant',content:clean}].slice(-12))
              saveChat({role:'assistant',content:clean,timestamp:Date.now()}).catch(()=>{})
              const{parseLearnTags}=await import('../../lib/personality')
              for(const t of parseLearnTags(full)) await addMemory(t.type as any,t.data,6).catch(()=>{})
            }
          }catch{}
        }
      }
      await speak(cleanResponse(full),dl)
    }catch{
      haptic.error()
      const e='Network problem. Internet check karo.'
      setReply(e); await speak(e,dl)
    }
  },[history,speak,convMode])

  const startListen=useCallback(()=>{
    try{audioRef.current?.pause()}catch{}; window.speechSynthesis.cancel()
    const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition
    if(!SR){alert('Voice not supported in this browser.');return}
    const rec=new SR(); recRef.current=rec
    rec.lang='hi-IN'; rec.continuous=false; rec.interimResults=true
    let fin=''; let dl:'hi'|'en'='hi'
    setSt('listening'); haptic.light(); setTr('')
    rec.onresult=(e:any)=>{
      let f='',i=''
      for(let x=e.resultIndex;x<e.results.length;x++){
        if(e.results[x].isFinal) f+=e.results[x][0].transcript
        else i+=e.results[x][0].transcript
      }
      const combined=f||i; setTr(combined)
      // Rough audio level from confidence
      const conf=e.results[e.results.length-1]?.[0]?.confidence||0.5
      setAudioLevel(Math.min(1,conf*1.5))
      if(f){fin=f; dl=/^[a-zA-Z\s.,!?'"0-9\-]+$/.test(f.trim())?'en':'hi'}
    }
    rec.onspeechend=()=>rec.stop()
    rec.onend=()=>{if(fin.trim()) sendToJARVIS(fin.trim(),dl); else setSt('idle')}
    rec.onerror=(e:any)=>{if(e.error!=='aborted'){haptic.error();setSt('idle')}}
    try{rec.start()}catch{setSt('idle')}
  },[sendToJARVIS])

  const tap=()=>{
    if(st==='idle'||st==='wake') startListen()
    else if(st==='listening'){try{recRef.current?.stop()}catch{}}
    else if(st==='speaking'){try{audioRef.current?.pause()}catch{};window.speechSynthesis.cancel();setSt('idle')}
  }

  const cfg={
    idle:     {color:'#00e5ff',label:'Tap karo — baat karo'},
    wake:     {color:'#a78bfa',label:`"${customWake||'Hey JARVIS'}" ya "Bhai" bolo...`},
    listening:{color:'#ff4444',label:'Sun raha hun...'},
    thinking: {color:'#a78bfa',label:'Soch raha hun...'},
    speaking: {color:'#00e676',label:'Bol raha hun...'},
  }[st]

  return (
    <div style={{position:'fixed',inset:0,display:'flex',flexDirection:'column',background:'#090d18'}}>
      <div className="bg-grid"/>
      <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 14px',borderBottom:'1px solid rgba(255,255,255,.05)',background:'rgba(9,13,24,.96)',backdropFilter:'blur(10px)',flexShrink:0,zIndex:10}}>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:'#00e5ff',letterSpacing:2}}>🎙️ VOICE</div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {battery!==null&&<span style={{fontSize:10,color:battery<20?'#ff4444':'var(--border)'}}>🔋 {battery}%</span>}
          {convMode&&<span style={{fontSize:9,padding:'2px 7px',borderRadius:6,background:'rgba(0,229,255,.08)',color:'#00e5ff',border:'1px solid rgba(0,229,255,.2)'}}>💬 Conv</span>}
          <button onClick={()=>setShowCfg(p=>!p)} style={{background:'none',border:'1px solid rgba(255,255,255,.08)',color:'var(--border)',fontSize:12,padding:'4px 10px',borderRadius:8,cursor:'pointer'}}>{showCfg?'✕':'⚙️'}</button>
        </div>
      </header>

      {showCfg&&(
        <div style={{background:'rgba(12,20,34,.98)',borderBottom:'1px solid rgba(255,255,255,.05)',padding:'12px 16px',flexShrink:0,overflowY:'auto',maxHeight:260}}>
          {/* Speed */}
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <span style={{fontSize:10,color:'var(--border)',width:44}}>Speed</span>
            <input type="range" min=".5" max="2" step=".1" value={speed} onChange={e=>setSpeed(parseFloat(e.target.value))} style={{flex:1,accentColor:'#00e5ff'}}/>
            <span style={{fontSize:11,color:'#00e5ff',width:28}}>{speed}x</span>
          </div>

          {/* Voices */}
          <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:10}}>
            {VOICES.map(v=>(
              <button key={v.id} onClick={()=>setVoice(v.id)} style={{padding:'4px 10px',borderRadius:9,fontSize:10,cursor:'pointer',border:`1px solid ${voice===v.id?'rgba(0,229,255,.3)':'rgba(255,255,255,.06)'}`,background:voice===v.id?'rgba(0,229,255,.1)':'transparent',color:voice===v.id?'#00e5ff':'var(--border)'}}>{v.l}</button>
            ))}
          </div>

          {/* Custom Wake Word */}
          <div style={{marginBottom:10}}>
            <div style={{fontSize:10,color:'var(--border)',marginBottom:4}}>Custom Wake Word</div>
            <input value={customWake} onChange={e=>setCustomWake(e.target.value)}
              placeholder='e.g. "aye bhai" (blank = default)'
              style={{width:'100%',padding:'6px 10px',borderRadius:8,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.1)',color:'var(--text)',fontSize:12,outline:'none',boxSizing:'border-box'}}/>
          </div>

          {/* Sensitivity */}
          <div style={{display:'flex',gap:4,marginBottom:10}}>
            <span style={{fontSize:10,color:'var(--border)',alignSelf:'center',marginRight:4}}>Sens:</span>
            {(['high','medium','low'] as const).map(s=>(
              <button key={s} onClick={()=>setSens(s)} style={{padding:'4px 10px',borderRadius:9,fontSize:10,cursor:'pointer',border:`1px solid ${sensitivity===s?'rgba(0,229,255,.3)':'rgba(255,255,255,.06)'}`,background:sensitivity===s?'rgba(0,229,255,.1)':'transparent',color:sensitivity===s?'#00e5ff':'var(--border)'}}>{s}</button>
            ))}
          </div>

          {/* Toggles */}
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            <button onClick={()=>setWakeOn(p=>!p)} style={{padding:'5px 11px',borderRadius:10,fontSize:11,cursor:'pointer',border:`1px solid ${wakeOn?'rgba(167,139,250,.3)':'rgba(255,255,255,.06)'}`,background:wakeOn?'rgba(167,139,250,.1)':'transparent',color:wakeOn?'#a78bfa':'var(--border)'}}>👋 Wake: {wakeOn?'ON':'OFF'}</button>
            <button onClick={()=>setCont(p=>!p)} style={{padding:'5px 11px',borderRadius:10,fontSize:11,cursor:'pointer',border:`1px solid ${continuous?'rgba(0,230,118,.3)':'rgba(255,255,255,.06)'}`,background:continuous?'rgba(0,230,118,.1)':'transparent',color:continuous?'#00e676':'var(--border)'}}>🔄 Loop: {continuous?'ON':'OFF'}</button>
            <button onClick={()=>setConvMode(p=>!p)} style={{padding:'5px 11px',borderRadius:10,fontSize:11,cursor:'pointer',border:`1px solid ${convMode?'rgba(0,229,255,.3)':'rgba(255,255,255,.06)'}`,background:convMode?'rgba(0,229,255,.1)':'transparent',color:convMode?'#00e5ff':'var(--border)'}}>💬 Conv: {convMode?'ON':'OFF'}</button>
            <button onClick={()=>setNoiseGate(p=>!p)} style={{padding:'5px 11px',borderRadius:10,fontSize:11,cursor:'pointer',border:`1px solid ${noiseGate?'rgba(255,171,0,.3)':'rgba(255,255,255,.06)'}`,background:noiseGate?'rgba(255,171,0,.08)':'transparent',color:noiseGate?'#ffab00':'var(--border)'}}>🎛️ Noise: {noiseGate?'ON':'OFF'}</button>
          </div>
          {battery!==null&&battery<20&&<div style={{marginTop:8,fontSize:10,color:'#ff6060'}}>⚡ Low battery — server TTS off, browser TTS only</div>}
        </div>
      )}

      <main style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'20px 20px 80px',gap:20,overflowY:'auto'}}>
        <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'center'}}>
          {(st==='listening'||st==='speaking'||st==='thinking'||st==='wake')&&(
            <div style={{position:'absolute',width:140,height:140,borderRadius:'50%',border:`2px solid ${cfg.color}`,opacity:.3,animation:'ping 1.5s cubic-bezier(0,0,.2,1) infinite'}}/>
          )}
          <button onClick={tap} style={{width:110,height:110,borderRadius:'50%',background:'radial-gradient(circle at 35% 35%,rgba(255,255,255,.08),rgba(0,0,0,.3))',border:`2px solid ${cfg.color}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,boxShadow:`0 0 40px ${cfg.color}22`,transition:'all .3s'}}>
            {st==='idle'||st==='wake'?'🎤':st==='listening'?'👂':st==='thinking'?'🧠':'🔊'}
          </button>
        </div>

        <div style={{fontSize:13,color:cfg.color,letterSpacing:.5,textAlign:'center'}}>
          {cfg.label}
          {st==='idle'&&wakeOn&&<div style={{fontSize:10,color:'var(--border)',marginTop:2}}>Wake: "{customWake||'Hey JARVIS'}" / "Bhai" ({sensitivity})</div>}
          {st==='idle'&&convMode&&<div style={{fontSize:10,color:'var(--border)',marginTop:2}}>Conversation mode — context yaad rahega</div>}
        </div>

        {(st==='listening'||st==='speaking')&&<Waveform active level={audioLevel}/>}

        {transcript&&<div style={{padding:'10px 16px',background:'rgba(255,255,255,.03)',border:'1px solid rgba(0,229,255,.1)',borderRadius:12,color:'#c8dff0',fontSize:13,maxWidth:380,textAlign:'center',lineHeight:1.5}}>{transcript}</div>}

        {imgUrl&&<img src={imgUrl} alt="generated" style={{width:'100%',maxWidth:360,borderRadius:12}}/>}

        {reply&&<div style={{padding:'14px 16px',background:'rgba(0,229,255,.04)',border:'1px solid rgba(0,229,255,.1)',borderRadius:14,color:'var(--text)',fontSize:14,maxWidth:380,lineHeight:1.6,width:'100%'}}>
          <div style={{fontSize:10,color:'var(--text-faint)',marginBottom:6}}>JARVIS</div>
          {reply}
          <button onClick={()=>navigator.share?.({text:reply}).catch(()=>navigator.clipboard?.writeText(reply).catch(()=>{}))}
            style={{marginTop:8,background:'none',border:'none',color:'var(--text-faint)',fontSize:11,cursor:'pointer'}}>↗ Share</button>
        </div>}

        {thinking&&(
          <details style={{maxWidth:380,width:'100%'}}>
            <summary style={{fontSize:10,color:'#4a5090',cursor:'pointer'}}>🧠 Reasoning</summary>
            <div style={{fontSize:11,color:'#2a3060',padding:8,background:'rgba(100,80,200,.06)',borderRadius:8,marginTop:4,maxHeight:100,overflow:'auto',whiteSpace:'pre-wrap'}}>{thinking}</div>
          </details>
        )}

        {history.length>0&&<div style={{fontSize:10,color:'#1a3050',display:'flex',gap:8,alignItems:'center'}}>
          <span>{Math.floor(history.length/2)} exchanges{convMode?' (context ON)':''} ·</span>
          <button onClick={()=>{setHist([]);setReply('');setThk('')}} style={{background:'none',border:'none',color:'#1a3050',fontSize:10,cursor:'pointer',textDecoration:'underline'}}>Clear</button>
        </div>}
      </main>

      <BottomNav active="voice"/>
      <style>{`
        @keyframes ping{75%,100%{transform:scale(1.4);opacity:0}}
        .bg-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(0,229,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,.015) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;z-index:0}
      `}</style>
    </div>
  )
}
