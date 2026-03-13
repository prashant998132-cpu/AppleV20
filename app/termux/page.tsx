'use client'
import { useState, useEffect } from 'react'
import { isTermuxAvailable, termuxRun, TERMUX_SERVER_SCRIPT } from '../../lib/termux/bridge'

export default function TermuxPage() {
  const [status, setStatus] = useState<'checking'|'online'|'offline'>('checking')
  const [cmd, setCmd] = useState('')
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    isTermuxAvailable().then(ok => setStatus(ok ? 'online' : 'offline'))
    const t = setInterval(() => {
      isTermuxAvailable().then(ok => setStatus(ok ? 'online' : 'offline'))
    }, 5000)
    return () => clearInterval(t)
  }, [])

  async function run() {
    if (!cmd.trim()) return
    setRunning(true)
    const r = await termuxRun(cmd)
    setOutput(r.output)
    setRunning(false)
  }

  function copyScript() {
    navigator.clipboard.writeText(TERMUX_SERVER_SCRIPT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const quickCmds = [
    { label: '🔋 Battery', cmd: 'termux-battery-status' },
    { label: '🔦 Torch ON', cmd: 'termux-torch on' },
    { label: '🔦 Torch OFF', cmd: 'termux-torch off' },
    { label: '📳 Vibrate', cmd: 'termux-vibrate -d 500' },
    { label: '📶 WiFi Info', cmd: 'termux-wifi-connectioninfo' },
    { label: '📍 Location', cmd: 'termux-location' },
    { label: '💬 Last SMS', cmd: 'termux-sms-list -l 3' },
    { label: '📸 Photo', cmd: 'termux-camera-photo /sdcard/jarvis_photo.jpg' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', color:'var(--text)', padding:'16px', maxWidth:'600px', margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'24px' }}>
        <button onClick={() => history.back()} style={{ background:'none', border:'none', color:'var(--accent)', fontSize:'20px', cursor:'pointer' }}>←</button>
        <div>
          <h1 style={{ margin:0, fontSize:'20px', fontWeight:700 }}>📱 Termux Bridge</h1>
          <p style={{ margin:0, fontSize:'12px', color:'var(--dim)' }}>Real phone control — no MacroDroid needed</p>
        </div>
        <div style={{ marginLeft:'auto', padding:'4px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:700,
          background: status==='online' ? '#00ff8822' : status==='offline' ? '#ff444422' : '#ffffff11',
          color: status==='online' ? '#00ff88' : status==='offline' ? '#ff6666' : 'var(--dim)',
          border: `1px solid ${status==='online' ? '#00ff88' : status==='offline' ? '#ff4444' : 'var(--border)'}` }}>
          {status === 'checking' ? '⏳' : status === 'online' ? '● Online' : '● Offline'}
        </div>
      </div>

      {status !== 'online' && (
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'16px', padding:'20px', marginBottom:'20px' }}>
          <h2 style={{ margin:'0 0 16px', fontSize:'16px', color:'var(--accent)' }}>⚡ One-time Setup (2 min)</h2>
          {[
            { n:1, title:'Termux install karo', desc:'F-Droid se (Play Store wala outdated hai)', cmd:'fdroid.org → Termux' },
            { n:2, title:'Termux:API install karo', desc:'F-Droid se — torch/sms/camera ke liye', cmd:'fdroid.org → Termux:API' },
            { n:3, title:'Termux mein run karo', desc:'', cmd:'pkg update -y && pkg install nodejs termux-api -y' },
            { n:4, title:'Script save karo', desc:'Neeche button se copy karo → Termux mein paste', cmd:'nano ~/.jarvis-server.js' },
            { n:5, title:'Server start karo', desc:'Termux background mein rakhna', cmd:'node ~/.jarvis-server.js' },
          ].map(s => (
            <div key={s.n} style={{ display:'flex', gap:'12px', marginBottom:'14px' }}>
              <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'var(--accent)', color:'#000',
                display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'13px', flexShrink:0 }}>{s.n}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:'14px' }}>{s.title}</div>
                {s.desc && <div style={{ fontSize:'12px', color:'var(--dim)', marginTop:'2px' }}>{s.desc}</div>}
                <code style={{ display:'block', marginTop:'4px', padding:'4px 8px', background:'#00000044', borderRadius:'6px',
                  fontSize:'11px', color:'#00ff88', fontFamily:'monospace' }}>{s.cmd}</code>
              </div>
            </div>
          ))}
          <button onClick={copyScript} style={{ width:'100%', padding:'12px', borderRadius:'12px',
            background: copied ? '#00ff8822' : 'var(--accent)', color: copied ? '#00ff88' : '#000',
            border: copied ? '1px solid #00ff88' : 'none', fontWeight:700, cursor:'pointer', marginTop:'4px', fontSize:'14px' }}>
            {copied ? '✅ Copied!' : '📋 Server Script Copy Karo'}
          </button>
        </div>
      )}

      <div style={{ marginBottom:'20px' }}>
        <h2 style={{ fontSize:'12px', color:'var(--dim)', margin:'0 0 10px', textTransform:'uppercase', letterSpacing:'1px' }}>Quick Commands</h2>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
          {quickCmds.map(q => (
            <button key={q.cmd} onClick={() => { setCmd(q.cmd); setOutput(''); termuxRun(q.cmd).then(r => setOutput(r.output)) }}
              style={{ padding:'12px', background:'var(--card)', border:'1px solid var(--border)', borderRadius:'12px',
                color:'var(--text)', cursor:'pointer', textAlign:'left', fontSize:'13px', fontWeight:500 }}>
              {q.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'16px', padding:'16px', marginBottom:'16px' }}>
        <div style={{ display:'flex', gap:'8px' }}>
          <input value={cmd} onChange={e => setCmd(e.target.value)} onKeyDown={e => e.key==='Enter' && run()}
            placeholder="termux-battery-status"
            style={{ flex:1, padding:'10px 14px', background:'var(--bg)', border:'1px solid var(--border)',
              borderRadius:'10px', color:'var(--text)', fontSize:'13px', fontFamily:'monospace' }} />
          <button onClick={run} disabled={running}
            style={{ padding:'10px 18px', background:'var(--accent)', border:'none', borderRadius:'10px',
              color:'#000', fontWeight:700, cursor:'pointer' }}>
            {running ? '⏳' : '▶ Run'}
          </button>
        </div>
        {output && (
          <pre style={{ margin:'12px 0 0', padding:'12px', background:'#00000066', borderRadius:'10px',
            fontSize:'12px', fontFamily:'monospace', color:'#00ff88', overflow:'auto', whiteSpace:'pre-wrap', maxHeight:'200px' }}>
            {output}
          </pre>
        )}
      </div>

      <div style={{ background:'#00e5ff11', border:'1px solid #00e5ff33', borderRadius:'12px', padding:'14px', fontSize:'13px' }}>
        💬 <strong>Chat se bhi kaam karta hai:</strong><br/>
        <span style={{color:'var(--dim)'}}>"Torch on" · "Battery check" · "Vibrate" · "Location" · "SMS dekho"</span>
      </div>
    </div>
  )
}
