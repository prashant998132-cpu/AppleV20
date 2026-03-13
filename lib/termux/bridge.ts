// lib/termux/bridge.ts — Termux HTTP Bridge (FREE, no MacroDroid needed)
// Setup: Phone pe Termux install karo, phir:
//   pkg install nodejs && node ~/.jarvis-server.js
// JARVIS → localhost:1234 → Termux → Android commands

const TERMUX_URL = 'http://localhost:1234'

export interface TermuxResult {
  ok: boolean
  output: string
}

// ─── Check if Termux server is running ────────────────────
export async function isTermuxAvailable(): Promise<boolean> {
  try {
    const r = await fetch(`${TERMUX_URL}/ping`, { signal: AbortSignal.timeout(1000) })
    return r.ok
  } catch { return false }
}

// ─── Send command to Termux ────────────────────────────────
export async function termuxRun(cmd: string): Promise<TermuxResult> {
  try {
    const r = await fetch(`${TERMUX_URL}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cmd }),
      signal: AbortSignal.timeout(5000),
    })
    const d = await r.json()
    return { ok: true, output: d.output || 'Done ✓' }
  } catch (e) {
    return { ok: false, output: 'Termux server nahi chal raha. Setup guide: /termux' }
  }
}

// ─── Command patterns (Hinglish + English) ────────────────
const TERMUX_CMDS: Array<{ re: RegExp; cmd: (m: RegExpMatchArray) => string; label: string }> = [
  // Notifications
  { re: /notification.*(bhej|send|de|daal)|bhej.*notification/i,
    cmd: m => `termux-notification --title "JARVIS" --content "${m[0]}"`,
    label: '🔔 Notification' },
  // Torch
  { re: /torch|flashlight|light\s*(on|off|chalu|band)/i,
    cmd: m => /off|band/.test(m[0]) ? 'termux-torch off' : 'termux-torch on',
    label: '🔦 Torch' },
  // Volume
  { re: /volume\s*(up|down|zyada|kam|max|zero|0|mute)/i,
    cmd: m => /up|zyada/.test(m[0]) ? 'termux-volume music 15'
           : /down|kam/.test(m[0]) ? 'termux-volume music 5'
           : /max/.test(m[0]) ? 'termux-volume music 15'
           : 'termux-volume music 0',
    label: '🔊 Volume' },
  // Battery check
  { re: /battery|charge|charging|baatri/i,
    cmd: () => 'termux-battery-status',
    label: '🔋 Battery' },
  // WiFi info
  { re: /wifi.*info|wifi.*kya|network.*info|ip address/i,
    cmd: () => 'termux-wifi-connectioninfo',
    label: '📶 WiFi Info' },
  // Vibrate
  { re: /vibrate|hila|buzz/i,
    cmd: () => 'termux-vibrate -d 500',
    label: '📳 Vibrate' },
  // Camera photo
  { re: /photo\s*(le|kheencho|click|lo)|selfie/i,
    cmd: () => 'termux-camera-photo /sdcard/JARVIS_photo.jpg && echo "Photo saved!"',
    label: '📸 Photo' },
  // SMS (read)
  { re: /sms\s*(padh|read|dekh|dikhao)/i,
    cmd: () => 'termux-sms-list -l 5',
    label: '💬 SMS Read' },
  // Alarm
  { re: /alarm\s*(\d{1,2}[:.]\d{2}|\d{1,2}\s*(baj|am|pm))/i,
    cmd: m => {
      const t = m[0].match(/(\d{1,2})[:.:]?(\d{2})?/)
      const h = t ? t[1] : '7', min = t?.[2] || '00'
      return `termux-alarm --hour ${h} --minute ${min}`
    },
    label: '⏰ Alarm' },
  // Location
  { re: /location|gps|meri\s*(jagah|location)|kahan\s*hoon/i,
    cmd: () => 'termux-location',
    label: '📍 Location' },
  // Clipboard
  { re: /clipboard|copy\s*karo|copy\s*kar/i,
    cmd: m => {
      const txt = m.input?.replace(/clipboard|copy\s*karo?/gi,'').trim() || ''
      return txt ? `echo "${txt}" | termux-clipboard-set && echo "Copied!"` : 'termux-clipboard-get'
    },
    label: '📋 Clipboard' },
  // Open app (deep link fallback)
  { re: /\b(kholo|open|launch|start)\s+(youtube|whatsapp|instagram|maps|camera|settings|chrome)\b/i,
    cmd: m => {
      const app = m[2]?.toLowerCase()
      const pkg: Record<string, string> = {
        youtube: 'com.google.android.youtube',
        whatsapp: 'com.whatsapp',
        instagram: 'com.instagram.android',
        maps: 'com.google.android.apps.maps',
        camera: 'com.android.camera2',
        settings: 'com.android.settings',
        chrome: 'com.android.chrome',
      }
      return pkg[app] ? `am start -n ${pkg[app]}` : `echo "App nahi mila"`
    },
    label: '📱 Open App' },
]

// ─── Detect if message is a Termux command ─────────────────
export function detectTermuxCommand(text: string): {
  cmd: string; label: string
} | null {
  for (const { re, cmd, label } of TERMUX_CMDS) {
    const m = text.match(re)
    if (m) return { cmd: cmd(m), label }
  }
  return null
}

// ─── Setup script for Termux (shown to user) ──────────────
export const TERMUX_SERVER_SCRIPT = `
// Save this as ~/.jarvis-server.js in Termux
// Run: node ~/.jarvis-server.js

const http = require('http')
const { execSync } = require('child_process')

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET')
  res.setHeader('Content-Type', 'application/json')
  
  if (req.url === '/ping') {
    res.end(JSON.stringify({ ok: true }))
    return
  }
  
  if (req.url === '/run' && req.method === 'POST') {
    let body = ''
    req.on('data', d => body += d)
    req.on('end', () => {
      try {
        const { cmd } = JSON.parse(body)
        const output = execSync(cmd, { timeout: 5000 }).toString().trim()
        res.end(JSON.stringify({ ok: true, output: output || 'Done ✓' }))
      } catch (e) {
        res.end(JSON.stringify({ ok: false, output: e.message }))
      }
    })
  }
}).listen(1234, () => console.log('JARVIS Termux Bridge running on :1234'))
`.trim()
