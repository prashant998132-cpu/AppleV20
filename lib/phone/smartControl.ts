// lib/phone/smartControl.ts — Smart Layered Phone Control
// Layer 1: Web APIs (instant, no setup)
// Layer 2: Termux HTTP (optional, powerful)
// Layer 3: Intent URLs (always work)
// Layer 4: AI guidance (fallback)

import { makeCall, openSMS, openWhatsApp, openMaps, navigate, openUPI,
  vibrate, getBattery, getLocation, openCamera, keepScreenOn,
  releaseWakeLock, copyText, shareContent } from './webApis'
import { isTermuxAvailable, termuxRun } from '../termux/bridge'

export interface SmartResult {
  ok: boolean
  content: string
  method: 'web' | 'termux' | 'intent' | 'ai'
}

// ─── Smart Battery ─────────────────────────────────────────
export async function smartBattery(): Promise<SmartResult> {
  // Try Web Battery API first
  const bat = await getBattery()
  if (bat) {
    const icon = bat.level >= 60 ? '🟢' : bat.level >= 20 ? '🟡' : '🔴'
    const charge = bat.charging ? '⚡ Charging' : '🔋 Discharging'
    const time = bat.minutes > 0 ? ` · ~${bat.minutes} min remaining` : ''
    return { ok: true, method: 'web',
      content: `${icon} **${bat.level}%** — ${charge}${time}` }
  }
  // Try Termux
  if (await isTermuxAvailable()) {
    const r = await termuxRun('termux-battery-status')
    if (r.ok) {
      try {
        const d = JSON.parse(r.output)
        const pct = Math.round(d.percentage)
        const icon = pct >= 60 ? '🟢' : pct >= 20 ? '🟡' : '🔴'
        return { ok: true, method: 'termux',
          content: `${icon} **${pct}%** — ${d.status} · ${d.plugged}` }
      } catch { return { ok: true, method: 'termux', content: r.output } }
    }
  }
  return { ok: false, method: 'ai',
    content: '🔋 Battery dekho notification bar mein — ऊपर se swipe karo' }
}

// ─── Smart Location ────────────────────────────────────────
export async function smartLocation(): Promise<SmartResult> {
  // Web Geolocation (always works with permission)
  const loc = await getLocation()
  if (loc) {
    const mapsUrl = `https://maps.google.com/maps?q=${loc.lat},${loc.lon}`
    return { ok: true, method: 'web',
      content: `📍 **Location mili!**\n${loc.lat.toFixed(5)}, ${loc.lon.toFixed(5)} · ±${Math.round(loc.accuracy)}m\n\n[🗺️ Maps mein dekho](${mapsUrl})` }
  }
  // Termux fallback
  if (await isTermuxAvailable()) {
    const r = await termuxRun('termux-location -p gps -r once')
    if (r.ok) return { ok: true, method: 'termux', content: `📍 ${r.output}` }
  }
  return { ok: false, method: 'ai',
    content: '📍 Location ke liye:\n1. Browser location permission allow karo\n2. Ya Google Maps kholo: [Maps →](https://maps.google.com)' }
}

// ─── Smart Camera ──────────────────────────────────────────
export async function smartCamera(): Promise<SmartResult> {
  // Web Camera API
  return new Promise(res => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment'
    input.onchange = () => {
      const f = input.files?.[0]
      if (f) {
        const url = URL.createObjectURL(f)
        res({ ok: true, method: 'web',
          content: `PHOTO:${url}` })
      } else {
        res({ ok: false, method: 'ai', content: '📸 Photo nahi liya' })
      }
    }
    input.click()
  })
}

// ─── Smart Vibrate ─────────────────────────────────────────
export async function smartVibrate(pattern?: number[]): Promise<SmartResult> {
  const p = pattern || [200, 100, 200]
  if (vibrate(p)) {
    return { ok: true, method: 'web', content: '📳 Vibrated!' }
  }
  if (await isTermuxAvailable()) {
    const r = await termuxRun('termux-vibrate -d 500 -f')
    if (r.ok) return { ok: true, method: 'termux', content: '📳 Vibrated!' }
  }
  return { ok: false, method: 'ai', content: '📳 Vibration is device pe support nahi karta' }
}

// ─── Smart Torch ───────────────────────────────────────────
export async function smartTorch(on: boolean): Promise<SmartResult> {
  // Termux only (Web API nahi hai torch ke liye)
  if (await isTermuxAvailable()) {
    const r = await termuxRun(on ? 'termux-torch on' : 'termux-torch off')
    if (r.ok) return { ok: true, method: 'termux',
      content: on ? '🔦 Torch ON!' : '🔦 Torch OFF!' }
  }
  // Fallback: guide user
  return { ok: false, method: 'ai',
    content: on
      ? '🔦 **Torch:** Notification bar se swipe karo → Flashlight tap karo\n\n*Automatic ke liye Termux setup karo: type "termux setup"*'
      : '🔦 Torch band karo notification bar se' }
}

// ─── Smart Call ────────────────────────────────────────────
export function smartCall(number: string): SmartResult {
  makeCall(number)
  return { ok: true, method: 'intent',
    content: `📞 Calling **${number}**...` }
}

// ─── Smart WhatsApp ────────────────────────────────────────
export function smartWhatsApp(number?: string, message?: string): SmartResult {
  if (number) {
    openWhatsApp(number, message)
    return { ok: true, method: 'intent',
      content: `💚 WhatsApp: **${number}**${message ? `\n"${message}"` : ''}` }
  }
  window.open('https://wa.me', '_blank')
  return { ok: true, method: 'intent', content: '💚 WhatsApp khul raha hai...' }
}

// ─── Smart SMS ─────────────────────────────────────────────
export function smartSMS(number: string, message?: string): SmartResult {
  openSMS(number, message)
  return { ok: true, method: 'intent',
    content: `💬 SMS: **${number}**${message ? `\n"${message}"` : ''}` }
}

// ─── Smart Navigate ────────────────────────────────────────
export function smartNavigate(destination: string): SmartResult {
  navigate(destination)
  return { ok: true, method: 'intent',
    content: `🗺️ Navigation: **${destination}**` }
}

// ─── Smart UPI ─────────────────────────────────────────────
export function smartUPI(upiId: string, amount?: number, note?: string): SmartResult {
  const url = `upi://pay?pa=${upiId}${amount ? `&am=${amount}` : ''}${note ? `&tn=${encodeURIComponent(note)}` : ''}`
  window.location.href = url
  return { ok: true, method: 'intent',
    content: `💸 UPI: **${upiId}**${amount ? ` — ₹${amount}` : ''}` }
}

// ─── Smart Screen On ───────────────────────────────────────
export async function smartScreenOn(): Promise<SmartResult> {
  const ok = await keepScreenOn()
  if (ok) return { ok: true, method: 'web', content: '💡 Screen on rahegi!' }
  return { ok: false, method: 'ai',
    content: '💡 Wake Lock is browser mein support nahi karta. Chrome use karo.' }
}

// ─── Method badge ─────────────────────────────────────────
export function methodBadge(method: SmartResult['method']): string {
  const badges = {
    web: '🌐 Web API',
    termux: '📱 Termux',
    intent: '🔗 Direct',
    ai: '🤖 AI Guide'
  }
  return badges[method]
}
