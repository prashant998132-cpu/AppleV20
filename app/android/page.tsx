'use client'
// app/android/page.tsx — JARVIS Android Setup Guide v25
// TWA + MacroDroid setup + APK download guide

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAndroid, isAndroidTWA, MACRODROID_SETUP } from '../../lib/android/bridge'

const STEPS = [
  {
    id: 'keystore',
    icon: '🔑',
    title: 'Keystore Banao (Phone pe)',
    tag: 'ONCE',
    color: '#f59e0b',
    steps: [
      'Termux install karo (F-Droid se — Play Store wala outdated hai)',
      'Termux mein run karo: pkg update && pkg install openjdk-17',
      'GitHub repo clone karo: git clone https://github.com/prashant998132-cpu/AppleV20',
      'cd AppleV20/twa && chmod +x generate-keystore.sh && ./generate-keystore.sh',
      'SHA-256 fingerprint copy karo (screen pe dikhega)',
      'Base64 keystore bhi copy karo (GitHub Secret ke liye)',
    ]
  },
  {
    id: 'assetlinks',
    icon: '🔗',
    title: 'assetlinks.json Update Karo',
    tag: 'ONCE',
    color: '#a78bfa',
    steps: [
      'GitHub repo mein jao: public/.well-known/assetlinks.json',
      'REPLACE_WITH_YOUR_SHA256_FINGERPRINT ki jagah apna SHA-256 paste karo',
      'Format: "AB:CD:EF:..." (colon-separated)',
      'Commit → Vercel auto-deploy → wait 2 min',
      'Verify: https://apple-v20.vercel.app/.well-known/assetlinks.json',
    ]
  },
  {
    id: 'secrets',
    icon: '🔒',
    title: 'GitHub Secrets Add Karo',
    tag: 'ONCE',
    color: '#34d399',
    steps: [
      'GitHub repo → Settings → Secrets and variables → Actions',
      'KEYSTORE_BASE64 → paste base64 keystore (Termux se)',
      'KEYSTORE_PASSWORD → jarvis@2025 (ya jo rakha ho)',
      'KEY_PASSWORD → jarvis@2025 (same as above)',
      'Save karo',
    ]
  },
  {
    id: 'build',
    icon: '🔨',
    title: 'APK Build Karo',
    tag: 'AUTO',
    color: '#00e5ff',
    steps: [
      'GitHub repo → Actions tab',
      '"🤖 Build JARVIS APK" workflow select karo',
      '"Run workflow" button dabao → version likho (e.g. 25.0.0)',
      '~15 min baad build complete hoga',
      'Artifacts section se JARVIS-APK-v25.0.0.zip download karo',
      'ZIP extract karo → .apk file lo',
    ]
  },
  {
    id: 'install',
    icon: '📱',
    title: 'APK Install Karo',
    tag: 'ONCE',
    color: '#f472b6',
    steps: [
      'Android Settings → Security → Install unknown apps → Allow',
      'APK file open karo → Install',
      'JARVIS icon home screen pe aa jayega',
      'Open karo — full screen, no browser bar! 🎉',
    ]
  },
  {
    id: 'macrodroid',
    icon: '⚡',
    title: 'MacroDroid Setup (Optional)',
    tag: 'POWER',
    color: '#fb923c',
    steps: [
      'MacroDroid install karo (Play Store — free)',
      'Open → Add Macro → "+" button',
      'Trigger: HTTP Server → Listen for name: JARVIS_Wifi',
      'Action: WiFi → Toggle WiFi',
      'Save. Repeat for each macro below.',
      'JARVIS mein test karo: "WiFi off karo"',
    ]
  },
]

export default function AndroidPage() {
  const router = useRouter()
  const [expanded, setExpanded] = useState<string | null>('keystore')
  const [isTWA, setIsTWA] = useState(false)
  const [androidDev, setAndroidDev] = useState(false)

  useEffect(() => {
    setIsTWA(isAndroidTWA())
    setAndroidDev(isAndroid())
  }, [])

  return (
    <div style={{ position:'fixed', inset:0, background:'var(--bg)', display:'flex', flexDirection:'column' as const, color:'var(--text)' }}>
      {/* Header */}
      <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', background:'var(--header-bg)', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <button onClick={() => router.push('/')} style={{ background:'none', border:'none', color:'var(--accent)', fontSize:18, cursor:'pointer' }}>←</button>
        <div style={{ fontSize:13, fontWeight:700, letterSpacing:2, fontFamily:"'Space Mono',monospace" }}>ANDROID SETUP</div>
        <div style={{ flex:1 }}/>
        {isTWA && <span style={{ fontSize:9, padding:'2px 8px', borderRadius:20, background:'rgba(52,211,153,.15)', color:'#34d399', fontWeight:700 }}>✓ TWA MODE</span>}
        {!isTWA && androidDev && <span style={{ fontSize:9, padding:'2px 8px', borderRadius:20, background:'rgba(251,191,36,.15)', color:'#fbbf24', fontWeight:700 }}>BROWSER MODE</span>}
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'12px 14px' }}>
        {/* Status banner */}
        <div style={{ background: isTWA ? 'rgba(52,211,153,.08)' : 'rgba(0,229,255,.06)', border:`1px solid ${isTWA?'rgba(52,211,153,.2)':'rgba(0,229,255,.15)'}`, borderRadius:14, padding:'14px 16px', marginBottom:16 }}>
          <div style={{ fontSize:20, marginBottom:6 }}>{isTWA ? '🎉' : '📱'}</div>
          <div style={{ fontSize:13, fontWeight:700, color:isTWA?'#34d399':'var(--accent)', marginBottom:4 }}>
            {isTWA ? 'JARVIS TWA mein chal raha hai!' : 'Browser mein chal raha hai'}
          </div>
          <div style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.6 }}>
            {isTWA
              ? 'Full-screen native mode active. MacroDroid commands kaam karenge!'
              : 'Neeche steps follow karo APK install karne ke liye. Ek baar install ke baad — native Android app jaisi feel aayegi!'}
          </div>
        </div>

        {/* Architecture diagram */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'12px 14px', marginBottom:16, fontSize:11, fontFamily:'monospace', color:'var(--text-muted)', lineHeight:2 }}>
          <div style={{ fontSize:10, color:'var(--text-faint)', letterSpacing:2, marginBottom:8 }}>ARCHITECTURE</div>
          <div><span style={{color:'#00e5ff'}}>JARVIS Chat</span> → <span style={{color:'#a78bfa'}}>Android Intent / MacroDroid</span> → <span style={{color:'#34d399'}}>Android System</span></div>
          <div><span style={{color:'#00e5ff'}}>PWA (Vercel)</span> → <span style={{color:'#f59e0b'}}>TWA APK</span> → <span style={{color:'#34d399'}}>Full-screen App</span></div>
          <div><span style={{color:'#f472b6'}}>GitHub Push</span> → <span style={{color:'#00e5ff'}}>Vercel Deploy</span> → <span style={{color:'#34d399'}}>Auto-update ✓</span></div>
        </div>

        {/* Setup steps */}
        {STEPS.map(s => (
          <div key={s.id} style={{ marginBottom:8, border:`1px solid ${expanded===s.id?s.color+'40':'var(--border)'}`, borderRadius:14, overflow:'hidden', background:'var(--bg-card)' }}>
            <button onClick={() => setExpanded(e => e===s.id?null:s.id)}
              style={{ width:'100%', padding:'13px 14px', display:'flex', alignItems:'center', gap:10, background:'none', border:'none', cursor:'pointer', textAlign:'left' as const }}>
              <span style={{fontSize:20}}>{s.icon}</span>
              <div style={{flex:1}}>
                <span style={{fontSize:13, fontWeight:700, color:'var(--text)'}}>{s.title}</span>
              </div>
              <span style={{fontSize:9, padding:'2px 8px', borderRadius:20, background:s.color+'20', color:s.color, fontWeight:700}}>{s.tag}</span>
              <span style={{fontSize:14, color:'var(--text-faint)'}}>{expanded===s.id?'▲':'▼'}</span>
            </button>
            {expanded===s.id && (
              <div style={{padding:'0 14px 14px', borderTop:'1px solid var(--border)'}}>
                <div style={{display:'flex', flexDirection:'column' as const, gap:8, paddingTop:10}}>
                  {s.steps.map((step, i) => (
                    <div key={i} style={{display:'flex', gap:10, alignItems:'flex-start'}}>
                      <div style={{width:20, height:20, borderRadius:'50%', background:s.color+'20', color:s.color, fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1}}>{i+1}</div>
                      <div style={{fontSize:12, color:'var(--text)', lineHeight:1.6}}>{step}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* MacroDroid macros list */}
        <div style={{marginTop:8, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'12px 14px'}}>
          <div style={{fontSize:10, color:'var(--text-faint)', letterSpacing:2, marginBottom:10}}>⚡ MACRODROID MACROS TO CREATE</div>
          {MACRODROID_SETUP.macros.map((m, i) => (
            <div key={i} style={{padding:'8px 0', borderBottom:i<MACRODROID_SETUP.macros.length-1?'1px solid var(--border)':'none'}}>
              <div style={{fontSize:12, fontWeight:700, color:'var(--text)', fontFamily:'monospace'}}>{m.name}</div>
              <div style={{fontSize:10, color:'var(--text-muted)', marginTop:2}}>Trigger: {m.trigger}</div>
              <div style={{fontSize:10, color:'var(--accent)', marginTop:1}}>Action: {m.action}</div>
            </div>
          ))}
        </div>

        {/* Test commands */}
        <div style={{marginTop:8, background:'var(--bg-card)', border:'1px solid rgba(0,229,255,.15)', borderRadius:14, padding:'12px 14px', marginBottom:20}}>
          <div style={{fontSize:10, color:'var(--text-faint)', letterSpacing:2, marginBottom:10}}>💬 TEST COMMANDS IN CHAT</div>
          {[
            'Open YouTube', 'WiFi off karo', 'Bluetooth on karo',
            'Alarm 7 baje laga', 'Torch on karo', 'Screenshot lo',
            'Volume 50 set karo', 'Brightness 70 kar do',
          ].map((cmd, i) => (
            <button key={i} onClick={() => router.push('/?q=' + encodeURIComponent(cmd))}
              style={{display:'inline-block', margin:'3px 4px 3px 0', padding:'5px 10px', borderRadius:20, border:'1px solid var(--border)', background:'var(--bg-surface)', color:'var(--text-muted)', fontSize:11, cursor:'pointer'}}>
              {cmd}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
