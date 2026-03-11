// lib/android/bridge.ts — JARVIS Android Automation Bridge v25
// Connects JARVIS chat → MacroDroid → Android system
//
// Architecture:
//   JARVIS (TWA) → localhost:1234 → MacroDroid → Android APIs
//   OR → Android Intents (intent:// URLs) — no app needed
//
// MacroDroid setup: Enable "HTTP Server" trigger in MacroDroid
// Port: 1234 (default), or change MACRODROID_PORT below

const MACRODROID_PORT = 1234
const MACRODROID_BASE = `http://localhost:${MACRODROID_PORT}`

// ── Detect environment ─────────────────────────────────
export function isAndroidTWA(): boolean {
  if (typeof window === 'undefined') return false
  // TWA sets a custom header; also check standalone mode
  return (
    window.matchMedia('(display-mode: standalone)').matches &&
    /android/i.test(navigator.userAgent)
  )
}

export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false
  return /android/i.test(navigator.userAgent)
}

// ── MacroDroid HTTP trigger ────────────────────────────
// MacroDroid: Add "HTTP Server" trigger → Listen for name
async function macrodroidTrigger(macroName: string, variables?: Record<string, string>): Promise<boolean> {
  try {
    const params = variables ? '?' + new URLSearchParams(variables).toString() : ''
    const url = `${MACRODROID_BASE}/macro?name=${encodeURIComponent(macroName)}${params}`
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

// ── Android Intent URLs (no app needed) ───────────────
// Works even without MacroDroid — uses Android's intent system
function openIntent(uri: string) {
  const a = document.createElement('a')
  a.href = uri
  a.click()
}

// ── App launcher ──────────────────────────────────────
const APP_PACKAGES: Record<string, string> = {
  'youtube':      'com.google.android.youtube',
  'instagram':    'com.instagram.android',
  'whatsapp':     'com.whatsapp',
  'telegram':     'org.telegram.messenger',
  'twitter':      'com.twitter.android',
  'spotify':      'com.spotify.music',
  'chrome':       'com.android.chrome',
  'camera':       'com.android.camera2',
  'gallery':      'com.google.android.apps.photos',
  'maps':         'com.google.android.apps.maps',
  'gmail':        'com.google.android.gm',
  'calendar':     'com.google.android.calendar',
  'calculator':   'com.google.android.calculator',
  'settings':     'com.android.settings',
  'clock':        'com.google.android.deskclock',
  'phone':        'com.google.android.dialer',
  'contacts':     'com.google.android.contacts',
  'messages':     'com.google.android.apps.messaging',
  'play':         'com.android.vending',
  'netflix':      'com.netflix.mediaclient',
  'amazon':       'com.amazon.mShop.android.shopping',
  'flipkart':     'com.flipkart.android',
  'paytm':        'net.one97.paytm',
  'gpay':         'com.google.android.apps.nbu.paisa.user',
  'phonepe':      'com.phonepe.app',
  'zomato':       'com.application.zomato',
  'swiggy':       'in.swiggy.android',
  'ola':          'com.olacabs.customer',
  'uber':         'com.ubercab',
  'irctc':        'cris.org.in.prs.ima',
  'hotstar':      'in.startv.hotstar',
  'gaana':        'com.gaana',
  'jio':          'com.jio.rilhome',
}

export async function openApp(appName: string): Promise<{ success: boolean; method: string }> {
  const name = appName.toLowerCase().replace(/\s+/g, '')
  const pkg = APP_PACKAGES[name]

  // Try MacroDroid first (if available)
  const mdSuccess = await macrodroidTrigger('JARVIS_OpenApp', { app: name, package: pkg || '' })
  if (mdSuccess) return { success: true, method: 'macrodroid' }

  // Fallback: Android intent URL
  if (pkg) {
    openIntent(`intent://launch?package=${pkg}#Intent;scheme=launch;package=${pkg};end`)
    return { success: true, method: 'intent' }
  }

  // Last fallback: Play Store search
  openIntent(`market://search?q=${encodeURIComponent(appName)}`)
  return { success: true, method: 'playstore' }
}

// ── Phone calls ───────────────────────────────────────
export async function makeCall(number: string): Promise<boolean> {
  const md = await macrodroidTrigger('JARVIS_Call', { number })
  if (md) return true
  // Direct tel: URI
  openIntent(`tel:${number}`)
  return true
}

// ── WhatsApp message ──────────────────────────────────
export function openWhatsApp(number: string, message?: string): void {
  const msg = message ? encodeURIComponent(message) : ''
  openIntent(`https://wa.me/${number}${msg ? '?text=' + msg : ''}`)
}

// ── System controls (MacroDroid required) ─────────────
export async function toggleWifi(state?: 'on' | 'off'): Promise<boolean> {
  return macrodroidTrigger('JARVIS_Wifi', { state: state || 'toggle' })
}

export async function toggleBluetooth(state?: 'on' | 'off'): Promise<boolean> {
  return macrodroidTrigger('JARVIS_Bluetooth', { state: state || 'toggle' })
}

export async function setBrightness(level: number): Promise<boolean> {
  return macrodroidTrigger('JARVIS_Brightness', { level: String(Math.max(0, Math.min(100, level))) })
}

export async function setVolume(level: number, stream?: 'media' | 'ring' | 'alarm'): Promise<boolean> {
  return macrodroidTrigger('JARVIS_Volume', { level: String(level), stream: stream || 'media' })
}

export async function setAlarm(hour: number, minute: number, label?: string): Promise<boolean> {
  const md = await macrodroidTrigger('JARVIS_Alarm', { hour: String(hour), minute: String(minute), label: label || 'JARVIS' })
  if (md) return true
  // Fallback: Android alarm intent
  openIntent(`intent:#Intent;action=android.intent.action.SET_ALARM;i.android.intent.extra.alarm.HOUR=${hour};i.android.intent.extra.alarm.MINUTES=${minute};S.android.intent.extra.alarm.MESSAGE=${label||'JARVIS'};end`)
  return true
}

export async function sendNotification(title: string, body: string): Promise<boolean> {
  return macrodroidTrigger('JARVIS_Notify', { title, body })
}

export async function speakText(text: string): Promise<boolean> {
  return macrodroidTrigger('JARVIS_Speak', { text })
}

export async function searchGoogle(query: string): Promise<void> {
  openIntent(`https://www.google.com/search?q=${encodeURIComponent(query)}`)
}

export async function openMaps(query: string): Promise<void> {
  openIntent(`https://www.google.com/maps/search/${encodeURIComponent(query)}`)
}

export async function openYouTubeSearch(query: string): Promise<void> {
  openIntent(`vnd.youtube:///results?search_query=${encodeURIComponent(query)}`)
}

export async function takeScreenshot(): Promise<boolean> {
  return macrodroidTrigger('JARVIS_Screenshot')
}

export async function flashlight(state?: 'on' | 'off' | 'toggle'): Promise<boolean> {
  return macrodroidTrigger('JARVIS_Torch', { state: state || 'toggle' })
}

// ── Share text ────────────────────────────────────────
export async function shareText(text: string): Promise<void> {
  if (navigator.share) {
    await navigator.share({ text }).catch(() => {})
  }
}

// ── Clipboard ─────────────────────────────────────────
export async function copyToClipboard(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true }
  catch { return false }
}

// ── Intent parser — detect Android commands from chat ──
export interface AndroidCommand {
  type: 'open_app' | 'call' | 'whatsapp' | 'wifi' | 'bluetooth' | 'brightness' |
        'volume' | 'alarm' | 'torch' | 'screenshot' | 'maps' | 'youtube_search' |
        'notification' | 'share'
  args: Record<string, string>
  raw: string
}

export function parseAndroidCommand(text: string): AndroidCommand | null {
  const t = text.toLowerCase().trim()

  // Open app
  const appMatch = t.match(/(?:open|launch|start|chalu karo?|kholo?|chalao?)\s+([\w\s]+?)(?:\s+app)?$/i)
  if (appMatch) {
    const appName = appMatch[1].trim()
    return { type: 'open_app', args: { app: appName }, raw: text }
  }

  // Call
  const callMatch = t.match(/(?:call|phone karo?|call karo?|dial)\s+(?:on\s+)?([+\d\s-]{7,15})/i)
  if (callMatch) return { type: 'call', args: { number: callMatch[1].replace(/\s/g,'') }, raw: text }

  // WhatsApp
  const waMatch = t.match(/(?:whatsapp|wa)\s+(?:karo?|bhejo?|message)?\s*(?:on\s+)?([+\d\s]{7,15})/i)
  if (waMatch) return { type: 'whatsapp', args: { number: waMatch[1].replace(/\s/g,'') }, raw: text }

  // WiFi
  if (/wifi\s*(on|off|band karo|chalu karo)/i.test(t)) {
    const state = /off|band/i.test(t) ? 'off' : 'on'
    return { type: 'wifi', args: { state }, raw: text }
  }
  if (/wifi\s*(toggle|badlo)/i.test(t)) return { type: 'wifi', args: { state: 'toggle' }, raw: text }

  // Bluetooth
  if (/bluetooth\s*(on|off|band karo|chalu karo|toggle)/i.test(t)) {
    const state = /off|band/i.test(t) ? 'off' : /toggle/i.test(t) ? 'toggle' : 'on'
    return { type: 'bluetooth', args: { state }, raw: text }
  }

  // Brightness
  const brightMatch = t.match(/(?:brightness|roshan[iy])\s+(?:set|kar|karo)?\s*(?:to\s+)?(\d+)/i)
  if (brightMatch) return { type: 'brightness', args: { level: brightMatch[1] }, raw: text }

  // Volume
  const volMatch = t.match(/(?:volume|awaaz)\s+(?:set|kar|karo)?\s*(?:to\s+)?(\d+)/i)
  if (volMatch) return { type: 'volume', args: { level: volMatch[1] }, raw: text }

  // Alarm
  const alarmMatch = t.match(/(?:alarm|alarm laga|wake me|uthao?)\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|baje|baj)?/i)
  if (alarmMatch) {
    let hour = parseInt(alarmMatch[1])
    const min = parseInt(alarmMatch[2] || '0')
    if (alarmMatch[3] && /pm/i.test(alarmMatch[3]) && hour < 12) hour += 12
    return { type: 'alarm', args: { hour: String(hour), minute: String(min) }, raw: text }
  }

  // Torch
  if (/torch|flashlight|diya|flash\s*(on|off|band|chalu)/i.test(t)) {
    const state = /off|band/i.test(t) ? 'off' : /on|chalu/i.test(t) ? 'on' : 'toggle'
    return { type: 'torch', args: { state }, raw: text }
  }

  // Screenshot
  if (/screenshot|screen\s*shot|screen capture/i.test(t)) {
    return { type: 'screenshot', args: {}, raw: text }
  }

  // Maps
  const mapsMatch = t.match(/(?:maps?|directions?|navigate|le chalo)\s+(?:to\s+)?(.+)/i)
  if (mapsMatch) return { type: 'maps', args: { query: mapsMatch[1] }, raw: text }

  return null
}

// ── Execute parsed command ─────────────────────────────
export async function executeAndroidCommand(cmd: AndroidCommand): Promise<string> {
  switch (cmd.type) {
    case 'open_app': {
      const r = await openApp(cmd.args.app)
      return r.success
        ? `✓ ${cmd.args.app} khol raha hoon...`
        : `${cmd.args.app} nahi mili — Play Store mein dhundh raha hoon`
    }
    case 'call':
      await makeCall(cmd.args.number)
      return `📞 ${cmd.args.number} pe call kar raha hoon...`
    case 'whatsapp':
      openWhatsApp(cmd.args.number)
      return `💬 WhatsApp khol raha hoon ${cmd.args.number} ke liye...`
    case 'wifi': {
      const ok = await toggleWifi(cmd.args.state as 'on' | 'off')
      return ok ? `📶 WiFi ${cmd.args.state} kar diya` : `MacroDroid se WiFi control karna chahte ho? Pehle setup karo.`
    }
    case 'bluetooth': {
      const ok = await toggleBluetooth(cmd.args.state as 'on' | 'off')
      return ok ? `🔵 Bluetooth ${cmd.args.state} kar diya` : `MacroDroid setup karo Bluetooth ke liye.`
    }
    case 'brightness': {
      await setBrightness(parseInt(cmd.args.level))
      return `☀️ Brightness ${cmd.args.level}% set kar di`
    }
    case 'volume': {
      await setVolume(parseInt(cmd.args.level))
      return `🔊 Volume ${cmd.args.level}% set kar diya`
    }
    case 'alarm': {
      const h = parseInt(cmd.args.hour), m = parseInt(cmd.args.minute)
      await setAlarm(h, m)
      return `⏰ Alarm set ho gaya ${h}:${String(m).padStart(2,'0')} ke liye`
    }
    case 'torch': {
      await flashlight(cmd.args.state as 'on' | 'off' | 'toggle')
      return `🔦 Torch ${cmd.args.state === 'off' ? 'band' : 'chalu'} kar diya`
    }
    case 'screenshot': {
      await takeScreenshot()
      return `📸 Screenshot le raha hoon...`
    }
    case 'maps':
      await openMaps(cmd.args.query)
      return `🗺️ Maps pe ${cmd.args.query} dhundh raha hoon...`
    default:
      return `Yeh command samajh nahi aaya`
  }
}

// ── MacroDroid Setup guide ─────────────────────────────
export const MACRODROID_SETUP = {
  macros: [
    { name: 'JARVIS_OpenApp',   trigger: 'HTTP Server: /macro?name=JARVIS_OpenApp',   action: 'Launch App by Variable' },
    { name: 'JARVIS_Call',      trigger: 'HTTP Server: /macro?name=JARVIS_Call',       action: 'Phone Call: {number}' },
    { name: 'JARVIS_Wifi',      trigger: 'HTTP Server: /macro?name=JARVIS_Wifi',       action: 'Toggle WiFi' },
    { name: 'JARVIS_Bluetooth', trigger: 'HTTP Server: /macro?name=JARVIS_Bluetooth',  action: 'Toggle Bluetooth' },
    { name: 'JARVIS_Brightness',trigger: 'HTTP Server: /macro?name=JARVIS_Brightness', action: 'Set Brightness: {level}%' },
    { name: 'JARVIS_Volume',    trigger: 'HTTP Server: /macro?name=JARVIS_Volume',     action: 'Set Volume: {level}%' },
    { name: 'JARVIS_Alarm',     trigger: 'HTTP Server: /macro?name=JARVIS_Alarm',      action: 'Set Alarm: {hour}:{minute}' },
    { name: 'JARVIS_Torch',     trigger: 'HTTP Server: /macro?name=JARVIS_Torch',      action: 'Toggle Flashlight' },
    { name: 'JARVIS_Screenshot',trigger: 'HTTP Server: /macro?name=JARVIS_Screenshot', action: 'Take Screenshot' },
    { name: 'JARVIS_Notify',    trigger: 'HTTP Server: /macro?name=JARVIS_Notify',     action: 'Notification: {title} - {body}' },
    { name: 'JARVIS_Speak',     trigger: 'HTTP Server: /macro?name=JARVIS_Speak',      action: 'Text To Speech: {text}' },
  ]
}
