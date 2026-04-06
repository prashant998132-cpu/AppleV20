'use client'
// app/fitness/page.tsx — JARVIS Fitness Tracker
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initTheme } from '../../lib/theme'

interface Set { reps:number; weight:number }
interface Exercise { id:string; name:string; sets:Set[]; note:string }
interface Workout { id:string; date:string; name:string; exercises:Exercise[]; duration:number; startTime:number }

const EXERCISES = ['Push-ups','Pull-ups','Squats','Deadlifts','Bench Press','Shoulder Press','Lunges','Plank','Bicep Curls','Tricep Dips','Running','Cycling','Jumping Jacks','Burpees','Mountain Climbers']
const TEMPLATES = [
  {name:'Push Day 💪',exercises:['Bench Press','Push-ups','Shoulder Press','Tricep Dips']},
  {name:'Pull Day 🔙',exercises:['Pull-ups','Bicep Curls','Deadlifts']},
  {name:'Leg Day 🦵',exercises:['Squats','Lunges','Deadlifts']},
  {name:'Cardio 🏃',exercises:['Running','Jumping Jacks','Burpees','Mountain Climbers']},
  {name:'Full Body 🔥',exercises:['Push-ups','Squats','Pull-ups','Plank']},
]

export default function FitnessPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'workout'|'history'|'stats'>('workout')
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [active, setActive] = useState<Workout|null>(null)
  const [exInput, setExInput] = useState('')
  const [elapsed, setElapsed] = useState(0)

  useEffect(()=>{
    initTheme()
    try { setWorkouts(JSON.parse(localStorage.getItem('jarvis_fitness')||'[]')) } catch {}
  },[])

  useEffect(()=>{
    if(!active) return
    const id=setInterval(()=>setElapsed(Math.floor((Date.now()-active.startTime)/1000)),1000)
    return()=>clearInterval(id)
  },[active])

  const save=(w:Workout[])=>{setWorkouts(w);localStorage.setItem('jarvis_fitness',JSON.stringify(w))}
  const fmtTime=(s:number)=>`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`

  const startWorkout=(name:string,exs:string[])=>{
    const w:Workout={id:Date.now().toString(),date:new Date().toISOString().split('T')[0],name,exercises:exs.map(e=>({id:Math.random().toString(),name:e,sets:[{reps:0,weight:0}],note:''})),duration:0,startTime:Date.now()}
    setActive(w); setElapsed(0)
  }

  const addSet=(exId:string)=>{
    if(!active) return
    setActive({...active,exercises:active.exercises.map(e=>e.id===exId?{...e,sets:[...e.sets,{reps:0,weight:0}]}:e)})
  }
  const updateSet=(exId:string,setIdx:number,field:'reps'|'weight',val:number)=>{
    if(!active) return
    setActive({...active,exercises:active.exercises.map(e=>e.id===exId?{...e,sets:e.sets.map((s,i)=>i===setIdx?{...s,[field]:val}:s)}:e)})
  }
  const addExercise=()=>{
    if(!exInput.trim()||!active) return
    setActive({...active,exercises:[...active.exercises,{id:Math.random().toString(),name:exInput.trim(),sets:[{reps:0,weight:0}],note:''}]})
    setExInput('')
  }
  const finishWorkout=()=>{
    if(!active) return
    const done={...active,duration:elapsed}
    save([done,...workouts]); setActive(null); setElapsed(0)
  }

  // PRs
  const prs: Record<string,number> = {}
  workouts.forEach(w=>w.exercises.forEach(e=>{const max=Math.max(...e.sets.map(s=>s.weight));if(!prs[e.name]||max>prs[e.name])prs[e.name]=max}))
  const totalWorkouts=workouts.length
  const totalSets=workouts.reduce((s,w)=>s+w.exercises.reduce((es,e)=>es+e.sets.length,0),0)
  const thisWeek=workouts.filter(w=>{const d=new Date(w.date);const now=new Date();return (now.getTime()-d.getTime())<7*86400000}).length

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg)',color:'var(--text)',fontFamily:"'Inter',sans-serif"}}>
      <div className="bg-grid"/>
      <div style={{position:'sticky',top:0,zIndex:50,background:'var(--header)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--border)',padding:'10px 16px',display:'flex',alignItems:'center',gap:8}}>
        <button onClick={()=>router.push('/')} style={{background:'var(--accent-bg)',border:'1px solid var(--border-a)',borderRadius:8,color:'var(--accent)',fontSize:14,fontWeight:800,width:28,height:28,fontFamily:'monospace'}}>J</button>
        <div style={{flex:1}}><div style={{fontSize:15,fontWeight:700}}>💪 Fitness Tracker</div>{active&&<div style={{fontSize:11,color:'#22c55e'}}>🟢 {active.name} · {fmtTime(elapsed)}</div>}</div>
        {active&&<button onClick={finishWorkout} style={{padding:'6px 12px',background:'#22c55e',color:'#fff',border:'none',borderRadius:8,fontWeight:700,fontSize:12,cursor:'pointer'}}>✓ Done</button>}
      </div>

      <div style={{display:'flex',borderBottom:'1px solid var(--border)'}}>
        {(['workout','history','stats'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'9px',background:tab===t?'var(--accent-bg)':'transparent',border:'none',borderBottom:`2px solid ${tab===t?'var(--accent)':'transparent'}`,color:tab===t?'var(--accent)':'var(--text-3)',fontSize:11,fontWeight:600,cursor:'pointer',textTransform:'capitalize'}}>
            {t==='workout'?'🏋️':t==='history'?'📋':'📊'} {t}
          </button>
        ))}
      </div>

      {/* WORKOUT */}
      {tab==='workout'&&!active&&(
        <div style={{padding:'12px 14px 80px'}}>
          <div style={{fontSize:11,color:'var(--text-3)',marginBottom:10,fontWeight:600}}>TEMPLATES</div>
          {TEMPLATES.map(t=>(
            <div key={t.name} onClick={()=>startWorkout(t.name,t.exercises)} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:'14px',marginBottom:8,cursor:'pointer'}}>
              <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>{t.name}</div>
              <div style={{fontSize:11,color:'var(--text-3)'}}>{t.exercises.join(' · ')}</div>
            </div>
          ))}
          <div style={{fontSize:11,color:'var(--text-3)',margin:'14px 0 8px',fontWeight:600}}>CUSTOM</div>
          <button onClick={()=>startWorkout('Custom Workout',[]) } style={{width:'100%',padding:'13px',background:'rgba(0,229,255,.08)',border:'1px solid var(--border-a)',borderRadius:12,color:'var(--accent)',fontWeight:700,fontSize:14,cursor:'pointer'}}>+ Start Custom Workout</button>
        </div>
      )}

      {tab==='workout'&&active&&(
        <div style={{padding:'10px 14px 80px'}}>
          {active.exercises.map(ex=>(
            <div key={ex.id} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:'12px',marginBottom:10}}>
              <div style={{fontSize:14,fontWeight:700,marginBottom:8}}>{ex.name}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 40px',gap:4,marginBottom:4}}>
                <div style={{fontSize:10,color:'var(--text-3)',textAlign:'center'}}>REPS</div>
                <div style={{fontSize:10,color:'var(--text-3)',textAlign:'center'}}>WEIGHT (kg)</div>
                <div/>
              </div>
              {ex.sets.map((s,i)=>(
                <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 1fr 40px',gap:4,marginBottom:4}}>
                  <input type="number" value={s.reps||''} onChange={e=>updateSet(ex.id,i,'reps',Number(e.target.value))} style={{background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:8,padding:'7px',color:'var(--text)',fontSize:14,textAlign:'center'}}/>
                  <input type="number" value={s.weight||''} onChange={e=>updateSet(ex.id,i,'weight',Number(e.target.value))} style={{background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:8,padding:'7px',color:'var(--text)',fontSize:14,textAlign:'center'}}/>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#22c55e',fontWeight:700}}>{i+1}</div>
                </div>
              ))}
              <button onClick={()=>addSet(ex.id)} style={{width:'100%',padding:'6px',background:'rgba(0,229,255,.06)',border:'1px solid var(--border-a)',borderRadius:8,color:'var(--accent)',fontSize:11,cursor:'pointer',marginTop:4}}>+ Add Set</button>
            </div>
          ))}
          <div style={{display:'flex',gap:6}}>
            <input value={exInput} onChange={e=>setExInput(e.target.value)} placeholder="Add exercise..." list="ex-list" style={{flex:1,background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:10,padding:'10px',color:'var(--text)',fontSize:13}}/>
            <datalist id="ex-list">{EXERCISES.map(e=><option key={e} value={e}/>)}</datalist>
            <button onClick={addExercise} style={{padding:'10px 14px',background:'var(--accent)',color:'#000',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer'}}>+</button>
          </div>
        </div>
      )}

      {/* HISTORY */}
      {tab==='history'&&(
        <div style={{padding:'10px 14px 80px'}}>
          {workouts.length===0&&<div style={{textAlign:'center',padding:'40px 0',color:'var(--text-3)'}}>Koi workout nahi. Shuru karo! 💪</div>}
          {workouts.map(w=>(
            <div key={w.id} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:'14px',marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                <div style={{fontSize:14,fontWeight:700}}>{w.name}</div>
                <div style={{fontSize:11,color:'var(--text-3)'}}>{fmtTime(w.duration)}</div>
              </div>
              <div style={{fontSize:11,color:'var(--text-3)'}}>{w.date} · {w.exercises.length} exercises · {w.exercises.reduce((s,e)=>s+e.sets.length,0)} sets</div>
            </div>
          ))}
        </div>
      )}

      {/* STATS */}
      {tab==='stats'&&(
        <div style={{padding:'14px 14px 80px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}}>
            {[{icon:'🏋️',label:'Workouts',val:String(totalWorkouts)},{icon:'📋',label:'Total Sets',val:String(totalSets)},{icon:'📅',label:'This Week',val:String(thisWeek)}].map(s=>(
              <div key={s.label} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,padding:'12px',textAlign:'center'}}>
                <div style={{fontSize:22,marginBottom:3}}>{s.icon}</div>
                <div style={{fontSize:18,fontWeight:800,color:'var(--accent)',fontFamily:"'JetBrains Mono',monospace"}}>{s.val}</div>
                <div style={{fontSize:9,color:'var(--text-3)'}}>{s.label}</div>
              </div>
            ))}
          </div>
          {Object.keys(prs).length>0&&(
            <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:'14px'}}>
              <div style={{fontSize:11,fontWeight:600,marginBottom:10,color:'var(--text-3)'}}>🏆 PERSONAL RECORDS</div>
              {Object.entries(prs).map(([ex,w])=>(
                <div key={ex} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
                  <span style={{fontSize:12}}>{ex}</span>
                  <span style={{fontSize:12,fontWeight:700,color:'#f59e0b',fontFamily:"'JetBrains Mono',monospace"}}>{w} kg 🏅</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
