// lib/termux/bridge.ts — Termux HTTP Bridge v2
// Setup: Termux mein node ~/.jarvis-server.js chalao

const URL = 'http://localhost:1234'

export interface TermuxResult { ok: boolean; output: string }

export async function isTermuxAvailable(): Promise<boolean> {
  try {
    const r = await fetch(`${URL}/ping`, { signal: AbortSignal.timeout(1500) })
    return r.ok
  } catch { return false }
}

export async function termuxRun(cmd: string): Promise<TermuxResult> {
  try {
    const r = await fetch(`${URL}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cmd }),
      signal: AbortSignal.timeout(8000),
    })
    const d = await r.json()
    return { ok: true, output: d.output || 'Done ✓' }
  } catch {
    return { ok: false, output: 'Termux server nahi chal raha. Chat mein "termux setup" likho.' }
  }
}

// ─── All Termux commands ──────────────────────────────────
const CMDS: Array<{re:RegExp; cmd:(m:RegExpMatchArray)=>string; label:string}> = [
  // Torch
  { re: /torch\s*(on|chalu|jala)|light\s*on|flashlight\s*on/i,
    cmd: ()=>'termux-torch on', label:'🔦 Torch ON' },
  { re: /torch\s*(off|band|bujha)|light\s*off|flashlight\s*off/i,
    cmd: ()=>'termux-torch off', label:'🔦 Torch OFF' },
  // Battery
  { re: /battery|charge|baatri|kitni\s*charge/i,
    cmd: ()=>'termux-battery-status', label:'🔋 Battery' },
  // Volume
  { re: /volume\s*(up|badha|zyada|max)/i,
    cmd: ()=>'termux-volume music 15', label:'🔊 Volume UP' },
  { re: /volume\s*(down|kam|ghata|zero|mute)/i,
    cmd: ()=>'termux-volume music 0', label:'🔇 Volume DOWN' },
  { re: /volume\s*(\d+)/i,
    cmd: m=>`termux-volume music ${m[1]}`, label:'🔊 Volume' },
  // Vibrate
  { re: /vibrat|hila|buzz/i,
    cmd: ()=>'termux-vibrate -d 500 -f', label:'📳 Vibrate' },
  // WiFi
  { re: /wifi\s*(info|kya|status|check|speed)|network\s*info|ip\s*address/i,
    cmd: ()=>'termux-wifi-connectioninfo', label:'📶 WiFi Info' },
  // Location
  { re: /location|gps|kahan\s*hoon|meri\s*jagah|coordinates/i,
    cmd: ()=>'termux-location -p gps -r once', label:'📍 Location' },
  // SMS read
  { re: /sms\s*(padh|read|dekh|dikhao|list)|last\s*message/i,
    cmd: ()=>'termux-sms-list -l 5', label:'💬 SMS List' },
  // Contacts
  { re: /contact\s*(list|dikhao|dekh)|phone\s*book/i,
    cmd: ()=>'termux-contact-list | head -50', label:'👥 Contacts' },
  // Call log
  { re: /call\s*(log|history|record)|recent\s*call/i,
    cmd: ()=>'termux-call-log -l 10', label:'📞 Call Log' },
  // Camera
  { re: /photo\s*(le|kheencho|click|lo)|selfie|camera\s*(on|kholo)/i,
    cmd: ()=>'termux-camera-photo /sdcard/JARVIS_$(date +%s).jpg && echo "Photo saved to /sdcard"',
    label:'📸 Photo' },
  // Screenshot
  { re: /screenshot|screen\s*shot|screen\s*capture/i,
    cmd: ()=>'termux-screenshot -q 90 /sdcard/JARVIS_ss_$(date +%s).jpg && echo "Screenshot saved"',
    label:'📷 Screenshot' },
  // Notification
  { re: /notification\s*(bhej|send|de|dikhao)|notify/i,
    cmd: m=>`termux-notification --title "JARVIS" --content "${(m.input||'').slice(0,50)}"`,
    label:'🔔 Notification' },
  // Clipboard
  { re: /clipboard|copy\s*kar|text\s*copy/i,
    cmd: ()=>'termux-clipboard-get', label:'📋 Clipboard' },
  // Speech (TTS)
  { re: /bol\s*do|speak|tts|awaaz\s*mein/i,
    cmd: m=>{
      const txt = (m.input||'').replace(/bol\s*do|speak|tts|awaaz\s*mein/gi,'').trim()
      return `termux-tts-speak "${txt || 'JARVIS ready'}"`
    }, label:'🔊 Speak' },
  // Alarm
  { re: /alarm\s*(?:laga|set|baja|laga do).*?(\d{1,2})[:.h](\d{2})?/i,
    cmd: m=>{
      const h=m[1]||'7', min=m[2]||'00'
      return `termux-notification --title "⏰ Alarm Set" --content "${h}:${min} baje alarm lagaya"`
    }, label:'⏰ Alarm' },
  // Open apps
  { re: /\b(kholo|open|launch)\s+(youtube|whatsapp|instagram|maps|camera|settings|chrome|spotify|telegram)\b/i,
    cmd: m=>{
      const apps: Record<string,string> = {
        youtube:'com.google.android.youtube', whatsapp:'com.whatsapp',
        instagram:'com.instagram.android', maps:'com.google.android.apps.maps',
        camera:'com.android.camera2', settings:'com.android.settings',
        chrome:'com.android.chrome', spotify:'com.spotify.music',
        telegram:'org.telegram.messenger'
      }
      const a = (m[2]||'').toLowerCase()
      return apps[a] ? `am start -n ${apps[a]}` : `echo "App not found: ${a}"`
    }, label:'📱 Open App' },
  // Storage info
  { re: /storage|space\s*kitna|memory|disk/i,
    cmd: ()=>'df -h /sdcard | tail -1', label:'💾 Storage' },
  // Device info
  { re: /device\s*info|phone\s*info|system\s*info|about\s*phone/i,
    cmd: ()=>'getprop ro.product.model && getprop ro.build.version.release && echo "RAM: $(free -m | awk \'/Mem/{print $2}\')"',
    label:'📱 Device Info' },
]

export function detectTermuxCommand(text: string): {cmd:string; label:string}|null {
  for (const {re,cmd,label} of CMDS) {
    const m = text.match(re)
    if (m) return { cmd: cmd(m), label }
  }
  return null
}

// Server script — show to user for setup
export const TERMUX_SERVER_SCRIPT = `const http=require('http'),{execSync}=require('child_process')
http.createServer((req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*')
  res.setHeader('Content-Type','application/json')
  if(req.url==='/ping'){res.end(JSON.stringify({ok:true}));return}
  if(req.url==='/run'&&req.method==='POST'){
    let b=''
    req.on('data',d=>b+=d)
    req.on('end',()=>{
      try{const{cmd}=JSON.parse(b);const o=execSync(cmd,{timeout:8000}).toString().trim();res.end(JSON.stringify({ok:true,output:o||'Done!'}))}
      catch(e){res.end(JSON.stringify({ok:false,output:e.message}))}
    })}
}).listen(1234,()=>console.log('JARVIS Bridge :1234 ✓'))`
