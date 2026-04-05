'use client'
// app/todo/page.tsx — JARVIS Todo Manager
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initTheme } from '../../lib/theme'

interface Todo {
  id: string; text: string; done: boolean
  priority: 'high'|'medium'|'low'; category: string
  createdAt: number; dueDate?: string
}

const CATS = ['All','Study','Personal','Work','Shopping','Health']
const PCOLORS = { high:'#ef4444', medium:'#f59e0b', low:'#22c55e' }

export default function TodoPage() {
  const router = useRouter()
  const [todos, setTodos] = useState<Todo[]>([])
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState('All')
  const [priority, setPriority] = useState<Todo['priority']>('medium')
  const [category, setCategory] = useState('Personal')
  const [dueDate, setDueDate] = useState('')
  const [showDone, setShowDone] = useState(false)

  useEffect(() => {
    initTheme()
    try { setTodos(JSON.parse(localStorage.getItem('jarvis_todos')||'[]')) } catch {}
  }, [])

  const save = (t: Todo[]) => { setTodos(t); localStorage.setItem('jarvis_todos', JSON.stringify(t)) }

  const add = () => {
    if (!input.trim()) return
    const t: Todo = { id: Date.now().toString(), text:input.trim(), done:false, priority, category, createdAt:Date.now(), dueDate:dueDate||undefined }
    save([t, ...todos]); setInput(''); setDueDate('')
  }

  const toggle = (id: string) => save(todos.map(t => t.id===id ? {...t, done:!t.done} : t))
  const del = (id: string) => save(todos.filter(t => t.id!==id))
  const clearDone = () => save(todos.filter(t => !t.done))

  const visible = todos
    .filter(t => (filter==='All' || t.category===filter) && (!t.done || showDone))
    .sort((a,b) => {
      const po = {high:0,medium:1,low:2}
      return po[a.priority]-po[b.priority] || a.createdAt-b.createdAt
    })

  const doneCount = todos.filter(t=>t.done).length
  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)', color:'var(--text)', fontFamily:"'Inter',sans-serif" }}>
      <div className="bg-grid"/>
      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'var(--header)', backdropFilter:'blur(12px)', borderBottom:'1px solid var(--border)', padding:'10px 16px', display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={()=>router.push('/')} style={{ background:'var(--accent-bg)', border:'1px solid var(--border-a)', borderRadius:8, color:'var(--accent)', fontSize:14, fontWeight:800, width:28, height:28, fontFamily:'monospace' }}>J</button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15, fontWeight:700 }}>✅ Todo Manager</div>
          <div style={{ fontSize:10, color:'var(--text-3)' }}>{todos.filter(t=>!t.done).length} pending · {doneCount} done</div>
        </div>
        {doneCount>0 && <button onClick={clearDone} style={{ fontSize:11, color:'#ef4444', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)', borderRadius:8, padding:'4px 10px', cursor:'pointer' }}>🗑 Clear done</button>}
      </div>

      {/* Add todo */}
      <div style={{ padding:'12px 14px', background:'var(--bg-card)', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', gap:8, marginBottom:8 }}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()}
            placeholder="Nayi task likhao..." style={{ flex:1, background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px', color:'var(--text)', fontSize:13 }}/>
          <button onClick={add} style={{ background:'var(--accent)', color:'#000', border:'none', borderRadius:10, padding:'10px 16px', fontWeight:700, fontSize:13, cursor:'pointer' }}>+ Add</button>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {(['high','medium','low'] as const).map(p => (
            <button key={p} onClick={()=>setPriority(p)} style={{ padding:'4px 10px', borderRadius:20, fontSize:10, fontWeight:600, background:priority===p?PCOLORS[p]+'22':'transparent', border:`1px solid ${priority===p?PCOLORS[p]:PCOLORS[p]+'44'}`, color:PCOLORS[p], cursor:'pointer' }}>
              {p==='high'?'🔴':p==='medium'?'🟡':'🟢'} {p.charAt(0).toUpperCase()+p.slice(1)}
            </button>
          ))}
          <select value={category} onChange={e=>setCategory(e.target.value)} style={{ fontSize:10, background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 8px', color:'var(--text)', cursor:'pointer' }}>
            {CATS.filter(c=>c!=='All').map(c=><option key={c}>{c}</option>)}
          </select>
          <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} min={todayStr}
            style={{ fontSize:10, background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 8px', color:'var(--text)', cursor:'pointer' }}/>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:6, padding:'10px 14px', overflowX:'auto', borderBottom:'1px solid var(--border)' }} className="no-scroll">
        {CATS.map(c => (
          <button key={c} onClick={()=>setFilter(c)} style={{ padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:600, border:'1px solid', borderColor:filter===c?'var(--accent)':'var(--border)', background:filter===c?'var(--accent-bg)':'transparent', color:filter===c?'var(--accent)':'var(--text-3)', cursor:'pointer', whiteSpace:'nowrap' }}>{c}</button>
        ))}
        <button onClick={()=>setShowDone(p=>!p)} style={{ padding:'5px 12px', borderRadius:20, fontSize:11, border:'1px solid var(--border)', background:showDone?'rgba(34,197,94,.1)':'transparent', color:showDone?'#22c55e':'var(--text-3)', cursor:'pointer', whiteSpace:'nowrap' }}>
          {showDone?'✓ Showing done':'Show done'}
        </button>
      </div>

      {/* Todo list */}
      <div style={{ padding:'10px 14px 80px' }}>
        {visible.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-3)' }}>
            <div style={{ fontSize:40, marginBottom:10 }}>✅</div>
            <div style={{ fontSize:13 }}>Koi task nahi! Sab ho gaya ya add karo.</div>
          </div>
        )}
        {visible.map(t => (
          <div key={t.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px', background:t.done?'rgba(255,255,255,.02)':'var(--bg-card)', border:`1px solid ${t.done?'var(--border)':PCOLORS[t.priority]+'33'}`, borderRadius:12, marginBottom:8, opacity:t.done?.6:1, transition:'opacity .2s', borderLeft:`3px solid ${PCOLORS[t.priority]}` }}>
            <button onClick={()=>toggle(t.id)} style={{ width:20, height:20, borderRadius:6, border:`2px solid ${t.done?'#22c55e':PCOLORS[t.priority]}`, background:t.done?'#22c55e':'transparent', cursor:'pointer', flexShrink:0, marginTop:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11 }}>
              {t.done?'✓':''}
            </button>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, color:t.done?'var(--text-3)':'var(--text)', textDecoration:t.done?'line-through':'none', lineHeight:1.4 }}>{t.text}</div>
              <div style={{ display:'flex', gap:6, marginTop:4, flexWrap:'wrap' }}>
                <span style={{ fontSize:9, color:'var(--text-3)', background:'rgba(255,255,255,.05)', padding:'1px 6px', borderRadius:4 }}>{t.category}</span>
                {t.dueDate && <span style={{ fontSize:9, color:t.dueDate<todayStr&&!t.done?'#ef4444':'var(--text-3)', padding:'1px 6px', borderRadius:4, background:'rgba(255,255,255,.05)' }}>📅 {t.dueDate}</span>}
              </div>
            </div>
            <button onClick={()=>del(t.id)} style={{ background:'none', border:'none', color:'var(--text-4)', fontSize:14, cursor:'pointer', padding:'2px' }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}
