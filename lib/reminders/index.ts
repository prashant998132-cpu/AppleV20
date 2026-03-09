// lib/reminders/index.ts — JARVIS Reminders v2 — recurring support

export interface Reminder {
  id: string
  message: string
  fireAt: number
  fired: boolean
  created: number
  repeat?: 'none' | 'daily' | 'weekly'
  repeatTime?: string  // "HH:MM"
}

const REM_KEY = 'jarvis_reminders_v2'

export function loadReminders(): Reminder[] {
  try {
    // Migrate from v1
    const v1 = localStorage.getItem('jarvis_reminders_v1')
    if (v1 && !localStorage.getItem(REM_KEY)) {
      const old = JSON.parse(v1)
      const migrated = old.map((r: any) => ({ ...r, repeat: 'none' }))
      localStorage.setItem(REM_KEY, JSON.stringify(migrated))
    }
    return JSON.parse(localStorage.getItem(REM_KEY) || '[]')
  } catch { return [] }
}

export function saveReminders(all: Reminder[]): void {
  localStorage.setItem(REM_KEY, JSON.stringify(all))
}

export function addReminder(message: string, fireAt: number, repeat: Reminder['repeat'] = 'none'): Reminder {
  const r: Reminder = { id: `rem_${Date.now()}`, message, fireAt, fired: false, created: Date.now(), repeat }
  if (repeat !== 'none') {
    const d = new Date(fireAt)
    r.repeatTime = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }
  saveReminders([...loadReminders(), r])
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller)
    navigator.serviceWorker.controller.postMessage({ type: 'SCHEDULE_REMINDER', reminder: r })
  return r
}

export function deleteReminder(id: string): void {
  saveReminders(loadReminders().filter(r => r.id !== id))
}

export function editReminder(id: string, updates: Partial<Reminder>): void {
  saveReminders(loadReminders().map(r => r.id === id ? { ...r, ...updates } : r))
}

export async function checkAndFireReminders(showToast: (m: string, t?: any) => void): Promise<void> {
  const now = Date.now()
  const all = loadReminders()
  let changed = false

  for (const r of all) {
    if (!r.fired && r.fireAt <= now) {
      // Fire notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('⏰ JARVIS', { body: r.message, icon: '/icon.svg', tag: r.id, requireInteraction: true })
      } else {
        showToast(`⏰ ${r.message}`, 'info')
      }

      if (r.repeat === 'none') {
        r.fired = true
      } else {
        // Schedule next occurrence
        const next = new Date()
        const [hh, mm] = (r.repeatTime || '08:00').split(':').map(Number)
        next.setHours(hh, mm, 0, 0)
        if (r.repeat === 'daily') {
          if (next.getTime() <= now) next.setDate(next.getDate() + 1)
        } else if (r.repeat === 'weekly') {
          if (next.getTime() <= now) next.setDate(next.getDate() + 7)
        }
        r.fireAt = next.getTime()
        // Don't mark fired — will fire again
      }
      changed = true
    }
  }

  if (changed) saveReminders(all.filter(r => !r.fired))
}

export async function requestNotifPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  return (await Notification.requestPermission()) === 'granted'
}

export function parseReminderTime(t: string): number {
  const now = Date.now(), low = t.toLowerCase()
  const minM = low.match(/(\d+)\s*(min|minute|मिनट)/)
  const hrM  = low.match(/(\d+)\s*(hour|hr|ghante|घंटे)/)
  const atM  = low.match(/(\d{1,2})[:\s.]?(\d{2})?\s*(am|pm|baje|बजे)?/)
  if (minM) return now + parseInt(minM[1]) * 60000
  if (hrM)  return now + parseInt(hrM[1]) * 3600000
  if (atM) {
    let h = parseInt(atM[1]), m = parseInt(atM[2] || '0')
    if (atM[3] === 'pm' && h < 12) h += 12
    if (atM[3] === 'am' && h === 12) h = 0
    const d = new Date(); d.setHours(h, m, 0, 0)
    if (d.getTime() < now) d.setDate(d.getDate() + 1)
    return d.getTime()
  }
  return now + 3600000
}

// Detect repeat pattern from text
export function parseRepeatPattern(t: string): Reminder['repeat'] {
  const low = t.toLowerCase()
  if (/har din|daily|roz|हर रोज|every day/.test(low)) return 'daily'
  if (/har week|weekly|every week|har hafte/.test(low)) return 'weekly'
  return 'none'
}
