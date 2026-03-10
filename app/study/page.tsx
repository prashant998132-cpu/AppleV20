'use client'
// app/study/page.tsx — JARVIS Study Hub v24
// Generic study goal + session tracker — koi bhi subject
// NEET/JEE hardcoding removed completely

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface StudyGoal {
  id: string; subject: string; icon: string; target: string
  deadline: string; totalHours: number; doneHours: number
  sessions: StudySession[]; createdAt: number; color: string
}
interface StudySession {
  id: string; date: string; duration: number; topic: string; notes: string
}

const ICON_MAP: [string, string][] = [
  ['math','📐'],['physics','⚡'],['chemistry','🧪'],['biology','🧬'],
  ['history','📜'],['geography','🌍'],['english','📖'],['hindi','🇮🇳'],
  ['economics','💹'],['computer','💻'],['coding','💻'],['programming','💻'],
  ['science','🔬'],['art','🎨'],['music','🎵'],['language','🗣️'],
]
function getIcon(s:string){
  const k=s.toLowerCase()
  for(const [kw,ic] of ICON_MAP){ if(k.includes(kw)) return ic }
  return '📚'
}

const COLORS=['#00e5ff','#a78bfa','#34d399','#fb923c','#f472b6','#facc15','#60a5fa','#f87171']
const KEY='jarvis_study_goals_v1'
const load=():StudyGoal[]=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
const save=(g:StudyGoal[])=>{try{localStorage.setItem(KEY,JSON.stringify(g))}catch{}}

function Timer({onLog}:{onLog:(m:number)=>void}){
  const [on,setOn]=useState(false)
  const [s,setS]=useState(0)
  const ref=useRef<any>(null)
  useEffect(()=>{
    if(on)ref.current=setInterval(()=>setS(x=>x+1),1000)
    else clearInterval(ref.current)
    return()=>clearInterval(ref.current)
  },[on])
  const f=(n:number)=>String(n).padStart(2,'0')
  const hh=Math.floor(s/3600),mm=Math.floor((s%3600)/60),ss=s%60
  function stop(){setOn(false);if(s>=60)onLog(Math.round(s/60));setS(0)}
  return(
    <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:'16px',textAlign:'center'}}>
      <div style={{fontSize:9,color:'var(--text-muted)',letterSpacing:2,marginBottom:8}}>FOCUS TIMER</div>
      <div style={{fontSize:36,fontWeight:700,color:'var(--accent)',fontFamily:"'Space Mono',monospace",letterSpacing:3}}>
        {f(hh)}:{f(mm)}:{f(ss)}
      </div>
      <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:14}}>
        <button onClick={()=>setOn(r=>!r)} style={{padding:'8px 22px',borderRadius:10,background:on?'rgba(255,80,80,.15)':'var(--accent-bg)',border:`1px solid ${on?'rgba(255,80,80,.4)':'var(--border-acc)'}`,color:on?'#ff6060':'var(--accent)',fontSize:13,cursor:'pointer',fontWeight:600}}>
          {on?'⏸ Pause':s>0?'▶ Resume':'▶ Start'}
        </button>
        {s>0&&<button onClick={stop} style={{padding:'8px 16px',borderRadius:10,background:'var(--bg-surface)',border:'1px solid var(--border)',color:'var(--text-muted)',fontSize:13,cursor:'pointer'}}>✓ Log</button>}
        {s>0&&<button onClick={()=>{setOn(false);setS(0)}} style={{padding:'8px 12px',borderRadius:10,background:'transparent',border:'1px solid var(--border)',color:'var(--text-faint)',fontSize:13,cursor:'pointer'}}>✕</button>}
      </div>
      {s>0&&s<60&&<div style={{fontSize:9,color:'var(--text-faint)',marginTop:6}}>60s ke baad log hoga</div>}
    </div>
  )
}

function GoalCard({goal,onAdd,onDelete}:{goal:StudyGoal;onAdd:(id:string,m:number,t:string,n:string)=>void;onDelete:(id:string)=>void}){
  const [open,setOpen]=useState(false)
  const [lm,setLm]=useState('');const [lt,setLt]=useState('');const [ln,setLn]=useState('')
  const pct=Math.min(100,Math.round(goal.doneHours/Math.max(goal.totalHours,1)*100))
  const days=Math.ceil((new Date(goal.deadline).getTime()-Date.now())/86400000)
  const today=new Date().toISOString().slice(0,10)
  const todayMin=goal.sessions.filter(s=>s.date===today).reduce((a,s)=>a+s.duration,0)
  function sub(){const m=parseInt(lm);if(!m||m<1)return;onAdd(goal.id,m,lt||'General',ln);setLm('');setLt('');setLn('');setOpen(false)}
  return(
    <div style={{background:'var(--bg-card)',border:`1px solid ${goal.color}40`,borderRadius:16,overflow:'hidden',marginBottom:12}}>
      <div style={{padding:'12px 14px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
        <span style={{fontSize:22}}>{goal.icon}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:14,color:'var(--text)'}}>{goal.subject}</div>
          <div style={{fontSize:11,color:'var(--text-muted)',marginTop:1}}>🎯 {goal.target}</div>
        </div>
        <button onClick={()=>onDelete(goal.id)} style={{background:'none',border:'none',color:'var(--text-faint)',fontSize:14,cursor:'pointer',padding:4}}>✕</button>
      </div>
      <div style={{padding:'10px 14px'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
          <span style={{fontSize:11,color:'var(--text-muted)'}}>{goal.doneHours.toFixed(1)}h / {goal.totalHours}h</span>
          <span style={{fontSize:11,color:'var(--text-muted)'}}>{pct}%</span>
        </div>
        <div style={{height:6,borderRadius:3,background:'var(--bg-surface)'}}>
          <div style={{height:'100%',width:`${pct}%`,background:goal.color,borderRadius:3,transition:'width .4s'}}/>
        </div>
        <div style={{display:'flex',gap:14,marginTop:10,alignItems:'center'}}>
          <div style={{textAlign:'center' as const}}><div style={{fontSize:15,fontWeight:700,color:goal.color}}>{todayMin}m</div><div style={{fontSize:9,color:'var(--text-faint)'}}>today</div></div>
          <div style={{textAlign:'center' as const}}><div style={{fontSize:15,fontWeight:700,color:days<3?'#ff6060':'var(--text)'}}>{days<0?'Over':days+'d'}</div><div style={{fontSize:9,color:'var(--text-faint)'}}>left</div></div>
          <div style={{textAlign:'center' as const}}><div style={{fontSize:15,fontWeight:700,color:'var(--text)'}}>{goal.sessions.length}</div><div style={{fontSize:9,color:'var(--text-faint)'}}>sessions</div></div>
          <div style={{flex:1}}/>
          <button onClick={()=>setOpen(p=>!p)} style={{padding:'5px 14px',borderRadius:8,background:'var(--accent-bg)',border:'1px solid var(--border-acc)',color:'var(--accent)',fontSize:11,cursor:'pointer',fontWeight:600}}>+ Log</button>
        </div>
        {open&&(
          <div style={{marginTop:10,background:'var(--bg-surface)',borderRadius:10,padding:'10px 12px',display:'flex',flexDirection:'column' as const,gap:7}}>
            <div style={{display:'flex',gap:7}}>
              <input value={lm} onChange={e=>setLm(e.target.value)} placeholder="Minutes" type="number" style={{flex:1,background:'var(--bg-input)',border:'1px solid var(--border)',color:'var(--text)',borderRadius:8,padding:'7px 10px',fontSize:12,width:'100%'}}/>
              <input value={lt} onChange={e=>setLt(e.target.value)} placeholder="Topic (e.g. Ch 3)" style={{flex:2,background:'var(--bg-input)',border:'1px solid var(--border)',color:'var(--text)',borderRadius:8,padding:'7px 10px',fontSize:12,width:'100%'}}/>
            </div>
            <input value={ln} onChange={e=>setLn(e.target.value)} placeholder="Notes (optional)" style={{background:'var(--bg-input)',border:'1px solid var(--border)',color:'var(--text)',borderRadius:8,padding:'7px 10px',fontSize:12,width:'100%'}}/>
            <button onClick={sub} style={{padding:'8px',borderRadius:8,background:'var(--accent-bg)',border:'1px solid var(--border-acc)',color:'var(--accent)',fontSize:12,cursor:'pointer',fontWeight:600}}>✓ Save Session</button>
          </div>
        )}
        {goal.sessions.length>0&&(
          <div style={{marginTop:8}}>
            {goal.sessions.slice(-3).reverse().map(s=>(
              <div key={s.id} style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--text-faint)',padding:'3px 0',borderTop:'1px solid var(--border)'}}>
                <span>{s.topic}</span><span>{s.duration}min · {s.date.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AddModal({onAdd,onClose}:{onAdd:(g:StudyGoal)=>void;onClose:()=>void}){
  const [sub,setSub]=useState('');const [tgt,setTgt]=useState('');const [hrs,setHrs]=useState('');const [ci,setCi]=useState(0)
  const [dl,setDl]=useState(()=>{const d=new Date();d.setDate(d.getDate()+30);return d.toISOString().slice(0,10)})
  function submit(){
    if(!sub.trim()||!tgt.trim())return
    onAdd({id:'g_'+Date.now(),subject:sub.trim(),icon:getIcon(sub),target:tgt.trim(),deadline:dl,totalHours:parseFloat(hrs)||10,doneHours:0,sessions:[],createdAt:Date.now(),color:COLORS[ci]})
  }
  return(
    <div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'flex-end'}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:'var(--bg-card)',borderRadius:'18px 18px 0 0',padding:20,display:'flex',flexDirection:'column' as const,gap:12,maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{fontWeight:700,fontSize:15,color:'var(--text)'}}>📚 New Study Goal</div>
        <input value={sub} onChange={e=>setSub(e.target.value)} placeholder="Subject (Maths, History, Coding...)" style={{background:'var(--bg-input)',border:'1px solid var(--border)',color:'var(--text)',borderRadius:10,padding:'10px 12px',fontSize:14,width:'100%'}}/>
        <input value={tgt} onChange={e=>setTgt(e.target.value)} placeholder="Target (e.g. Chapter 5 complete karo, 80 marks laao)" style={{background:'var(--bg-input)',border:'1px solid var(--border)',color:'var(--text)',borderRadius:10,padding:'10px 12px',fontSize:14,width:'100%'}}/>
        <div style={{display:'flex',gap:10}}>
          <div style={{flex:1}}>
            <div style={{fontSize:10,color:'var(--text-muted)',marginBottom:4}}>Hours Needed</div>
            <input value={hrs} onChange={e=>setHrs(e.target.value)} placeholder="e.g. 20" type="number" style={{background:'var(--bg-input)',border:'1px solid var(--border)',color:'var(--text)',borderRadius:10,padding:'10px 12px',fontSize:14,width:'100%'}}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:10,color:'var(--text-muted)',marginBottom:4}}>Deadline</div>
            <input value={dl} onChange={e=>setDl(e.target.value)} type="date" style={{background:'var(--bg-input)',border:'1px solid var(--border)',color:'var(--text)',borderRadius:10,padding:'10px 12px',fontSize:14,width:'100%'}}/>
          </div>
        </div>
        <div>
          <div style={{fontSize:10,color:'var(--text-muted)',marginBottom:6}}>Color</div>
          <div style={{display:'flex',gap:8}}>{COLORS.map((c,i)=><div key={c} onClick={()=>setCi(i)} style={{width:24,height:24,borderRadius:'50%',background:c,cursor:'pointer',border:ci===i?`3px solid var(--text)`:'2px solid transparent'}}/>)}</div>
        </div>
        <button onClick={submit} style={{padding:'12px',borderRadius:12,background:'var(--accent-bg)',border:'1px solid var(--border-acc)',color:'var(--accent)',fontSize:14,cursor:'pointer',fontWeight:700}}>✓ Goal Add Karo</button>
      </div>
    </div>
  )
}

export default function StudyPage(){
  const router=useRouter()
  const [goals,setGoals]=useState<StudyGoal[]>([])
  const [showAdd,setShowAdd]=useState(false)
  const [timerGid,setTimerGid]=useState('')
  const [tab,setTab]=useState<'goals'|'timer'|'stats'>('goals')
  useEffect(()=>{setGoals(load())},[])

  function addGoal(g:StudyGoal){const u=[...goals,g];setGoals(u);save(u);setShowAdd(false);if(!timerGid)setTimerGid(g.id)}
  function delGoal(id:string){const u=goals.filter(g=>g.id!==id);setGoals(u);save(u)}
  function addSess(gid:string,min:number,topic:string,notes:string){
    const today=new Date().toISOString().slice(0,10)
    const u=goals.map(g=>g.id===gid?{...g,doneHours:g.doneHours+min/60,sessions:[...g.sessions,{id:'s_'+Date.now(),date:today,duration:min,topic,notes}]}:g)
    setGoals(u);save(u)
  }

  const todayMin=goals.flatMap(g=>g.sessions).filter(s=>s.date===new Date().toISOString().slice(0,10)).reduce((a,s)=>a+s.duration,0)
  const totalH=goals.reduce((a,g)=>a+g.doneHours,0)
  const active=goals.filter(g=>Math.ceil((new Date(g.deadline).getTime()-Date.now())/86400000)>=0&&g.doneHours/Math.max(g.totalHours,1)<1)

  const weekDays=Array.from({length:7},(_,i)=>{
    const d=new Date();d.setDate(d.getDate()-6+i)
    const ds=d.toISOString().slice(0,10)
    const m=goals.flatMap(g=>g.sessions).filter(s=>s.date===ds).reduce((a,s)=>a+s.duration,0)
    return{day:['S','M','T','W','T','F','S'][d.getDay()],min:m}
  })
  const maxM=Math.max(...weekDays.map(d=>d.min),1)

  return(
    <div style={{position:'fixed',inset:0,background:'var(--bg)',display:'flex',flexDirection:'column',color:'var(--text)'}}>
      <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',background:'var(--header-bg)',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <button onClick={()=>router.push('/')} style={{background:'none',border:'none',color:'var(--accent)',fontSize:18,cursor:'pointer'}}>←</button>
        <div style={{fontSize:13,fontWeight:700,letterSpacing:2,color:'var(--text)',fontFamily:"'Space Mono',monospace"}}>STUDY HUB</div>
        <div style={{flex:1}}/>
        <button onClick={()=>setShowAdd(true)} style={{padding:'6px 12px',borderRadius:10,background:'var(--accent-bg)',border:'1px solid var(--border-acc)',color:'var(--accent)',fontSize:12,cursor:'pointer',fontWeight:600}}>+ Goal</button>
      </div>

      <div style={{display:'flex',borderBottom:'1px solid var(--border)',flexShrink:0}}>
        {[{l:'Today',v:`${todayMin}m`,c:'var(--accent)'},{l:'Total',v:`${totalH.toFixed(1)}h`,c:'#a78bfa'},{l:'Active',v:active.length,c:'#34d399'}].map(s=>(
          <div key={s.l} style={{flex:1,padding:'10px 8px',textAlign:'center' as const,borderRight:'1px solid var(--border)'}}>
            <div style={{fontSize:16,fontWeight:700,color:s.c as string}}>{s.v}</div>
            <div style={{fontSize:9,color:'var(--text-faint)'}}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',borderBottom:'1px solid var(--border)',flexShrink:0}}>
        {(['goals','timer','stats'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'9px',background:tab===t?'var(--accent-bg)':'transparent',border:'none',borderBottom:tab===t?'2px solid var(--accent)':'2px solid transparent',color:tab===t?'var(--accent)':'var(--text-muted)',fontSize:11,cursor:'pointer',fontWeight:tab===t?700:400,textTransform:'uppercase' as const,letterSpacing:1}}>
            {t==='goals'?'🎯 Goals':t==='timer'?'⏱️ Timer':'📊 Stats'}
          </button>
        ))}
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'12px 14px'}}>
        {tab==='goals'&&(
          goals.length===0?(
            <div style={{textAlign:'center' as const,padding:'60px 20px',color:'var(--text-muted)'}}>
              <div style={{fontSize:44,marginBottom:12}}>📚</div>
              <div style={{fontSize:14,marginBottom:6,color:'var(--text)'}}>Koi goal nahi hai abhi</div>
              <div style={{fontSize:12,color:'var(--text-faint)',marginBottom:20}}>Koi bhi subject add karo — Maths, History, Coding, kuch bhi!</div>
              <button onClick={()=>setShowAdd(true)} style={{padding:'10px 24px',borderRadius:12,background:'var(--accent-bg)',border:'1px solid var(--border-acc)',color:'var(--accent)',fontSize:14,cursor:'pointer',fontWeight:600}}>+ Pehla Goal Add Karo</button>
            </div>
          ):goals.map(g=><GoalCard key={g.id} goal={g} onAdd={addSess} onDelete={delGoal}/>)
        )}

        {tab==='timer'&&(
          <div style={{display:'flex',flexDirection:'column' as const,gap:12}}>
            <Timer onLog={min=>{if(timerGid)addSess(timerGid,min,'Timer session','')}}/>
            {goals.length>0&&(
              <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,padding:'12px 14px'}}>
                <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:8}}>Kis subject ke liye?</div>
                {goals.map(g=>(
                  <button key={g.id} onClick={()=>setTimerGid(g.id)} style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'8px 10px',borderRadius:8,border:`1px solid ${timerGid===g.id?g.color+'60':'var(--border)'}`,background:timerGid===g.id?g.color+'18':'transparent',color:'var(--text)',fontSize:12,cursor:'pointer',marginBottom:4,textAlign:'left' as const}}>
                    <span>{g.icon}</span><span>{g.subject}</span>
                    {timerGid===g.id&&<span style={{marginLeft:'auto',color:g.color,fontSize:10}}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab==='stats'&&(
          <div style={{display:'flex',flexDirection:'column' as const,gap:12}}>
            <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:'14px'}}>
              <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:12}}>📅 Last 7 Days</div>
              <div style={{display:'flex',gap:4,alignItems:'flex-end',height:80}}>
                {weekDays.map((d,i)=>(
                  <div key={i} style={{flex:1,display:'flex',flexDirection:'column' as const,alignItems:'center',gap:3}}>
                    <div style={{width:'100%',background:d.min>0?'var(--accent)':'var(--bg-surface)',borderRadius:'3px 3px 0 0',height:`${Math.round(d.min/maxM*64)+4}px`,minHeight:4}}/>
                    <div style={{fontSize:8,color:'var(--text-faint)'}}>{d.day}</div>
                  </div>
                ))}
              </div>
            </div>
            {goals.map(g=>{
              const p=Math.min(100,Math.round(g.doneHours/Math.max(g.totalHours,1)*100))
              return(
                <div key={g.id} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,padding:'12px 14px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                    <span style={{fontSize:12,fontWeight:600}}>{g.icon} {g.subject}</span>
                    <span style={{fontSize:11,color:'var(--text-muted)'}}>{g.doneHours.toFixed(1)}h / {g.totalHours}h</span>
                  </div>
                  <div style={{height:5,borderRadius:3,background:'var(--bg-surface)'}}><div style={{height:'100%',width:`${p}%`,background:g.color,borderRadius:3}}/></div>
                  <div style={{fontSize:9,color:'var(--text-faint)',marginTop:4}}>{g.sessions.length} sessions · {p}% complete</div>
                </div>
              )
            })}
            {goals.length===0&&<div style={{textAlign:'center' as const,padding:'40px 20px',color:'var(--text-muted)',fontSize:13}}>Pehle koi goal add karo 👆</div>}
          </div>
        )}
      </div>

      {showAdd&&<AddModal onAdd={addGoal} onClose={()=>setShowAdd(false)}/>}
    </div>
  )
}
