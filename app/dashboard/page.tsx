'use client'
// app/dashboard/page.tsx — JARVIS Personal Dashboard v3
// Tasks + Habits + Goals + API Usage + Quick Actions

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Task { id: string; text: string; done: boolean; date: string }
interface Habit { id: string; name: string; streak: number; lastDone: string; emoji: string }
interface Goal { id: string; name: string; progress: number; target: string; color: string }

export default function DashboardPage() {
  const router = useRouter()
  const [tasks,  setTasks]  = useState<Task[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [goals,  setGoals]  = useState<Goal[]>([])
  const [tab,    setTab]    = useState<'tasks'|'habits'|'goals'|'stats'>('tasks')
  const [newTask, setNewTask] = useState('')
  const [newHabit, setNewHabit] = useState('')
  const [newGoalName, setNewGoalName] = useState('')
  const [newGoalTarget, setNewGoalTarget] = useState('')
  const today = new Date().toDateString()

  useEffect(() => { load() }, [])

  function load() {
    try { setTasks(JSON.parse(localStorage.getItem('jarvis_dash_tasks')||'[]')) } catch {}
    try { setHabits(JSON.parse(localStorage.getItem('jarvis_dash_habits')||'[]')) } catch {}
    try { setGoals(JSON.parse(localStorage.getItem('jarvis_dash_goals')||'[]')) } catch {}
  }

  const save = {
    tasks:  (t: Task[])  => { setTasks(t);  localStorage.setItem('jarvis_dash_tasks',  JSON.stringify(t)) },
    habits: (h: Habit[]) => { setHabits(h); localStorage.setItem('jarvis_dash_habits', JSON.stringify(h)) },
    goals:  (g: Goal[])  => { setGoals(g);  localStorage.setItem('jarvis_dash_goals',  JSON.stringify(g)) },
  }

  function addTask() {
    if (!newTask.trim()) return
    save.tasks([{ id: Date.now().toString(), text: newTask.trim(), done: false, date: today }, ...tasks])
    setNewTask('')
  }

  function addHabit() {
    if (!newHabit.trim()) return
    const emojis = ['💪','📚','🏃','🧘','💧','🥗','😴','✍️','🎯','🔥']
    save.habits([...habits, { id: Date.now().toString(), name: newHabit.trim(), streak: 0, lastDone: '', emoji: emojis[habits.length % emojis.length] }])
    setNewHabit('')
  }

  function checkHabit(id: string) {
    save.habits(habits.map(h => {
      if (h.id !== id) return h
      const wasToday = h.lastDone === today
      if (wasToday) return { ...h, lastDone: '', streak: Math.max(0, h.streak - 1) }
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1)
      const wasYesterday = h.lastDone === yesterday.toDateString()
      return { ...h, lastDone: today, streak: wasYesterday ? h.streak + 1 : 1 }
    }))
  }

  function addGoal() {
    if (!newGoalName.trim()) return
    const colors = ['#00e5ff','#00ff88','#ff6b6b','#ffbb00','#9b59b6','#e67e22']
    save.goals([...goals, { id: Date.now().toString(), name: newGoalName.trim(), progress: 0, target: newGoalTarget || '100%', color: colors[goals.length % colors.length] }])
    setNewGoalName(''); setNewGoalTarget('')
  }

  function updateGoal(id: string, delta: number) {
    save.goals(goals.map(g => g.id === id ? { ...g, progress: Math.min(100, Math.max(0, g.progress + delta)) } : g))
  }

  const todayTasks = tasks.filter(t => t.date === today)
  const doneTasks = todayTasks.filter(t => t.done).length
  const streakHabits = habits.filter(h => h.lastDone === today).length
  const avgGoal = goals.length ? Math.round(goals.reduce((s,g)=>s+g.progress,0)/goals.length) : 0

  const S = {
    page: { minHeight:'100vh', height:'100vh', overflowY:'auto', background:'var(--bg)', color:'var(--text)', WebkitOverflowScrolling:'touch' } as React.CSSProperties,
    card: { background:'var(--card)', border:'1px solid var(--border)', borderRadius:'14px', padding:'14px', marginBottom:'10px' } as React.CSSProperties,
    input: { width:'100%', padding:'10px 14px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'10px', color:'var(--text)', fontSize:'13px', boxSizing:'border-box' } as React.CSSProperties,
    btn: (col='var(--accent)') => ({ padding:'10px 16px', background:col, border:'none', borderRadius:'10px', color:col==='var(--accent)'?'#000':'#fff', fontWeight:700, cursor:'pointer', fontSize:'13px' }) as React.CSSProperties,
    tab: (a:boolean) => ({ padding:'8px 14px', borderRadius:'20px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:600, background:a?'var(--accent)':'var(--card)', color:a?'#000':'var(--text)' }) as React.CSSProperties,
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ padding:'16px', borderBottom:'1px solid var(--border)', background:'var(--card)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'14px' }}>
          <button onClick={()=>router.back()} style={{ background:'none', border:'none', color:'var(--accent)', fontSize:'20px', cursor:'pointer' }}>←</button>
          <div style={{ fontWeight:800, fontSize:'18px' }}>📊 Dashboard</div>
        </div>
        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'8px' }}>
          {[
            { label:'Tasks', val:`${doneTasks}/${todayTasks.length}`, icon:'📋', color:'#00e5ff' },
            { label:'Habits', val:`${streakHabits}/${habits.length}`, icon:'💪', color:'#00ff88' },
            { label:'Goals', val:`${avgGoal}%`, icon:'🎯', color:'#ffbb00' },
            { label:'Streak', val:`${Math.max(0,...habits.map(h=>h.streak),0)}d`, icon:'🔥', color:'#ff6b6b' },
          ].map(s => (
            <div key={s.label} style={{ background:'var(--bg)', borderRadius:'12px', padding:'10px', textAlign:'center', border:`1px solid ${s.color}33` }}>
              <div style={{ fontSize:'18px' }}>{s.icon}</div>
              <div style={{ fontSize:'16px', fontWeight:800, color:s.color }}>{s.val}</div>
              <div style={{ fontSize:'10px', color:'var(--dim)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'6px', padding:'12px 16px', overflowX:'auto', borderBottom:'1px solid var(--border)' }}>
        {(['tasks','habits','goals','stats'] as const).map(t=>(
          <button key={t} style={S.tab(tab===t)} onClick={()=>setTab(t)}>
            {t==='tasks'?'📋 Tasks':t==='habits'?'💪 Habits':t==='goals'?'🎯 Goals':'📈 Stats'}
          </button>
        ))}
      </div>

      <div style={{ padding:'16px', maxWidth:'600px', margin:'0 auto' }}>

        {/* TASKS */}
        {tab==='tasks' && <>
          <div style={{ display:'flex', gap:'8px', marginBottom:'12px' }}>
            <input value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTask()} placeholder="Aaj kya karna hai?" style={S.input} />
            <button onClick={addTask} style={S.btn()}>+</button>
          </div>
          {todayTasks.length===0 && <div style={{ textAlign:'center', color:'var(--dim)', padding:'30px', fontSize:'14px' }}>Aaj koi task nahi! Chill karo 😎</div>}
          {todayTasks.map(t=>(
            <div key={t.id} style={{ ...S.card, display:'flex', alignItems:'center', gap:'10px', opacity:t.done?0.5:1 }}>
              <input type="checkbox" checked={t.done} onChange={()=>save.tasks(tasks.map(x=>x.id===t.id?{...x,done:!x.done}:x))} style={{ width:'18px', height:'18px', accentColor:'var(--accent)', cursor:'pointer' }} />
              <span style={{ flex:1, fontSize:'14px', textDecoration:t.done?'line-through':'none' }}>{t.text}</span>
              <button onClick={()=>save.tasks(tasks.filter(x=>x.id!==t.id))} style={{ background:'none', border:'none', color:'var(--dim)', cursor:'pointer', fontSize:'18px' }}>×</button>
            </div>
          ))}
          {tasks.filter(t=>t.date!==today).length > 0 && (
            <details style={{ marginTop:'8px' }}>
              <summary style={{ cursor:'pointer', color:'var(--dim)', fontSize:'13px', padding:'8px 0' }}>Pichle tasks ({tasks.filter(t=>t.date!==today).length})</summary>
              {tasks.filter(t=>t.date!==today).slice(0,10).map(t=>(
                <div key={t.id} style={{ ...S.card, display:'flex', gap:'10px', opacity:0.6, marginBottom:'6px' }}>
                  <span style={{ fontSize:'11px', color:'var(--dim)', flexShrink:0 }}>{t.date}</span>
                  <span style={{ flex:1, fontSize:'13px', textDecoration:t.done?'line-through':'none' }}>{t.text}</span>
                  <button onClick={()=>save.tasks(tasks.filter(x=>x.id!==t.id))} style={{ background:'none', border:'none', color:'var(--dim)', cursor:'pointer' }}>×</button>
                </div>
              ))}
              <button onClick={()=>save.tasks(tasks.filter(t=>t.date===today))} style={{ ...S.btn('#ff444444'), width:'100%', marginTop:'6px', background:'rgba(255,68,68,.1)', color:'#ff6666' }}>Clear all old tasks</button>
            </details>
          )}
        </>}

        {/* HABITS */}
        {tab==='habits' && <>
          <div style={{ display:'flex', gap:'8px', marginBottom:'12px' }}>
            <input value={newHabit} onChange={e=>setNewHabit(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addHabit()} placeholder="Naya habit (e.g. Paani peena)" style={S.input} />
            <button onClick={addHabit} style={S.btn()}>+</button>
          </div>
          {habits.length===0 && <div style={{ textAlign:'center', color:'var(--dim)', padding:'30px', fontSize:'14px' }}>Koi habit nahi! Add karo 💪</div>}
          {habits.map(h=>{
            const done = h.lastDone===today
            return (
              <div key={h.id} style={{ ...S.card, display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ fontSize:'28px' }}>{h.emoji}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:'14px' }}>{h.name}</div>
                  <div style={{ fontSize:'12px', color:'var(--dim)', marginTop:'2px' }}>
                    🔥 {h.streak} day streak {done && '· ✅ Done today!'}
                  </div>
                </div>
                <div style={{ display:'flex', gap:'6px' }}>
                  <button onClick={()=>checkHabit(h.id)} style={{ padding:'8px 14px', background:done?'rgba(0,255,136,.15)':'var(--accent)', border:done?'1px solid #00ff88':'none', borderRadius:'10px', color:done?'#00ff88':'#000', fontWeight:700, cursor:'pointer', fontSize:'13px' }}>
                    {done?'✓ Done':'Check'}
                  </button>
                  <button onClick={()=>save.habits(habits.filter(x=>x.id!==h.id))} style={{ background:'none', border:'none', color:'var(--dim)', cursor:'pointer', fontSize:'18px' }}>×</button>
                </div>
              </div>
            )
          })}
        </>}

        {/* GOALS */}
        {tab==='goals' && <>
          <div style={S.card}>
            <input value={newGoalName} onChange={e=>setNewGoalName(e.target.value)} placeholder="Goal ka naam" style={{ ...S.input, marginBottom:'8px' }} />
            <div style={{ display:'flex', gap:'8px' }}>
              <input value={newGoalTarget} onChange={e=>setNewGoalTarget(e.target.value)} placeholder="Target (e.g. Complete project)" style={{ ...S.input, flex:1 }} />
              <button onClick={addGoal} style={S.btn()}>Add</button>
            </div>
          </div>
          {goals.length===0 && <div style={{ textAlign:'center', color:'var(--dim)', padding:'30px', fontSize:'14px' }}>Koi goal nahi! Soch lo kya karna hai 🎯</div>}
          {goals.map(g=>(
            <div key={g.id} style={S.card}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                <div style={{ fontWeight:600, fontSize:'14px' }}>{g.name}</div>
                <div style={{ display:'flex', gap:'4px', alignItems:'center' }}>
                  <span style={{ fontSize:'16px', fontWeight:800, color:g.color }}>{g.progress}%</span>
                  <button onClick={()=>save.goals(goals.filter(x=>x.id!==g.id))} style={{ background:'none', border:'none', color:'var(--dim)', cursor:'pointer', marginLeft:'4px' }}>×</button>
                </div>
              </div>
              <div style={{ fontSize:'12px', color:'var(--dim)', marginBottom:'10px' }}>🎯 {g.target}</div>
              <div style={{ background:'var(--bg)', borderRadius:'10px', height:'10px', overflow:'hidden', marginBottom:'10px' }}>
                <div style={{ height:'100%', width:`${g.progress}%`, background:`linear-gradient(90deg, ${g.color}, ${g.color}88)`, borderRadius:'10px', transition:'width .3s' }}/>
              </div>
              <div style={{ display:'flex', gap:'6px' }}>
                {[-10,+10,+25].map(d=>(
                  <button key={d} onClick={()=>updateGoal(g.id,d)} style={{ flex:1, padding:'6px', background:'var(--bg)', border:`1px solid ${d>0?g.color:'var(--border)'}`, borderRadius:'8px', color:d>0?g.color:'var(--dim)', cursor:'pointer', fontSize:'12px', fontWeight:600 }}>
                    {d>0?'+':''}{d}%
                  </button>
                ))}
              </div>
            </div>
          ))}
        </>}

        {/* STATS */}
        {tab==='stats' && <>
          <div style={S.card}>
            <div style={{ fontSize:'14px', fontWeight:700, marginBottom:'12px' }}>📊 Overview</div>
            {[
              { label:'Aaj ke tasks', val:`${doneTasks}/${todayTasks.length} complete`, icon:'📋' },
              { label:'Habits checked', val:`${streakHabits}/${habits.length} aaj`, icon:'💪' },
              { label:'Average goal progress', val:`${avgGoal}%`, icon:'🎯' },
              { label:'Longest habit streak', val:`${Math.max(0,...habits.map(h=>h.streak),0)} days`, icon:'🔥' },
              { label:'Total habits', val:`${habits.length}`, icon:'✅' },
              { label:'Total goals', val:`${goals.length}`, icon:'🏆' },
            ].map(s=>(
              <div key={s.label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:'13px', color:'var(--dim)' }}>{s.icon} {s.label}</span>
                <span style={{ fontSize:'13px', fontWeight:600 }}>{s.val}</span>
              </div>
            ))}
          </div>
          <div style={S.card}>
            <div style={{ fontSize:'14px', fontWeight:700, marginBottom:'12px' }}>⚡ Quick Actions</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              {[
                { label:'💬 Chat', action:()=>router.push('/') },
                { label:'🌅 Briefing', action:()=>router.push('/briefing') },
                { label:'📚 Learn', action:()=>router.push('/learn') },
                { label:'🌸 Anime', action:()=>router.push('/anime') },
              ].map(q=>(
                <button key={q.label} onClick={q.action} style={{ padding:'12px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'12px', color:'var(--text)', cursor:'pointer', fontSize:'13px', fontWeight:500 }}>
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        </>}

        <div style={{ height:'20px' }}/>
      </div>
    </div>
  )
}
