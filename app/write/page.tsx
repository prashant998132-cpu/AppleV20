'use client'
// app/write/page.tsx — JARVIS AI Writing Assistant
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const ACTIONS = [
  { id:'grammar', label:'Fix Grammar', icon:'✅', prompt:'Fix all grammar and spelling errors in this text. Return only the corrected text:' },
  { id:'rephrase', label:'Rephrase', icon:'🔄', prompt:'Rephrase this text to make it clearer and more professional. Return only the rephrased text:' },
  { id:'expand', label:'Expand', icon:'📝', prompt:'Expand this text with more detail and examples. Keep the same tone:' },
  { id:'shorten', label:'Shorten', icon:'✂️', prompt:'Make this text shorter while keeping the key points:' },
  { id:'formal', label:'Make Formal', icon:'👔', prompt:'Rewrite this text in a formal, professional tone:' },
  { id:'casual', label:'Make Casual', icon:'😊', prompt:'Rewrite this text in a casual, friendly tone (Hinglish is fine):' },
  { id:'hinglish', label:'To Hinglish', icon:'🇮🇳', prompt:'Convert this to Hinglish (Hindi+English mix). Sound natural and conversational:' },
  { id:'email', label:'Email Format', icon:'📧', prompt:'Format this as a professional email with subject, greeting, body, and signature:' },
  { id:'bullet', label:'Bullet Points', icon:'📋', prompt:'Convert this into a clear bullet-point list:' },
  { id:'story', label:'Make Creative', icon:'✨', prompt:'Rewrite this creatively and engagingly, like a story or article:' },
]

export default function WritePage() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeAction, setActiveAction] = useState('')
  const [wordCount, setWordCount] = useState(0)
  const [history, setHistory] = useState<{action:string;input:string;output:string}[]>([])
  const abortRef = useRef<AbortController|null>(null)

  const handleInput = (v:string) => {
    setInput(v)
    setWordCount(v.trim() ? v.trim().split(/\s+/).length : 0)
  }

  const process = async (action: typeof ACTIONS[0]) => {
    if (!input.trim()) return
    setLoading(true); setActiveAction(action.id); setOutput('')
    abortRef.current?.abort()
    const ab = new AbortController(); abortRef.current = ab

    try {
      const res = await fetch('/api/jarvis/stream', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          message: `${action.prompt}\n\n"${input}"`,
          chatMode:'flash', history:[], memoryContext:''
        }), signal: ab.signal
      })

      if (res.ok && res.body) {
        const reader = res.body.getReader(); const dec = new TextDecoder()
        let full = ''
        while (true) {
          const {done,value} = await reader.read(); if(done) break
          for (const line of dec.decode(value).split('\n')) {
            if (!line.startsWith('data: ') || line==='data: [DONE]') continue
            try { const d=JSON.parse(line.slice(6)); if(d.type==='token'&&d.token){full+=d.token;setOutput(full)} } catch {}
          }
        }
        if (full) setHistory(h => [{action:action.label, input:input.slice(0,100), output:full}, ...h.slice(0,9)])
      }
    } catch {}
    setLoading(false); setActiveAction('')
  }

  const copy = () => navigator.clipboard.writeText(output).catch(()=>{})
  const useOutput = () => { setInput(output); setOutput('') }

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg)',color:'var(--text)',fontFamily:"'Inter',sans-serif",display:'flex',flexDirection:'column'}}>
      <div className="bg-grid"/>
      <div style={{position:'sticky',top:0,zIndex:50,background:'var(--header)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--border)',padding:'10px 16px',display:'flex',alignItems:'center',gap:8}}>
        <button onClick={()=>router.push('/')} style={{background:'var(--accent-bg)',border:'1px solid var(--border-a)',borderRadius:8,color:'var(--accent)',fontSize:14,fontWeight:800,width:28,height:28,fontFamily:'monospace'}}>J</button>
        <div style={{flex:1}}><div style={{fontSize:15,fontWeight:700}}>✍️ AI Writing Assistant</div><div style={{fontSize:10,color:'var(--text-3)'}}>Grammar · Rephrase · Tone · Format</div></div>
      </div>

      <div style={{flex:1,padding:'12px 14px 80px'}}>
        {/* Input */}
        <div style={{position:'relative',marginBottom:8}}>
          <textarea value={input} onChange={e=>handleInput(e.target.value)} placeholder="Yahan text likho ya paste karo..." rows={6}
            style={{width:'100%',background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:12,padding:'12px',paddingBottom:'30px',color:'var(--text)',fontSize:13,resize:'none',outline:'none',fontFamily:'inherit',lineHeight:1.7}}/>
          <div style={{position:'absolute',bottom:8,left:12,fontSize:10,color:'var(--text-4)'}}>{wordCount} words · {input.length} chars</div>
          {input&&<button onClick={()=>{setInput('');setOutput('');setWordCount(0)}} style={{position:'absolute',bottom:6,right:10,background:'none',border:'none',color:'var(--text-4)',fontSize:12,cursor:'pointer'}}>✕ Clear</button>}
        </div>

        {/* Actions */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6,marginBottom:12}}>
          {ACTIONS.map(a=>(
            <button key={a.id} onClick={()=>process(a)} disabled={loading||!input.trim()} style={{padding:'10px 8px',borderRadius:10,background:activeAction===a.id?'var(--accent-bg)':loading&&activeAction!==a.id?'rgba(255,255,255,.02)':'rgba(255,255,255,.04)',border:`1px solid ${activeAction===a.id?'var(--border-a)':'var(--border)'}`,color:loading&&activeAction!==a.id?'var(--text-4)':activeAction===a.id?'var(--accent)':'var(--text)',cursor:loading||!input.trim()?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:8,textAlign:'left',fontSize:12,fontWeight:500,transition:'all .15s'}}>
              <span style={{fontSize:16}}>{loading&&activeAction===a.id?'⏳':a.icon}</span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>

        {/* Output */}
        {output&&(
          <div style={{background:'rgba(0,229,255,.04)',border:'1px solid rgba(0,229,255,.15)',borderRadius:12,padding:'12px',marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span style={{fontSize:11,color:'var(--accent)',fontWeight:600}}>✨ Result</span>
              <div style={{display:'flex',gap:6}}>
                <button onClick={copy} style={{padding:'4px 10px',background:'var(--accent-bg)',border:'1px solid var(--border-a)',borderRadius:7,color:'var(--accent)',fontSize:11,cursor:'pointer'}}>⎘ Copy</button>
                <button onClick={useOutput} style={{padding:'4px 10px',background:'rgba(255,255,255,.06)',border:'1px solid var(--border)',borderRadius:7,color:'var(--text-2)',fontSize:11,cursor:'pointer'}}>← Use as Input</button>
              </div>
            </div>
            <div style={{fontSize:13,color:'var(--text)',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{output}{loading&&<span style={{display:'inline-block',width:2,height:14,background:'var(--accent)',animation:'blink 1s step-end infinite',verticalAlign:'middle',marginLeft:2}}/>}</div>
          </div>
        )}

        {/* Word tools */}
        {input&&(
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
            <button onClick={()=>setInput(input.toUpperCase())} style={{padding:'4px 10px',background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text-3)',fontSize:11,cursor:'pointer'}}>UPPERCASE</button>
            <button onClick={()=>setInput(input.toLowerCase())} style={{padding:'4px 10px',background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text-3)',fontSize:11,cursor:'pointer'}}>lowercase</button>
            <button onClick={()=>setInput(input.split(' ').map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' '))} style={{padding:'4px 10px',background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text-3)',fontSize:11,cursor:'pointer'}}>Title Case</button>
            <button onClick={()=>navigator.clipboard.writeText(input)} style={{padding:'4px 10px',background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text-3)',fontSize:11,cursor:'pointer'}}>⎘ Copy All</button>
          </div>
        )}

        {/* History */}
        {history.length>0&&(
          <div>
            <div style={{fontSize:11,color:'var(--text-3)',fontWeight:600,marginBottom:8}}>Recent</div>
            {history.slice(0,3).map((h,i)=>(
              <div key={i} onClick={()=>{setInput(h.input);setOutput(h.output)}} style={{padding:'8px 12px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,marginBottom:6,cursor:'pointer'}}>
                <span style={{fontSize:10,color:'var(--accent)',fontWeight:600}}>{h.action}</span>
                <div style={{fontSize:11,color:'var(--text-3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginTop:2}}>{h.input.slice(0,60)}...</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
