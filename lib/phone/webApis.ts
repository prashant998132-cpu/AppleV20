// lib/phone/webApis.ts — Web APIs (no Termux, works in browser)

// ─── Contact Picker ───────────────────────────────────────
export async function pickContact(): Promise<{name:string;tel:string[]}|null> {
  if (!('contacts' in navigator)) return null
  try {
    const r = await (navigator as any).contacts.select(['name','tel'],{multiple:false})
    if (!r?.length) return null
    return { name: r[0].name?.[0]||'Unknown', tel: r[0].tel||[] }
  } catch { return null }
}
export const isContactPickerSupported = () =>
  typeof navigator !== 'undefined' && 'contacts' in navigator

// ─── Camera ───────────────────────────────────────────────
export function openCamera(): Promise<string|null> {
  return new Promise(res => {
    const i = document.createElement('input')
    i.type='file'; i.accept='image/*'; i.capture='environment'
    i.onchange = () => {
      const f = i.files?.[0]
      res(f ? URL.createObjectURL(f) : null)
    }
    i.click()
  })
}

// ─── Geolocation ──────────────────────────────────────────
export function getLocation(): Promise<{lat:number;lon:number;accuracy:number}|null> {
  return new Promise(res => {
    if (!navigator.geolocation) { res(null); return }
    navigator.geolocation.getCurrentPosition(
      p => res({lat:p.coords.latitude,lon:p.coords.longitude,accuracy:p.coords.accuracy}),
      ()=>res(null), {timeout:10000,enableHighAccuracy:true}
    )
  })
}

// ─── Wake Lock ────────────────────────────────────────────
let _wl: any = null
export async function keepScreenOn(): Promise<boolean> {
  if (!('wakeLock' in navigator)) return false
  try { _wl = await (navigator as any).wakeLock.request('screen'); return true }
  catch { return false }
}
export function releaseWakeLock() { _wl?.release().catch(()=>{}); _wl=null }
export const isWakeLockActive = () => !!_wl

// ─── Vibration ────────────────────────────────────────────
export const vibrate = (p: number|number[] = 200) => !!navigator.vibrate?.(p)

// ─── Battery ──────────────────────────────────────────────
export async function getBattery(): Promise<{level:number;charging:boolean;minutes:number}|null> {
  if (!('getBattery' in navigator)) return null
  try {
    const b = await (navigator as any).getBattery()
    return { level: Math.round(b.level*100), charging: b.charging,
      minutes: b.dischargingTime===Infinity ? -1 : Math.round(b.dischargingTime/60) }
  } catch { return null }
}

// ─── Network ──────────────────────────────────────────────
export function getNetworkInfo() {
  const c = (navigator as any).connection
  return { type: c?.effectiveType||'?', speed: c?.downlink?`${c.downlink}Mbps`:'?', online: navigator.onLine }
}

// ─── Share ────────────────────────────────────────────────
export async function shareContent(title:string,text:string,url?:string): Promise<boolean> {
  if (!navigator.share) return false
  try { await navigator.share({title,text,url}); return true } catch { return false }
}

// ─── Clipboard ────────────────────────────────────────────
export async function copyText(text:string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true }
  catch {
    try {
      const t=document.createElement('textarea'); t.value=text
      document.body.appendChild(t); t.select(); document.execCommand('copy')
      document.body.removeChild(t); return true
    } catch { return false }
  }
}
export const readClipboard = async () => {
  try { return await navigator.clipboard.readText() } catch { return null }
}

// ─── NFC ──────────────────────────────────────────────────
export async function scanNFC(): Promise<string|null> {
  if (!('NDEFReader' in window)) return null
  try {
    const r = new (window as any).NDEFReader()
    await r.scan()
    return new Promise(res => {
      r.onreading = (e:any) => res(new TextDecoder().decode(e.message.records[0]?.data))
      setTimeout(()=>res(null), 10000)
    })
  } catch { return null }
}

// ─── Intent URLs (always work) ────────────────────────────
export const makeCall    = (n:string) => { window.location.href=`tel:${n.replace(/\s/g,'')}` }
export const openSMS     = (n:string,b?:string) => {
  window.location.href=`sms:${n.replace(/\s/g,'')}${b?`?body=${encodeURIComponent(b)}`:''}`
}
export const openWhatsApp = (n:string,m?:string) => {
  const num=n.replace(/[\s+\-()]/g,'')
  window.open(`https://wa.me/${num}${m?`?text=${encodeURIComponent(m)}`:'`'}`, '_blank')
}
export const openEmail   = (to:string,s?:string,b?:string) => {
  window.location.href=`mailto:${to}?${s?`subject=${encodeURIComponent(s)}&`:''}${b?`body=${encodeURIComponent(b)}`:''}`
}
export const openMaps    = (q:string) => window.open(`https://maps.google.com/maps?q=${encodeURIComponent(q)}`,'_blank')
export const navigate    = (d:string) => window.open(`https://maps.google.com/maps?daddr=${encodeURIComponent(d)}`,'_blank')
export const openUPI     = (id:string,amt?:number,note?:string) => {
  window.location.href=`upi://pay?pa=${id}${amt?`&am=${amt}`:''}${note?`&tn=${encodeURIComponent(note)}`:''}`
}
