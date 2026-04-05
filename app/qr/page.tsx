'use client'
// app/qr/page.tsx — JARVIS QR Generator + Scanner
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initTheme } from '../../lib/theme'

const PRESETS = [
  { label:'URL', icon:'🔗', placeholder:'https://example.com' },
  { label:'WhatsApp', icon:'💚', placeholder:'91XXXXXXXXXX', prefix:'https://wa.me/' },
  { label:'UPI', icon:'💸', placeholder:'upi-id@bank', prefix:'upi://pay?pa=' },
  { label:'Phone', icon:'📞', placeholder:'+91XXXXXXXXXX', prefix:'tel:' },
  { label:'Email', icon:'📧', placeholder:'name@email.com', prefix:'mailto:' },
  { label:'WiFi', icon:'📶', placeholder:'NetworkName|Password', special:'wifi' },
  { label:'Text', icon:'📝', placeholder:'Any text...' },
]

export default function QRPage() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [preset, setPreset] = useState(PRESETS[0])
  const [qrUrl, setQrUrl] = useState('')
  const [size, setSize] = useState(250)
  const [color, setColor] = useState('000000')
  const [bg, setBg] = useState('ffffff')
  const [history, setHistory] = useState<{text:string;url:string;time:string}[]>([])

  useEffect(()=>{
    initTheme()
    try { setHistory(JSON.parse(localStorage.getItem('jarvis_qr_history')||'[]')) } catch {}
  },[])

  const generate = () => {
    if(!input.trim()) return
    let text = input.trim()
    if(preset.special==='wifi') {
      const [ssid,pass] = text.split('|')
      text = `WIFI:S:${ssid};T:WPA;P:${pass};;`
    } else if(preset.prefix) {
      text = preset.prefix + text
    }
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&color=${color}&bgcolor=${bg}&format=png&margin=10`
    setQrUrl(url)
    const h = [{text:text.slice(0,40), url, time:new Date().toLocaleTimeString('hi-IN',{hour:'2-digit',minute:'2-digit'})},...history.slice(0,9)]
    setHistory(h); localStorage.setItem('jarvis_qr_history',JSON.stringify(h))
  }

  const download = () => {
    const a = document.createElement('a')
    a.href = qrUrl; a.download = 'qr-jarvis.png'; a.click()
  }

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg)',color:'var(--text)',fontFamily:"'Inter',sans-serif"}}>
      <div className="bg-grid"/>
      <div style={{position:'sticky',top:0,zIndex:50,background:'var(--header)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--border)',padding:'10px 16px',display:'flex',alignItems:'center',gap:8}}>
        <button onClick={()=>router.push('/')} style={{background:'var(--accent-bg)',border:'1px solid var(--border-a)',borderRadius:8,color:'var(--accent)',fontSize:14,fontWeight:800,width:28,height:28,fontFamily:'monospace'}}>J</button>
        <div style={{flex:1,fontSize:15,fontWeight:700}}>📱 QR Generator</div>
      </div>

      <div style={{padding:'14px 14px 80px'}}>
        {/* Type presets */}
        <div style={{display:'flex',gap:6,overflowX:'auto',marginBottom:12}} className="no-scroll">
          {PRESETS.map(p=>(
            <button key={p.label} onClick={()=>{setPreset(p);setInput('');setQrUrl('')}} style={{flexShrink:0,padding:'6px 12px',borderRadius:20,fontSize:11,fontWeight:600,background:preset.label===p.label?'var(--accent-bg)':'transparent',border:`1px solid ${preset.label===p.label?'var(--border-a)':'var(--border)'}`,color:preset.label===p.label?'var(--accent)':'var(--text-3)',cursor:'pointer'}}>
              {p.icon} {p.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={{marginBottom:12}}>
          {preset.prefix&&<div style={{fontSize:10,color:'var(--text-3)',marginBottom:4}}>Prefix: <code style={{color:'var(--accent)'}}>{preset.prefix}</code></div>}
          <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder={preset.placeholder} rows={3}
            style={{width:'100%',background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 12px',color:'var(--text)',fontSize:13,resize:'none',outline:'none',fontFamily:'inherit'}}/>
        </div>

        {/* Options */}
        <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center'}}>
          <div style={{flex:1}}>
            <div style={{fontSize:10,color:'var(--text-3)',marginBottom:3}}>Size: {size}px</div>
            <input type="range" min={150} max={500} value={size} onChange={e=>setSize(Number(e.target.value))} style={{width:'100%'}}/>
          </div>
          <div>
            <div style={{fontSize:10,color:'var(--text-3)',marginBottom:3}}>QR Color</div>
            <input type="color" value={`#${color}`} onChange={e=>setColor(e.target.value.slice(1))} style={{width:36,height:32,padding:0,border:'1px solid var(--border)',borderRadius:6,cursor:'pointer'}}/>
          </div>
          <div>
            <div style={{fontSize:10,color:'var(--text-3)',marginBottom:3}}>Background</div>
            <input type="color" value={`#${bg}`} onChange={e=>setBg(e.target.value.slice(1))} style={{width:36,height:32,padding:0,border:'1px solid var(--border)',borderRadius:6,cursor:'pointer'}}/>
          </div>
        </div>

        <button onClick={generate} style={{width:'100%',padding:'13px',background:'var(--accent)',color:'#000',border:'none',borderRadius:12,fontWeight:700,fontSize:14,cursor:'pointer',marginBottom:16}}>
          Generate QR Code ✨
        </button>

        {/* QR Display */}
        {qrUrl&&(
          <div style={{textAlign:'center',marginBottom:20}}>
            <div style={{background:'#fff',borderRadius:16,padding:16,display:'inline-block',boxShadow:'0 4px 20px rgba(0,0,0,.3)'}}>
              <img src={qrUrl} alt="QR Code" width={size} height={size} style={{display:'block',borderRadius:8}}/>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:12}}>
              <button onClick={download} style={{padding:'9px 18px',background:'var(--accent-bg)',border:'1px solid var(--border-a)',borderRadius:10,color:'var(--accent)',fontSize:12,fontWeight:600,cursor:'pointer'}}>⬇️ Download</button>
              <button onClick={()=>navigator.share?.({title:'QR Code',url:qrUrl}).catch(()=>navigator.clipboard.writeText(qrUrl))} style={{padding:'9px 18px',background:'rgba(255,255,255,.06)',border:'1px solid var(--border)',borderRadius:10,color:'var(--text)',fontSize:12,cursor:'pointer'}}>🔗 Share</button>
            </div>
          </div>
        )}

        {/* History */}
        {history.length>0&&(
          <>
            <div style={{fontSize:11,color:'var(--text-3)',marginBottom:8,fontWeight:600}}>Recent QRs</div>
            {history.map((h,i)=>(
              <div key={i} onClick={()=>setQrUrl(h.url)} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,marginBottom:6,cursor:'pointer'}}>
                <img src={h.url} alt="" width={36} height={36} style={{borderRadius:4,background:'#fff'}}/>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.text}</div><div style={{fontSize:9,color:'var(--text-4)'}}>{h.time}</div></div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
