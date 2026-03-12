'use client'
// app/dashboard/page.tsx — JARVIS Personal Dashboard v25
// Tasks + Notes + Reminders + Goals + API Usage — sab ek jagah

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUsageStats, type UsageStats } from '../../lib/rateLimit'
import { getSmartContext } from '../../lib/workflow/engine'
import { getTopCommands } from '../../lib/workflow/engine'

// ── Types ───────────────────────────────────────────────
interface Task  { id:string; text:string; done:boolean; priority:'high'|'mid'|'low'; created:number }
interface Note  { id:string; text:string; created:number; color:string }
interface Goal  { id:string; text:string; target:number; current:number; unit:string }

const COLORS = ['#00e5ff22','#7c3aed22','#00ff8822','#f59e0b22','#f472b622']
const STORAGE = { tasks:'j_tasks_v1', notes:'j_notes_v1', goals:'j_goals_v1' }

function load<T>(key:string, fallback:T):T {
  try { return JSON.parse(localStorage.getItem(key)||'null') ?? fallback } catch { return fallback }
}
function save(key:string, val:unknown) { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }

// ── Styles ──────────────────────────────────────────────
const S = {
  page:    { position:'fixed' as const, inset:0, background:'var(--bg)', color:'var(--text)', display:'flex', flexDirection:'column' as const },
  header:  { padding:'10px 14px', borderBottom:'1px solid var(--border)', background:'var(--header-bg)', display:'flex', alignItems:'center', gap:10, flexShrink:0 },
  scroll:  { flex:1, overflowY:'auto' as const, padding:'12px 14px 80px' },
  card:    { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'12px 14px', marginBottom:10 },
  label:   { fontSize:10, letterSpacing:2, color:'var(--text-faint)', fontFamily:"'Space Mono',monospace", marginBottom:8 },
  tabs:    { display:'flex', gap:6, marginBottom:14, overflowX:'auto' as const },
  tab:     (active:boolean) => ({ padding:'6px 14px', borderRadius:20, border:'1px solid var(--border)', background: active?'rgba(0,229,255,.12)':'transparent', color: active?'var(--accent)':'var(--text-muted)', fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0 }),
  input:   { width:'100%', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:10, padding:'9px 12px', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' as const },
  btn:     (c='var(--accent)') => ({ padding:'7px 14px', borderRadius:10, border:`1px solid ${c}40`, background:`${c}12`, color:c, fontSize:12, fontWeight:700, cursor:'pointer' }),
  row:     { display:'flex', alignItems:'center', gap:8, padding:'8px 0', borderBottom:'1px solid var(--border2)' },
  bar:     (pct:number, c:string) => ({ height:4, borderRadius:2, background:`${c}30`, position:'relative' as const, overflow:'hidden', marginTop:4 }),
  fill:    (pct:number, c:string) => ({ position:'absolute' as const, left:0, top:0, height:'100%', width:`${Math.min(pct,100)}%`, background:c, borderRadius:2 }),
}

export default function Dashboard() {
  const router = useRouter()
  const [tab, setTab]     = useState<'tasks'|'notes'|'goals'|'usage'>('tasks')
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [stats, setStats] = useState<UsageStats|null>(null)
  const [input, setInput] = useState('')
  const [ctx, setCtx]     = useState(getSmartContext())
  const [topCmds, setTopCmds] = useState<string[]>([])

  useEffect(() => {
    setTasks(load(STORAGE.tasks, []))
    setNotes(load(STORAGE.notes, []))
    setGoals(load(STORAGE.goals, []))
    setStats(getUsageStats())
    setTopCmds(getTopCommands(4))
    setCtx(getSmartContext())
  }, [])

  // ── Tasks ─────────────────────────────────────────────
  function addTask() {
    if (!input.trim()) return
    const t: Task = { id: Date.now()+'', text:input.trim(), done:false, priority:'mid', created:Date.now() }
    const next = [t, ...tasks]
    setTasks(next); save(STORAGE.tasks, next); setInput('')
  }
  function toggleTask(id:string) {
    const next = tasks.map(t => t.id===id ? {...t, done:!t.done} : t)
    setTasks(next); save(STORAGE.tasks, next)
  }
  function deleteTask(id:string) {
    const next = tasks.filter(t => t.id!==id)
    setTasks(next); save(STORAGE.tasks, next)
  }

  // ── Notes ─────────────────────────────────────────────
  function addNote() {
    if (!input.trim()) return
    const n: Note = { id: Date.now()+'', text:input.trim(), created:Date.now(), color: COLORS[notes.length % COLORS.length] }
    const next = [n, ...notes]
    setNotes(next); save(STORAGE.notes, next); setInput('')
  }
  function deleteNote(id:string) {
    const next = notes.filter(n => n.id!==id)
    setNotes(next); save(STORAGE.notes, next)
  }

  // ── Goals ─────────────────────────────────────────────
  function addGoal() {
    if (!input.trim()) return
    const g: Goal = { id: Date.now()+'', text:input.trim(), target:100, current:0, unit:'%' }
    const next = [...goals, g]
    setGoals(next); save(STORAGE.goals, next); setInput('')
  }
  function updateGoal(id:string, delta:number) {
    const next = goals.map(g => g.id===id ? {...g, current: Math.min(g.target, Math.max(0, g.current+delta))} : g)
    setGoals(next); save(STORAGE.goals, next)
  }

  const doneTasks = tasks.filter(t=>t.done).length
  const totalTasks = tasks.length

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <button onClick={() => router.push('/')} style={{background:'none', border:'none', color:'var(--accent)', fontSize:18, cursor:'pointer'}}>←</button>
        <div style={{fontSize:13, fontWeight:700, letterSpacing:2, fontFamily:"'Space Mono',monospace"}}>DASHBOARD</div>
        <div style={{flex:1}}/>
        <span style={{fontSize:11, color:'var(--text-muted)'}}>{ctx.greeting}</span>
      </div>

      <div style={S.scroll}>
        {/* Smart context suggestion */}
        <div style={{...S.card, background:'rgba(0,229,255,.04)', border:'1px solid rgba(0,229,255,.12)', marginBottom:12}}>
          <div style={{fontSize:12, color:'var(--accent)', marginBottom:6}}>💡 {ctx.suggestion}</div>
          <div style={{display:'flex', gap:6, flexWrap:'wrap' as const}}>
            {(topCmds.length > 0 ? topCmds : ctx.quickActions).map((q,i) => (
              <button key={i} onClick={() => router.push('/?q='+encodeURIComponent(q))}
                style={{fontSize:11, padding:'4px 10px', borderRadius:20, border:'1px solid var(--border)', background:'var(--bg-surface)', color:'var(--text-muted)', cursor:'pointer'}}>
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Summary bar */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14}}>
          {[
            { label:'Tasks Done', value:`${doneTasks}/${totalTasks}`, color:'#00e5ff' },
            { label:'Notes', value:notes.length, color:'#a78bfa' },
            { label:'Goals', value:goals.length, color:'#00ff88' },
          ].map(({label, value, color}) => (
            <div key={label} style={{background:'var(--bg-card)', border:`1px solid ${color}30`, borderRadius:12, padding:'10px 12px', textAlign:'center' as const}}>
              <div style={{fontSize:20, fontWeight:700, color, fontFamily:'monospace'}}>{value}</div>
              <div style={{fontSize:9, color:'var(--text-faint)', marginTop:2}}>{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={S.tabs}>
          {(['tasks','notes','goals','usage'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setInput('') }} style={S.tab(tab===t)}>
              {t==='tasks'?'✅ Tasks':t==='notes'?'📝 Notes':t==='goals'?'🎯 Goals':'📊 API Usage'}
            </button>
          ))}
        </div>

        {/* Input bar */}
        {tab !== 'usage' && (
          <div style={{display:'flex', gap:8, marginBottom:12}}>
            <input style={S.input} value={input} onChange={e=>setInput(e.target.value)}
              placeholder={tab==='tasks'?'Nayi task likho...':tab==='notes'?'Note likho...':'Goal likho...'}
              onKeyDown={e => e.key==='Enter' && (tab==='tasks'?addTask():tab==='notes'?addNote():addGoal())} />
            <button onClick={tab==='tasks'?addTask:tab==='notes'?addNote:addGoal} style={S.btn()}>Add</button>
          </div>
        )}

        {/* Tasks */}
        {tab==='tasks' && (
          <div style={S.card}>
            <div style={S.label}>TASKS — {doneTasks}/{totalTasks} DONE</div>
            {tasks.length === 0 && <div style={{fontSize:13, color:'var(--text-faint)', textAlign:'center', padding:'20px 0'}}>Koi task nahi — add karo!</div>}
            {tasks.map(t => (
              <div key={t.id} style={S.row}>
                <button onClick={() => toggleTask(t.id)}
                  style={{width:20, height:20, borderRadius:6, border:`2px solid ${t.done?'#00ff88':'var(--border)'}`, background:t.done?'#00ff8830':'transparent', color:'#00ff88', fontSize:12, cursor:'pointer', flexShrink:0}}>
                  {t.done?'✓':''}
                </button>
                <span style={{flex:1, fontSize:13, color:t.done?'var(--text-faint)':'var(--text)', textDecoration:t.done?'line-through':'none'}}>{t.text}</span>
                <button onClick={() => deleteTask(t.id)} style={{background:'none', border:'none', color:'var(--text-faint)', fontSize:16, cursor:'pointer'}}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
        {tab==='notes' && (
          <div style={{display:'flex', flexDirection:'column' as const, gap:8}}>
            {notes.length === 0 && <div style={{...S.card, textAlign:'center' as const, color:'var(--text-faint)', fontSize:13}}>Koi note nahi — likho!</div>}
            {notes.map(n => (
              <div key={n.id} style={{...S.card, background:n.color, position:'relative' as const}}>
                <button onClick={() => deleteNote(n.id)} style={{position:'absolute', top:8, right:8, background:'none', border:'none', color:'var(--text-faint)', fontSize:18, cursor:'pointer'}}>×</button>
                <div style={{fontSize:13, color:'var(--text)', lineHeight:1.6, paddingRight:20}}>{n.text}</div>
                <div style={{fontSize:9, color:'var(--text-faint)', marginTop:6}}>{new Date(n.created).toLocaleDateString('hi-IN')}</div>
              </div>
            ))}
          </div>
        )}

        {/* Goals */}
        {tab==='goals' && (
          <div style={S.card}>
            <div style={S.label}>GOALS — TRACK PROGRESS</div>
            {goals.length === 0 && <div style={{fontSize:13, color:'var(--text-faint)', textAlign:'center' as const, padding:'20px 0'}}>Koi goal nahi — set karo!</div>}
            {goals.map(g => {
              const pct = Math.round((g.current/g.target)*100)
              return (
                <div key={g.id} style={{padding:'10px 0', borderBottom:'1px solid var(--border2)'}}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:4}}>
                    <span style={{fontSize:13, color:'var(--text)'}}>{g.text}</span>
                    <span style={{fontSize:12, color:'#00ff88', fontWeight:700}}>{pct}%</span>
                  </div>
                  <div style={S.bar(pct, '#00ff88')}>
                    <div style={S.fill(pct, '#00ff88')}/>
                  </div>
                  <div style={{display:'flex', gap:6, marginTop:8}}>
                    <button onClick={() => updateGoal(g.id, -10)} style={S.btn('#f87171')}>-10%</button>
                    <button onClick={() => updateGoal(g.id, 10)}  style={S.btn('#00ff88')}>+10%</button>
                    <button onClick={() => updateGoal(g.id, 25)}  style={S.btn('#00e5ff')}>+25%</button>
                    <span style={{marginLeft:'auto', fontSize:11, color:'var(--text-faint)', alignSelf:'center'}}>{g.current}/{g.target}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* API Usage */}
        {tab==='usage' && stats && (
          <div style={{display:'flex', flexDirection:'column' as const, gap:10}}>
            <div style={S.card}>
              <div style={S.label}>TODAY'S API USAGE — {stats.date}</div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10}}>
                <div style={{textAlign:'center' as const}}>
                  <div style={{fontSize:24, fontWeight:700, color:'#00e5ff', fontFamily:'monospace'}}>{stats.totalToday}</div>
                  <div style={{fontSize:9, color:'var(--text-faint)'}}>TOTAL CALLS TODAY</div>
                </div>
                <div style={{textAlign:'center' as const}}>
                  <div style={{fontSize:24, fontWeight:700, color:'#a78bfa', fontFamily:'monospace'}}>{stats.minuteUsed}/{stats.minuteLimit}</div>
                  <div style={{fontSize:9, color:'var(--text-faint)'}}>THIS MINUTE</div>
                </div>
              </div>
            </div>

            <div style={S.card}>
              <div style={S.label}>PER PROVIDER LIMIT</div>
              {stats.providers.filter(p=>p.limit < 9999).map(p => {
                const color = p.pct > 80 ? '#f87171' : p.pct > 50 ? '#fbbf24' : '#00ff88'
                return (
                  <div key={p.name} style={{marginBottom:10}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:3}}>
                      <span style={{fontSize:12, color:'var(--text)', fontFamily:'monospace'}}>{p.name}</span>
                      <span style={{fontSize:11, color, fontWeight:700}}>{p.used}/{p.limit}</span>
                    </div>
                    <div style={S.bar(p.pct, color)}>
                      <div style={S.fill(p.pct, color)}/>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={S.card}>
              <div style={S.label}>VERCEL FREE TIER SAFE ZONE</div>
              {[
                { label:'Bandwidth', used:'~2MB', limit:'100GB', safe:true },
                { label:'Function calls', used:stats.vercelCallsEstimate+' today', limit:'100K/month', safe: stats.vercelCallsEstimate < 3000 },
                { label:'Build minutes', used:'~2 min', limit:'6000 min/month', safe:true },
                { label:'Cron jobs', used:'2 active', limit:'2 (Hobby)', safe:true },
              ].map(({label, used, limit, safe}) => (
                <div key={label} style={{display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:'1px solid var(--border2)'}}>
                  <span style={{fontSize:14}}>{safe?'✅':'⚠️'}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12, color:'var(--text)'}}>{label}</div>
                    <div style={{fontSize:10, color:'var(--text-faint)'}}>{used} / {limit}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
