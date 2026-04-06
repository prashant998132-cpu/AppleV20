'use client'
// app/journal/page.tsx — JARVIS Daily Journal with AI Mood Analysis
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initTheme } from '../../lib/theme'

interface Entry { id:string; date:string; text:string; mood:string; moodScore:number; aiNote:string; tags:string[]; weather?:string }

const MOODS = [
  { emoji:'😄', label:'Amazing', score:5, color:'#22c55e' },
  { emoji:'🙂', label:'Good', score:4, color:'#86efac' },
  { emoji:'😐', label:'Okay', score:3, color:'#f59e0b' },
  { emoji:'😔', label:'Bad', score:2, color:'#f97316' },
  { emoji:'😢', label:'Terrible', score:1, color:'#ef4444' },
]

const TAGS = ['Study', 'Work', 'Health', 'Family', 'Friends', 'Travel', 'Achievement', 'Stress', 'Grateful', 'Goal']

function analyzeText(text: string): { aiNote: string; tags: string[] } {
  const lower = text.toLowerCase()
  const tags: string[] = []
  if (/study|padh|exam|class|school|college/.test(lower)) tags.push('Study')
  if (/family|ghar|maa|papa|bhai|behen/.test(lower)) tags.push('Family')
  if (/dost|friend|yaar|saath/.test(lower)) tags.push('Friends')
  if (/kaam|work|office|project|deadline/.test(lower)) tags.push('Work')
  if (/health|bimar|exercise|gym|khana/.test(lower)) tags.push('Health')
  if (/khush|happy|amazing|great|wonderful|excited/.test(lower)) tags.push('Achievement')
  if (/tension|stress|pareshan|anxious|worried/.test(lower)) tags.push('Stress')
  if (/thanks|grateful|shukr|blessed/.test(lower)) tags.push('Grateful')

  let aiNote = ''
  if (text.length < 50) aiNote = 'Thoda aur detail mein likhte toh better hota! 📝'
  else if (/stress|tension|pareshan|sad|dukh|bura/.test(lower)) aiNote = 'Mushkil din tha — but tu handle kar raha hai. 💪'
  else if (/khush|happy|great|amazing|acha|badiya/.test(lower)) aiNote = 'Aaj ka din accha tha! Yeh feeling yaad rakhna. ⭐'
  else if (/goal|target|plan|karna|chahta/.test(lower)) aiNote = 'Goals pe focus hai — keep going! 🎯'
  else aiNote = 'Aaj ki entry save ho gayi. Kal bhi likhna! ✨'

  return { aiNote, tags: [...new Set(tags)] }
}

export default function JournalPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<Entry[]>([])
  const [view, setView] = useState<'write'|'history'|'stats'>('write')
  const [text, setText] = useState('')
  const [mood, setMood] = useState(MOODS[1])
  const [selTags, setSelTags] = useState<string[]>([])
  const [search, setSearch] = useState('')

  const todayStr = new Date().toISOString().split('T')[0]
  const todayEntry = entries.find(e => e.date === todayStr)

  useEffect(() => {
    initTheme()
    try { setEntries(JSON.parse(localStorage.getItem('jarvis_journal')||'[]')) } catch {}
  }, [])

  const save = (e: Entry[]) => { setEntries(e); localStorage.setItem('jarvis_journal', JSON.stringify(e)) }

  const submit = () => {
    if (!text.trim()) return
    const { aiNote, tags: autoTags } = analyzeText(text)
    const allTags = [...new Set([...selTags, ...autoTags])]
    const entry: Entry = { id: Date.now().toString(), date: todayStr, text, mood: mood.emoji, moodScore: mood.score, aiNote, tags: allTags }
    const existing = entries.filter(e => e.date !== todayStr)
    save([entry, ...existing])
    setText(''); setSelTags([])
  }

  // Stats
  const avgMood = entries.length ? (entries.reduce((s,e)=>s+e.moodScore,0)/entries.length).toFixed(1) : '0'
  const streak = (() => {
    let s=0,d=new Date()
    const set = new Set(entries.map(e=>e.date))
    while(set.has(d.toISOString().split('T')[0])){s++;d.setDate(d.getDate()-1)}
    return s
  })()
  const moodDist = MOODS.map(m => ({ ...m, count: entries.filter(e=>e.moodScore===m.score).length }))
  const tagCounts: Record<string,number> = {}
  entries.forEach(e => e.tags.forEach(t => { tagCounts[t]=(tagCounts[t]||0)+1 }))

  const visible = entries.filter(e => !search || e.text.toLowerCase().includes(search.toLowerCase()) || e.tags.some(t=>t.toLowerCase().includes(search.toLowerCase())))

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg)',color:'var(--text)',fontFamily:"'Inter',sans-serif"}}>
      <div className="bg-grid"/>
      <div style={{position:'sticky',top:0,zIndex:50,background:'var(--header)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--border)',padding:'10px 16px',display:'flex',alignItems:'center',gap:8}}>
        <button onClick={()=>router.push('/')} style={{background:'var(--accent-bg)',border:'1px solid var(--border-a)',borderRadius:8,color:'var(--accent)',fontSize:14,fontWeight:800,width:28,height:28,fontFamily:'monospace'}}>J</button>
        <div style={{flex:1}}><div style={{fontSize:15,fontWeight:700}}>📓 Daily Journal</div><div style={{fontSize:10,color:'var(--text-3)'}}>{streak} day streak 🔥</div></div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',borderBottom:'1px solid var(--border)'}}>
        {(['write','history','stats'] as const).map(t=>(
          <button key={t} onClick={()=>setView(t)} style={{flex:1,padding:'9px',background:view===t?'var(--accent-bg)':'transparent',border:'none',borderBottom:`2px solid ${view===t?'var(--accent)':'transparent'}`,color:view===t?'var(--accent)':'var(--text-3)',fontSize:11,fontWeight:600,cursor:'pointer',textTransform:'capitalize'}}>
            {t==='write'?'✍️':t==='history'?'📚':'📊'} {t}
          </button>
        ))}
      </div>

      {/* WRITE */}
      {view==='write'&&(
        <div style={{padding:'14px 14px 80px'}}>
          {todayEntry&&(
            <div style={{background:'rgba(34,197,94,.08)',border:'1px solid rgba(34,197,94,.2)',borderRadius:12,padding:'10px 14px',marginBottom:12,fontSize:12,color:'#86efac'}}>
              ✅ Aaj ki entry already hai! Neeche dekh sakte ho.
            </div>
          )}
          <div style={{fontSize:12,color:'var(--text-3)',marginBottom:6}}>{new Date().toLocaleDateString('hi-IN',{weekday:'long',day:'numeric',month:'long'})}</div>
          
          {/* Mood */}
          <div style={{display:'flex',gap:8,marginBottom:12,justifyContent:'center'}}>
            {MOODS.map(m=>(
              <button key={m.label} onClick={()=>setMood(m)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'8px 10px',borderRadius:12,background:mood.label===m.label?`${m.color}22`:'transparent',border:`1px solid ${mood.label===m.label?m.color:'var(--border)'}`,cursor:'pointer',transition:'all .15s'}}>
                <span style={{fontSize:24}}>{m.emoji}</span>
                <span style={{fontSize:9,color:mood.label===m.label?m.color:'var(--text-3)',fontWeight:mood.label===m.label?700:400}}>{m.label}</span>
              </button>
            ))}
          </div>

          <textarea value={text} onChange={e=>setText(e.target.value)} placeholder={`Aaj kya hua, ${new Date().getHours()<12?'subah':'din'} kaisi rahi?...`} rows={8}
            style={{width:'100%',background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:12,padding:'12px',color:'var(--text)',fontSize:13,resize:'none',outline:'none',fontFamily:'inherit',lineHeight:1.7,marginBottom:10}}/>

          {/* Tags */}
          <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:12}}>
            {TAGS.map(t=>(
              <button key={t} onClick={()=>setSelTags(p=>p.includes(t)?p.filter(x=>x!==t):[...p,t])} style={{padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:600,background:selTags.includes(t)?'var(--accent-bg)':'transparent',border:`1px solid ${selTags.includes(t)?'var(--border-a)':'var(--border)'}`,color:selTags.includes(t)?'var(--accent)':'var(--text-3)',cursor:'pointer'}}>{t}</button>
            ))}
          </div>

          <button onClick={submit} disabled={!text.trim()} style={{width:'100%',padding:'13px',background:text.trim()?'var(--accent)':'rgba(255,255,255,.04)',color:text.trim()?'#000':'var(--text-3)',border:'none',borderRadius:12,fontWeight:700,fontSize:14,cursor:text.trim()?'pointer':'not-allowed'}}>
            💾 Save Entry
          </button>
        </div>
      )}

      {/* HISTORY */}
      {view==='history'&&(
        <div style={{padding:'10px 14px 80px'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search entries..." style={{width:'100%',marginBottom:12,background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:10,padding:'9px 12px',color:'var(--text)',fontSize:12}}/>
          {visible.length===0&&<div style={{textAlign:'center',padding:'40px 0',color:'var(--text-3)'}}>{search?'Koi entry nahi mili.':'Ab tak koi entry nahi. Likhna shuru karo!'}</div>}
          {visible.map(e=>(
            <div key={e.id} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:'14px',marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:22}}>{e.mood}</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:600}}>{new Date(e.date).toLocaleDateString('hi-IN',{weekday:'short',day:'numeric',month:'short'})}</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:4,flexWrap:'wrap',justifyContent:'flex-end'}}>
                  {e.tags.slice(0,3).map(t=><span key={t} style={{fontSize:9,padding:'1px 6px',borderRadius:4,background:'var(--accent-bg)',color:'var(--accent)'}}>{t}</span>)}
                </div>
              </div>
              <div style={{fontSize:12,color:'var(--text-2)',lineHeight:1.6,marginBottom:6,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical'}}>{e.text}</div>
              <div style={{fontSize:11,color:'var(--text-3)',fontStyle:'italic'}}>🤖 {e.aiNote}</div>
            </div>
          ))}
        </div>
      )}

      {/* STATS */}
      {view==='stats'&&(
        <div style={{padding:'14px 14px 80px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
            {[
              {icon:'📝',label:'Total Entries',val:String(entries.length)},
              {icon:'🔥',label:'Day Streak',val:`${streak} days`},
              {icon:'😊',label:'Avg Mood',val:`${avgMood}/5`},
              {icon:'📅',label:'This Month',val:String(entries.filter(e=>e.date.startsWith(new Date().toISOString().slice(0,7))).length)},
            ].map(s=>(
              <div key={s.label} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,padding:'12px',textAlign:'center'}}>
                <div style={{fontSize:24,marginBottom:4}}>{s.icon}</div>
                <div style={{fontSize:20,fontWeight:800,color:'var(--accent)',fontFamily:"'JetBrains Mono',monospace"}}>{s.val}</div>
                <div style={{fontSize:10,color:'var(--text-3)'}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Mood distribution */}
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:'14px',marginBottom:12}}>
            <div style={{fontSize:11,color:'var(--text-3)',fontWeight:600,marginBottom:12}}>MOOD DISTRIBUTION</div>
            {moodDist.map(m=>(
              <div key={m.label} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <span style={{fontSize:18,width:28}}>{m.emoji}</span>
                <div style={{flex:1,height:8,background:'var(--border)',borderRadius:4,overflow:'hidden'}}>
                  <div style={{height:'100%',background:m.color,width:`${entries.length?m.count/entries.length*100:0}%`,borderRadius:4,transition:'width .5s'}}/>
                </div>
                <span style={{fontSize:11,color:m.color,width:16,textAlign:'right'}}>{m.count}</span>
              </div>
            ))}
          </div>

          {/* Top tags */}
          {Object.keys(tagCounts).length>0&&(
            <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:'14px'}}>
              <div style={{fontSize:11,color:'var(--text-3)',fontWeight:600,marginBottom:10}}>TOP TOPICS</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {Object.entries(tagCounts).sort(([,a],[,b])=>b-a).map(([tag,count])=>(
                  <div key={tag} style={{padding:'4px 10px',background:'var(--accent-bg)',border:'1px solid var(--border-a)',borderRadius:20,fontSize:11,color:'var(--accent)'}}>
                    {tag} <span style={{opacity:.6}}>×{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
