// lib/proactive/engine.ts — Proactive Intelligence Engine
// JARVIS acts without being asked — habit detection, summaries, suggestions

import { getSetting, setSetting, getTodayChats, addMemory, buildMemoryContext } from '../db'
import { getTimeSuggestion } from '../personality'

export interface ProactiveEvent {
  type: 'suggestion' | 'reminder' | 'summary' | 'habit_tip'
  message: string
  priority: 'high' | 'medium' | 'low'
  action?: string
}

// ── Track habits from message ──────────────────────────────
export async function trackHabit(message: string): Promise<void> {
  const l = message.toLowerCase()
  const patterns = [
    { r: /code|coding|debug|programming|react|python|js/, habit: 'coding' },
    { r: /padh|study|chapter|notes|revision/, habit: 'studying' },
    { r: /khaana|khana|food|dinner|lunch|breakfast/, habit: 'meal_tracking' },
    { r: /gym|exercise|walk|run|yoga|workout/, habit: 'exercise' },
    { r: /rewa|raipur/, habit: 'location_rewa' },
  ]
  for (const p of patterns) {
    if (p.r.test(l)) {
      await addMemory('habit', `Regular ${p.habit}`, 3)
      break
    }
  }
}

// ── Check for proactive event ──────────────────────────────
export async function checkProactive(): Promise<ProactiveEvent | null> {
  if (typeof window === 'undefined') return null
  const now = Date.now()
  const today = new Date().toDateString()

  // 1. Fired reminders
  try {
    const rems = JSON.parse(localStorage.getItem('jarvis_reminders_v1') || '[]')
    const due = rems.filter((r: any) => !r.fired && r.fireAt <= now)
    if (due.length > 0) return { type: 'reminder', message: `⏰ ${due[0].message}`, priority: 'high' }
  } catch {}

  // 2. Daily summary (9 PM, once/day)
  const h = new Date().getHours()
  if (h === 21) {
    const lastSum = await getSetting('last_summary_date', '')
    if (lastSum !== today) {
      const chats = await getTodayChats()
      if (chats.length >= 3) {
        await setSetting('last_summary_date', today)
        return { type: 'summary', message: `Aaj ${chats.length} conversations hui — daily summary banata hun?`, priority: 'medium', action: 'daily_summary' }
      }
    }
  }

  // 3. Time-based suggestion (max once per 2 hrs)
  const lastSug = Number(await getSetting('last_suggestion_ms', 0))
  if (now - lastSug > 7_200_000) {
    const sug = getTimeSuggestion()
    if (sug) {
      await setSetting('last_suggestion_ms', now)
      return { type: 'suggestion', message: sug, priority: 'low' }
    }
  }

  // 4. Habit tip (after detecting coding for 2+ hours)
  const codingChats = await getTodayChats()
  const codingCount = codingChats.filter(c => c.role === 'user' && /code|debug|error|fix/.test(c.content.toLowerCase())).length
  if (codingCount >= 5) {
    const lastTip = Number(await getSetting('last_eye_tip', 0))
    if (now - lastTip > 3_600_000) {
      await setSetting('last_eye_tip', now)
      return { type: 'habit_tip', message: 'Bahut der se code kar rahe ho — 20-20-20 rule: 20 sec ke liye 20 feet door dekho. 👀', priority: 'low' }
    }
  }

  return null
}

// ── Generate daily summary ─────────────────────────────────
export async function generateDailySummary(): Promise<string> {
  const chats = await getTodayChats()
  if (chats.length < 3) return 'Aaj zyaada baat nahi hui. Kal better karte hain! 💪'
  const userMsgs = chats.filter(c => c.role === 'user').map(c => c.content.slice(0, 80)).join('; ')
  const gemKey = typeof window !== 'undefined' ? localStorage.getItem('jarvis_key_GEMINI_API_KEY') : null
  if (!gemKey) return `Aaj ${chats.length} conversations huin. Productive din raha! ⚡`
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gemKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `User ki aaj ki conversations ka witty Hinglish summary likho — 3 lines mein:\n${userMsgs}` }] }], generationConfig: { temperature: 0.9, maxOutputTokens: 150 } }),
      signal: AbortSignal.timeout(8000),
    })
    const d = await res.json()
    return d.candidates?.[0]?.content?.parts?.[0]?.text || `Din mast raha! ${chats.length} baatein huin. 🎯`
  } catch {
    return `Aaj ${chats.length} conversations huin. Din productive raha! 🎯`
  }
}
