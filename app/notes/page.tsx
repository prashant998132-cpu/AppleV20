'use client'
// app/notes/page.tsx — JARVIS Quick Notes
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initTheme } from '../../lib/theme'

interface Note { id:string; title:string; body:string; pinned:boolean; color:string; updatedAt:number; tags:string[] }

const COLORS = ['#1a2a3a','#1a2a1a','#2a1a1a','#1a1a2a','#2a221a','#1a2a2a']
const COLOR_LABELS = ['Default','Green','Red','Purple','Orange','Teal']

export default function NotesPage() {
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [active, setActive] = useState<Note|null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    initTheme()
    try { setNotes(JSON.parse(localStorage.getItem('jarvis_notes')||'[]')) } catch {}
  }, [])

  const save = (n: Note[]) => { setNotes(n); localStorage.setItem('jarvis_notes', JSON.stringify(n)) }

  const newNote = () => {
    const n: Note = { id:Date.now().toString(), title:'Untitled', body:'', pinned:false, color:COLORS[0], updatedAt:Date.now(), tags:[] }
    save([n, ...notes]); setActive(n)
  }

  const update = (id:string, changes: Partial<Note>) => {
    const updated = notes.map(n => n.id===id ? {...n,...changes,updatedAt:Date.now()} : n)
    save(updated)
    if (active?.id===id) setActive(a => a ? {...a,...changes} : null)
  }

  const del = (id:string) => { save(notes.filter(n=>n.id!==id)); if(active?.id===id)setActive(null) }

  const visible = notes
    .filter(n => !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.body.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => (b.pinned?1:0)-(a.pinned?1:0) || b.updatedAt-a.updatedAt)

  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)', color:'var(--text)', fontFamily:"'Inter',sans-serif" }}>
      <div className="bg-grid"/>

      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'var(--header)', backdropFilter:'blur(12px)', borderBottom:'1px solid var(--border)', padding:'10px 16px', display:'flex', alignItems:'center', gap:8 }}>
        <button onClick={()=>router.push('/')} style={{ background:'var(--accent-bg)', border:'1px solid var(--border-a)', borderRadius:8, color:'var(--accent)', fontSize:14, fontWeight:800, width:28, height:28, fontFamily:'monospace' }}>J</button>
        <div style={{ flex:1, fontSize:15, fontWeight:700 }}>📝 Notes</div>
        <button onClick={newNote} style={{ background:'var(--accent)', color:'#000', border:'none', borderRadius:8, padding:'6px 14px', fontSize:12, fontWeight:700, cursor:'pointer' }}>+ New</button>
      </div>

      {active ? (
        /* Note editor */
        <div style={{ display:'flex', flexDirection:'column', height:'calc(100dvh - 49px)' }}>
          <div style={{ padding:'8px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8, background:active.color }}>
            <button onClick={()=>setActive(null)} style={{ background:'none', border:'none', color:'var(--text-2)', fontSize:14, cursor:'pointer' }}>← Back</button>
            <input value={active.title} onChange={e=>update(active.id,{title:e.target.value})}
              style={{ flex:1, background:'transparent', border:'none', color:'var(--text)', fontSize:15, fontWeight:700, outline:'none', fontFamily:'inherit' }}/>
            <button onClick={()=>update(active.id,{pinned:!active.pinned})} style={{ background:'none', border:'none', fontSize:16, cursor:'pointer', color:active.pinned?'#f59e0b':'var(--text-3)' }}>📌</button>
            <button onClick={()=>del(active.id)} style={{ background:'none', border:'none', color:'#ef4444', fontSize:14, cursor:'pointer' }}>🗑</button>
          </div>
          {/* Color picker */}
          <div style={{ padding:'6px 14px', display:'flex', gap:6, borderBottom:'1px solid var(--border)', background:active.color }}>
            {COLORS.map((c,i) => (
              <button key={c} onClick={()=>update(active.id,{color:c})} style={{ width:20, height:20, borderRadius:'50%', background:c, border:`2px solid ${active.color===c?'var(--accent)':'transparent'}`, cursor:'pointer' }} title={COLOR_LABELS[i]}/>
            ))}
            <span style={{ fontSize:10, color:'var(--text-3)', marginLeft:6, alignSelf:'center' }}>Color</span>
          </div>
          <textarea value={active.body} onChange={e=>update(active.id,{body:e.target.value})}
            placeholder="Yahan likhao... Markdown support hai."
            style={{ flex:1, background:active.color, border:'none', color:'var(--text)', fontSize:14, padding:'14px', resize:'none', outline:'none', fontFamily:"'JetBrains Mono',monospace", lineHeight:1.7 }}/>
          <div style={{ padding:'6px 14px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:10, color:'var(--text-3)' }}>{active.body.length} chars · {active.body.split('\n').length} lines</span>
            <span style={{ fontSize:10, color:'var(--text-3)' }}>Updated {new Date(active.updatedAt).toLocaleTimeString('hi-IN',{hour:'2-digit',minute:'2-digit'})}</span>
          </div>
        </div>
      ) : (
        /* Notes list */
        <div style={{ padding:'12px 14px 80px' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Notes search karo..."
            style={{ width:'100%', marginBottom:12, background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px', color:'var(--text)', fontSize:13 }}/>

          {visible.length===0 && (
            <div style={{ textAlign:'center', padding:'50px 0', color:'var(--text-3)' }}>
              <div style={{ fontSize:40, marginBottom:10 }}>📝</div>
              <div style={{ fontSize:13 }}>{search?'Koi note nahi mila':'Koi note nahi. + New se banao!'}</div>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {visible.map(n => (
              <div key={n.id} onClick={()=>setActive(n)} style={{ background:n.color||'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'12px', cursor:'pointer', position:'relative', minHeight:100 }}>
                {n.pinned && <span style={{ position:'absolute', top:8, right:8, fontSize:12 }}>📌</span>}
                <div style={{ fontSize:13, fontWeight:600, marginBottom:5, paddingRight:n.pinned?20:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.title||'Untitled'}</div>
                <div style={{ fontSize:11, color:'var(--text-3)', lineHeight:1.5, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical' }}>
                  {n.body||<span style={{ fontStyle:'italic' }}>Empty note</span>}
                </div>
                <div style={{ fontSize:9, color:'var(--text-4)', marginTop:8 }}>{new Date(n.updatedAt).toLocaleDateString('hi-IN',{day:'numeric',month:'short'})}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
