'use client'
// app/habits/page.tsx — JARVIS Habit Tracker with streaks
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initTheme } from '../../lib/theme'

interface Habit { id:string; name:string; icon:string; color:string; logs:string[]; goal:number }

const ICONS = ['💪','📚','🏃','💧','🧘','😴','✍️','🥗','🚭','💻','🎵','🙏']
const COLORS = ['#00e5ff','#22c55e','#f59e0b','#f43f5e','#a78bfa','#fb923c']

const todayStr = () => new Date().toISOString().split('T')[0]
const last30 = () => Array.from({length:30},(_,i)=>{ const d=new Date();d.setDate(d.getDate()-29+i);return d.toISOString().split('T')[0] })

function streak(logs:string[]): number {
  const set = new Set(logs)
  let s=0,d=new Date()
  while(set.has(d.toISOString().split('T')[0])){s++;d.setDate(d.getDate()-1)}
  return s
}

export default function HabitsPage() {
  const router = useRouter()
  const [habits, setHabits] = useState<Habit[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('💪')
  const [newColor, setNewColor] = useState(COLORS[0])
  const today = todayStr()
  const days = last30()

  useEffect(() => {
    initTheme()
    try { setHabits(JSON.parse(localStorage.getItem('jarvis_habits')||'[]')) } catch {}
  }, [])

  const save = (h:Habit[]) => { setHabits(h); localStorage.setItem('jarvis_habits',JSON.stringify(h)) }

  const addHabit = () => {
    if(!newName.trim()) return
    save([...habits,{id:Date.now().toString(),name:newName.trim(),icon:newIcon,color:newColor,logs:[],goal:1}])
    setNewName('');setShowAdd(false)
  }

  const toggle = (id:string) => {
    save(habits.map(h => h.id===id ? {
      ...h, logs: h.logs.includes(today) ? h.logs.filter(l=>l!==today) : [...h.logs,today]
    } : h))
  }

  const del = (id:string) => save(habits.filter(h=>h.id!==id))

  const doneToday = habits.filter(h=>h.logs.includes(today)).length

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg)',color:'var(--text)',fontFamily:"'Inter',sans-serif"}}>
      <div className="bg-grid"/>

      {/* Header */}
      <div style={{position:'sticky',top:0,zIndex:50,background:'var(--header)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--border)',padding:'10px 16px',display:'flex',alignItems:'center',gap:8}}>
        <button onClick={()=>router.push('/')} style={{background:'var(--accent-bg)',border:'1px solid var(--border-a)',borderRadius:8,color:'var(--accent)',fontSize:14,fontWeight:800,width:28,height:28,fontFamily:'monospace'}}>J</button>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:700}}>🔥 Habit Tracker</div>
          <div style={{fontSize:10,color:'var(--text-3)'}}>{doneToday}/{habits.length} done today</div>
        </div>
        <button onClick={()=>setShowAdd(p=>!p)} style={{background:'var(--accent)',color:'#000',border:'none',borderRadius:8,padding:'6px 14px',fontSize:12,fontWeight:700,cursor:'pointer'}}>+ Add</button>
      </div>

      {/* Add habit form */}
      {showAdd && (
        <div style={{padding:'14px',background:'var(--bg-card)',borderBottom:'1px solid var(--border)'}}>
          <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addHabit()}
            placeholder="Habit naam..." style={{width:'100%',marginBottom:10,background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 12px',color:'var(--text)',fontSize:13}}/>
          <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
            {ICONS.map(i=><button key={i} onClick={()=>setNewIcon(i)} style={{fontSize:18,background:newIcon===i?'var(--accent-bg)':'transparent',border:`1px solid ${newIcon===i?'var(--border-a)':'var(--border)'}`,borderRadius:8,width:36,height:36,cursor:'pointer'}}>{i}</button>)}
          </div>
          <div style={{display:'flex',gap:6,marginBottom:10}}>
            {COLORS.map(c=><button key={c} onClick={()=>setNewColor(c)} style={{width:24,height:24,borderRadius:'50%',background:c,border:`3px solid ${newColor===c?'#fff':'transparent'}`,cursor:'pointer'}}/>)}
          </div>
          <button onClick={addHabit} style={{width:'100%',padding:10,borderRadius:10,background:'var(--accent)',color:'#000',border:'none',fontWeight:700,fontSize:13,cursor:'pointer'}}>Add Habit</button>
        </div>
      )}

      {/* Progress bar */}
      {habits.length > 0 && (
        <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
            <span style={{fontSize:11,color:'var(--text-3)'}}>Aaj ka progress</span>
            <span style={{fontSize:11,color:'var(--accent)',fontWeight:600}}>{Math.round(doneToday/habits.length*100)}%</span>
          </div>
          <div style={{height:6,background:'var(--border)',borderRadius:3,overflow:'hidden'}}>
            <div style={{height:'100%',background:'var(--accent)',width:`${doneToday/habits.length*100}%`,borderRadius:3,transition:'width .3s'}}/>
          </div>
        </div>
      )}

      <div style={{padding:'10px 14px 80px'}}>
        {habits.length===0 && (
          <div style={{textAlign:'center',padding:'50px 0',color:'var(--text-3)'}}>
            <div style={{fontSize:40,marginBottom:10}}>🔥</div>
            <div style={{fontSize:13}}>Koi habit nahi. + Add se shuru karo!</div>
          </div>
        )}
        {habits.map(h => {
          const done = h.logs.includes(today)
          const str = streak(h.logs)
          return (
            <div key={h.id} style={{background:'var(--bg-card)',border:`1px solid ${done?h.color+'44':'var(--border)'}`,borderRadius:14,padding:'14px',marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <button onClick={()=>toggle(h.id)} style={{width:44,height:44,borderRadius:12,background:done?h.color+'22':'rgba(255,255,255,.04)',border:`2px solid ${done?h.color:'var(--border)'}`,fontSize:20,cursor:'pointer',flexShrink:0,transition:'all .2s'}}>{h.icon}</button>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,color:done?h.color:'var(--text)',textDecoration:done?'none':'none'}}>{h.name}</div>
                  <div style={{fontSize:10,color:'var(--text-3)',marginTop:2}}>
                    {str>0?`🔥 ${str} day streak`:'No streak yet'} · {h.logs.length} total
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:18,fontWeight:800,color:h.color,fontFamily:"'JetBrains Mono',monospace"}}>{str}</div>
                  <div style={{fontSize:9,color:'var(--text-3)'}}>streak</div>
                </div>
                <button onClick={()=>del(h.id)} style={{background:'none',border:'none',color:'var(--text-4)',fontSize:13,cursor:'pointer'}}>✕</button>
              </div>
              {/* Mini heatmap - last 30 days */}
              <div style={{display:'flex',gap:2,flexWrap:'wrap'}}>
                {days.map(d=>(
                  <div key={d} title={d} style={{width:8,height:8,borderRadius:2,background:h.logs.includes(d)?h.color:'rgba(255,255,255,.07)',flexShrink:0}}/>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
