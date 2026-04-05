'use client'
// app/timer/page.tsx — JARVIS Timer Hub: Pomodoro + Stopwatch + Countdown
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { initTheme } from '../../lib/theme'

type Mode = 'pomodoro'|'stopwatch'|'countdown'

const POMO_PRESETS = [
  {label:'Study',work:25,rest:5,color:'#00e5ff'},
  {label:'Deep',work:50,rest:10,color:'#a78bfa'},
  {label:'Quick',work:15,rest:3,color:'#22c55e'},
  {label:'NEET',work:45,rest:10,color:'#f59e0b'},
]

function fmt(s:number){ const m=Math.floor(s/60); return `${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}` }
function fmtLong(s:number){ const h=Math.floor(s/3600); const m=Math.floor((s%3600)/60); return h>0?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`:fmt(s) }

function beep(freq=880,dur=0.3) {
  try {
    const ctx=new (window.AudioContext||(window as any).webkitAudioContext)()
    const o=ctx.createOscillator(); const g=ctx.createGain()
    o.connect(g);g.connect(ctx.destination)
    o.frequency.value=freq; g.gain.setValueAtTime(.3,ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+dur)
    o.start();o.stop(ctx.currentTime+dur)
  } catch {}
}

export default function TimerPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Mode>('pomodoro')
  // Pomodoro
  const [preset, setPreset] = useState(POMO_PRESETS[0])
  const [pomSecs, setPomSecs] = useState(POMO_PRESETS[0].work*60)
  const [pomPhase, setPomPhase] = useState<'work'|'rest'>('work')
  const [pomRun, setPomRun] = useState(false)
  const [pomRounds, setPomRounds] = useState(0)
  // Stopwatch
  const [swSecs, setSwSecs] = useState(0)
  const [swRun, setSwRun] = useState(false)
  const [laps, setLaps] = useState<number[]>([])
  // Countdown
  const [cdInput, setCdInput] = useState('05:00')
  const [cdSecs, setCdSecs] = useState(300)
  const [cdRun, setCdRun] = useState(false)
  const [cdDone, setCdDone] = useState(false)

  const pomRef=useRef<any>(null); const swRef=useRef<any>(null); const cdRef=useRef<any>(null)
  useEffect(()=>{initTheme()},[])

  // Pomodoro
  useEffect(()=>{
    if(!pomRun){clearInterval(pomRef.current);return}
    pomRef.current=setInterval(()=>{
      setPomSecs(s=>{
        if(s<=1){
          beep(pomPhase==='work'?660:440,0.5)
          setPomPhase(p=>{
            const next=p==='work'?'rest':'work'
            setPomSecs(next==='work'?preset.work*60:preset.rest*60)
            if(p==='rest')setPomRounds(r=>r+1)
            return next
          })
          return 0
        }
        return s-1
      })
    },1000)
    return()=>clearInterval(pomRef.current)
  },[pomRun,pomPhase,preset])

  // Stopwatch
  useEffect(()=>{
    if(!swRun){clearInterval(swRef.current);return}
    swRef.current=setInterval(()=>setSwSecs(s=>s+1),1000)
    return()=>clearInterval(swRef.current)
  },[swRun])

  // Countdown
  useEffect(()=>{
    if(!cdRun){clearInterval(cdRef.current);return}
    cdRef.current=setInterval(()=>{
      setCdSecs(s=>{
        if(s<=1){clearInterval(cdRef.current);setCdRun(false);setCdDone(true);beep(880,1);return 0}
        return s-1
      })
    },1000)
    return()=>clearInterval(cdRef.current)
  },[cdRun])

  const pomPct = pomPhase==='work' ? 1-pomSecs/(preset.work*60) : 1-pomSecs/(preset.rest*60)
  const cdTotal = (() => { const[m,s]=(cdInput||'5:0').split(':').map(Number); return (m||0)*60+(s||0) })()

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg)',color:'var(--text)',fontFamily:"'Inter',sans-serif"}}>
      <div className="bg-grid"/>
      <div style={{position:'sticky',top:0,zIndex:50,background:'var(--header)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--border)',padding:'10px 16px',display:'flex',alignItems:'center',gap:8}}>
        <button onClick={()=>router.push('/')} style={{background:'var(--accent-bg)',border:'1px solid var(--border-a)',borderRadius:8,color:'var(--accent)',fontSize:14,fontWeight:800,width:28,height:28,fontFamily:'monospace'}}>J</button>
        <div style={{flex:1,fontSize:15,fontWeight:700}}>⏱️ Timer Hub</div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',borderBottom:'1px solid var(--border)'}}>
        {(['pomodoro','stopwatch','countdown'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'10px',background:tab===t?'rgba(0,229,255,.08)':'transparent',border:'none',borderBottom:`2px solid ${tab===t?'var(--accent)':'transparent'}`,color:tab===t?'var(--accent)':'var(--text-3)',fontSize:11,fontWeight:600,cursor:'pointer',textTransform:'capitalize'}}>
            {t==='pomodoro'?'🍅':t==='stopwatch'?'⏱':'⏳'} {t}
          </button>
        ))}
      </div>

      <div style={{padding:'20px 16px',display:'flex',flexDirection:'column',alignItems:'center'}}>
        {/* POMODORO */}
        {tab==='pomodoro'&&(
          <>
            <div style={{display:'flex',gap:6,marginBottom:20,flexWrap:'wrap',justifyContent:'center'}}>
              {POMO_PRESETS.map(p=>(
                <button key={p.label} onClick={()=>{setPreset(p);setPomSecs(p.work*60);setPomPhase('work');setPomRun(false)}} style={{padding:'5px 12px',borderRadius:20,fontSize:11,fontWeight:600,background:preset.label===p.label?p.color+'22':'transparent',border:`1px solid ${preset.label===p.label?p.color:p.color+'44'}`,color:p.color,cursor:'pointer'}}>{p.label}</button>
              ))}
            </div>
            <div style={{position:'relative',width:200,height:200,marginBottom:20}}>
              <svg width="200" height="200" style={{position:'absolute',top:0,left:0,transform:'rotate(-90deg)'}}>
                <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="8"/>
                <circle cx="100" cy="100" r="90" fill="none" stroke={preset.color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${2*Math.PI*90}`} strokeDashoffset={`${2*Math.PI*90*(1-pomPct)}`} style={{transition:'stroke-dashoffset .5s'}}/>
              </svg>
              <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                <div style={{fontSize:10,color:'var(--text-3)',marginBottom:4,textTransform:'uppercase',letterSpacing:1}}>{pomPhase==='work'?'🎯 Focus':'☕ Rest'}</div>
                <div style={{fontSize:48,fontWeight:900,color:preset.color,fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}>{fmt(pomSecs)}</div>
                <div style={{fontSize:10,color:'var(--text-3)',marginTop:4}}>Round {pomRounds+1}</div>
              </div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setPomRun(p=>!p)} style={{padding:'12px 28px',borderRadius:12,background:pomRun?'rgba(239,68,68,.15)':'var(--accent-bg)',border:`1px solid ${pomRun?'rgba(239,68,68,.3)':'var(--border-a)'}`,color:pomRun?'#ef4444':'var(--accent)',fontSize:14,fontWeight:700,cursor:'pointer'}}>{pomRun?'⏸ Pause':'▶ Start'}</button>
              <button onClick={()=>{setPomRun(false);setPomSecs(preset.work*60);setPomPhase('work')}} style={{padding:'12px 16px',borderRadius:12,background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',color:'var(--text-3)',fontSize:14,cursor:'pointer'}}>↺</button>
            </div>
          </>
        )}

        {/* STOPWATCH */}
        {tab==='stopwatch'&&(
          <>
            <div style={{fontSize:56,fontWeight:900,color:'var(--accent)',fontFamily:"'JetBrains Mono',monospace",marginBottom:20,lineHeight:1}}>{fmtLong(swSecs)}</div>
            <div style={{display:'flex',gap:10,marginBottom:16}}>
              <button onClick={()=>setSwRun(p=>!p)} style={{padding:'12px 28px',borderRadius:12,background:swRun?'rgba(239,68,68,.15)':'var(--accent-bg)',border:`1px solid ${swRun?'rgba(239,68,68,.3)':'var(--border-a)'}`,color:swRun?'#ef4444':'var(--accent)',fontSize:14,fontWeight:700,cursor:'pointer'}}>{swRun?'⏸ Stop':'▶ Start'}</button>
              {swRun&&<button onClick={()=>setLaps(p=>[swSecs,...p])} style={{padding:'12px 16px',borderRadius:12,background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',color:'var(--text-2)',fontSize:13,cursor:'pointer'}}>🏁 Lap</button>}
              <button onClick={()=>{setSwRun(false);setSwSecs(0);setLaps([])}} style={{padding:'12px 16px',borderRadius:12,background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',color:'var(--text-3)',fontSize:14,cursor:'pointer'}}>↺</button>
            </div>
            {laps.map((l,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 12px',background:'rgba(255,255,255,.03)',borderRadius:8,marginBottom:4,width:'100%',maxWidth:280}}>
                <span style={{fontSize:11,color:'var(--text-3)'}}>Lap {laps.length-i}</span>
                <span style={{fontSize:11,color:'var(--accent)',fontFamily:"'JetBrains Mono',monospace"}}>{fmtLong(l)}</span>
              </div>
            ))}
          </>
        )}

        {/* COUNTDOWN */}
        {tab==='countdown'&&(
          <>
            {!cdRun&&cdSecs===cdTotal&&(
              <input value={cdInput} onChange={e=>{setCdInput(e.target.value);const[m,s]=(e.target.value||'0:0').split(':').map(Number);setCdSecs((m||0)*60+(s||0));setCdDone(false)}}
                placeholder="MM:SS" style={{fontSize:32,textAlign:'center',background:'transparent',border:'none',color:'var(--accent)',fontFamily:"'JetBrains Mono',monospace",outline:'none',width:160,marginBottom:20}}/>
            )}
            <div style={{fontSize:cdDone?48:56,fontWeight:900,color:cdDone?'#22c55e':cdSecs<10?'#ef4444':'var(--accent)',fontFamily:"'JetBrains Mono',monospace",marginBottom:20,lineHeight:1,animation:cdDone?'pulse 1s infinite':undefined}}>
              {cdDone?'✓ Done!':fmt(cdSecs)}
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{setCdRun(p=>!p);setCdDone(false)}} disabled={cdSecs===0&&!cdDone} style={{padding:'12px 28px',borderRadius:12,background:cdRun?'rgba(239,68,68,.15)':'var(--accent-bg)',border:`1px solid ${cdRun?'rgba(239,68,68,.3)':'var(--border-a)'}`,color:cdRun?'#ef4444':'var(--accent)',fontSize:14,fontWeight:700,cursor:'pointer'}}>{cdRun?'⏸ Pause':'▶ Start'}</button>
              <button onClick={()=>{setCdRun(false);const[m,s]=(cdInput||'5:0').split(':').map(Number);setCdSecs((m||0)*60+(s||0));setCdDone(false)}} style={{padding:'12px 16px',borderRadius:12,background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',color:'var(--text-3)',fontSize:14,cursor:'pointer'}}>↺</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
