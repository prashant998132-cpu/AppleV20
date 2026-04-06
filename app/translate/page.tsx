'use client'
// app/translate/page.tsx — JARVIS Translator
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initTheme } from '../../lib/theme'

const LANGS = [
  {code:'hi',label:'Hindi',native:'हिन्दी'},
  {code:'en',label:'English',native:'English'},
  {code:'mr',label:'Marathi',native:'मराठी'},
  {code:'ta',label:'Tamil',native:'தமிழ்'},
  {code:'te',label:'Telugu',native:'తెలుగు'},
  {code:'bn',label:'Bengali',native:'বাংলা'},
  {code:'gu',label:'Gujarati',native:'ગુજરાતી'},
  {code:'pa',label:'Punjabi',native:'ਪੰਜਾਬੀ'},
  {code:'ur',label:'Urdu',native:'اردو'},
  {code:'fr',label:'French',native:'Français'},
  {code:'de',label:'German',native:'Deutsch'},
  {code:'ja',label:'Japanese',native:'日本語'},
  {code:'ar',label:'Arabic',native:'العربية'},
  {code:'zh',label:'Chinese',native:'中文'},
  {code:'es',label:'Spanish',native:'Español'},
  {code:'ru',label:'Russian',native:'Русский'},
]

export default function TranslatePage() {
  const router = useRouter()
  const [from, setFrom] = useState('en')
  const [to, setTo] = useState('hi')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<{from:string;to:string;in:string;out:string}[]>([])

  useEffect(()=>{ initTheme(); try{setHistory(JSON.parse(localStorage.getItem('jarvis_trans_hist')||'[]'))}catch{} },[])

  const translate = async () => {
    if(!input.trim()) return
    setLoading(true); setOutput('')
    try {
      const r = await fetch(\`https://api.mymemory.translated.net/get?q=\${encodeURIComponent(input.slice(0,500))}&langpair=\${from}|\${to}\`)
      const d = await r.json()
      const result = d.responseData?.translatedText || 'Translation failed'
      setOutput(result)
      const h = [{from,to,in:input.slice(0,50),out:result.slice(0,50)},...history.slice(0,14)]
      setHistory(h); localStorage.setItem('jarvis_trans_hist',JSON.stringify(h))
    } catch { setOutput('Translation API nahi mili. Internet check karo.') }
    setLoading(false)
  }

  const swap = () => { const t=from; setFrom(to); setTo(t); setInput(output); setOutput('') }
  const fromLang = LANGS.find(l=>l.code===from)
  const toLang = LANGS.find(l=>l.code===to)

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg)',color:'var(--text)',fontFamily:"'Inter',sans-serif"}}>
      <div className="bg-grid"/>
      <div style={{position:'sticky',top:0,zIndex:50,background:'var(--header)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--border)',padding:'10px 16px',display:'flex',alignItems:'center',gap:8}}>
        <button onClick={()=>router.push('/')} style={{background:'var(--accent-bg)',border:'1px solid var(--border-a)',borderRadius:8,color:'var(--accent)',fontSize:14,fontWeight:800,width:28,height:28,fontFamily:'monospace'}}>J</button>
        <div style={{flex:1,fontSize:15,fontWeight:700}}>🌐 Translator</div>
      </div>

      <div style={{padding:'14px 14px 80px'}}>
        {/* Lang selectors */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
          <select value={from} onChange={e=>setFrom(e.target.value)} style={{flex:1,background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:10,padding:'10px',color:'var(--text)',fontSize:13}}>
            {LANGS.map(l=><option key={l.code} value={l.code}>{l.label} {l.native}</option>)}
          </select>
          <button onClick={swap} style={{padding:'10px',background:'var(--accent-bg)',border:'1px solid var(--border-a)',borderRadius:10,color:'var(--accent)',fontSize:18,cursor:'pointer',flexShrink:0}}>⇄</button>
          <select value={to} onChange={e=>setTo(e.target.value)} style={{flex:1,background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:10,padding:'10px',color:'var(--text)',fontSize:13}}>
            {LANGS.map(l=><option key={l.code} value={l.code}>{l.label} {l.native}</option>)}
          </select>
        </div>

        <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder={\`\${fromLang?.label} mein type karo...\`} rows={5}
          style={{width:'100%',background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:12,padding:'12px',color:'var(--text)',fontSize:14,resize:'none',outline:'none',fontFamily:'inherit',lineHeight:1.7,marginBottom:10}}/>

        <button onClick={translate} disabled={loading||!input.trim()} style={{width:'100%',padding:'13px',background:input.trim()?'var(--accent)':' rgba(255,255,255,.04)',color:input.trim()?'#000':'var(--text-3)',border:'none',borderRadius:12,fontWeight:700,fontSize:14,cursor:input.trim()?'pointer':'not-allowed',marginBottom:12}}>
          {loading?'Translating...':\`Translate to \${toLang?.label} →\`}
        </button>

        {output&&(
          <div style={{background:'rgba(0,229,255,.05)',border:'1px solid rgba(0,229,255,.15)',borderRadius:12,padding:'14px',marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
              <span style={{fontSize:11,color:'var(--accent)',fontWeight:600}}>{toLang?.native}</span>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>navigator.clipboard.writeText(output)} style={{padding:'3px 10px',background:'var(--accent-bg)',border:'1px solid var(--border-a)',borderRadius:7,color:'var(--accent)',fontSize:11,cursor:'pointer'}}>⎘ Copy</button>
                {'speechSynthesis' in window&&<button onClick={()=>{const u=new SpeechSynthesisUtterance(output);u.lang=to;speechSynthesis.speak(u)}} style={{padding:'3px 8px',background:'rgba(255,255,255,.06)',border:'1px solid var(--border)',borderRadius:7,color:'var(--text-3)',fontSize:11,cursor:'pointer'}}>🔊</button>}
              </div>
            </div>
            <div style={{fontSize:16,color:'var(--text)',lineHeight:1.7}}>{output}</div>
          </div>
        )}

        {/* Quick phrases */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,color:'var(--text-3)',marginBottom:6,fontWeight:600}}>Quick Phrases</div>
          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
            {['Hello','Thank you','How are you?','Where is?','How much?','Help me'].map(p=>(
              <button key={p} onClick={()=>setInput(p)} style={{padding:'4px 10px',borderRadius:20,fontSize:11,background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',color:'var(--text-3)',cursor:'pointer'}}>{p}</button>
            ))}
          </div>
        </div>

        {history.length>0&&(
          <div>
            <div style={{fontSize:11,color:'var(--text-3)',fontWeight:600,marginBottom:8}}>Recent</div>
            {history.slice(0,5).map((h,i)=>(
              <div key={i} onClick={()=>{setInput(h.in);setOutput(h.out);setFrom(h.from);setTo(h.to)}} style={{padding:'8px 12px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,marginBottom:6,cursor:'pointer',fontSize:11}}>
                <span style={{color:'var(--text-3)'}}>{h.in.slice(0,30)}</span><span style={{color:'var(--accent)',margin:'0 6px'}}>→</span><span style={{color:'var(--text-2)'}}>{h.out.slice(0,30)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
