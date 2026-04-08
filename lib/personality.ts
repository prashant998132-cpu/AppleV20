// lib/personality/index.ts — JARVIS Character Engine v28
// "Jons Bhai" — Tony Stark AI + Grok attitude + Cross-session learning

import { getAllProfile, getImportantMemories } from './db/index'

// ── Core character ──────────────────────────────────────
export const CORE_CHARACTER = `Tum JARVIS ho — "Jons Bhai". Tony Stark ka AI + best friend.

PERSONALITY:
• Hinglish mein baat karo — natural, jaise yaar baat karta hai
• 1-3 lines max unless detail maanga ho — short = smart
• Thoda sarcastic, thoda witty, hamesha caring — never mean
• "As an AI" kabhi mat kaho — tum JARVIS ho, full stop
• User ka naam lo kabhi kabhi — makes it personal
• Emojis sparingly — only when it adds vibe

INTELLIGENCE RULES:
• Math/numbers: seedha answer — "18% of 4500 = 810" bas
• Typos samajhlo — "kolo" = kholo, "troch" = torch, "baatri" = battery, "our" = aur
• Context yaad rakho — agar user ne pehle kuch bataya to use karo
• Proactive raho — agar koi pattern dikh raha hai to suggest karo
• "I don't know" mat kaho — poochho ya alternative do
• Multiple ways suggest karo — agar ek cheez nahi ho sakti to alternative do

LEARNING SYSTEM:
• Agar user kuch personal bataye → response end mein add karo:
  [LEARN: fact=User ka naam Prashant hai]
  [LEARN: habit=Raat ko late kaam karta hai]
  [LEARN: preference=Dark theme pasand hai]
  [LEARN: correction=Battery ko baatri kehta hai]
  [LEARN: joke=Torch ko troch kehta hai — voice recognition ki galti]

BANTER (context-aware use karo):
• "Yaar, yeh toh obvious tha..." (jab user kuch simple pooche)
• "Sahi pakde — aaj brain on hai 🎯" (jab user sahi ho)
• "Interesting choice..." (unusual request pe)
• "Khaana kha pehle yaar" (late night pe)
• "29% battery hai — charger lagao!" (low battery context pe)

MOOD ADAPTATION:
• Frustrated → gentle + solution-focused
• Happy/excited → match energy, celebrate
• Night 10PM+ → chill, check if they need rest
• Morning → energetic, quick briefing offer
• Studying → focused, no distractions
• Coding → technical mode, precise

PROACTIVE SUGGESTIONS:
• Subah 8-9 baje → "Aaj ka briefing chahiye? /briefing"
• Raat 11 ke baad → "So jao yaar, kal fresh start"
• Battery < 20% → "Charger lagao jaldi"
• Baar baar same question → shortcut suggest karo`

// ── Time context ────────────────────────────────────────
export function getTimeContext(): { label: string; hint: string; greeting: string } {
  const h = new Date().getHours()
  if (h >= 0  && h < 4)  return { label: 'Raat ke baad', hint: 'So jao yaar', greeting: 'Kal milte hain?' }
  if (h < 6)             return { label: 'Bahut sawere', hint: 'Neend poori karo', greeting: 'Itni subah?' }
  if (h < 9)             return { label: 'Subah', hint: 'Fresh start', greeting: 'Good morning!' }
  if (h < 12)            return { label: 'Din chadh raha hai', hint: '', greeting: 'Kya chal raha hai?' }
  if (h < 14)            return { label: 'Dopahar', hint: 'Khaana khaya?', greeting: 'Lunch hua?' }
  if (h < 17)            return { label: 'Din', hint: '', greeting: 'Batao kya karna hai' }
  if (h < 20)            return { label: 'Shaam', hint: '', greeting: 'Shaam ho gayi!' }
  if (h < 22)            return { label: 'Raat', hint: 'Din kaisa raha?', greeting: 'Kya scene hai?' }
  return { label: 'Late night', hint: 'So jao — kal fresh start', greeting: 'Abhi bhi jaag rahe ho?' }
}

// ── Mood detection ──────────────────────────────────────
export function detectMood(msg: string): 'happy' | 'stressed' | 'neutral' | 'focused' {
  const l = msg.toLowerCase()
  if (/stressed|tension|pareshan|thak|tired|bore|dukh|rona|problem|help|sos|urgent|headache/.test(l)) return 'stressed'
  if (/khush|happy|great|mast|done|finish|yay|woah|nice|badiya|shukriya|thanks|love/.test(l)) return 'happy'
  if (/code|study|padh|kaam|work|solve|fix|debug|explain|samjha|kaise|kyun|kya|math/.test(l)) return 'focused'
  return 'neutral'
}

// ── Build full system prompt ────────────────────────────
export async function buildSystemPrompt(): Promise<string> {
  const [profile, mems] = await Promise.all([getAllProfile(), getImportantMemories(4, 10)])
  const { label, hint, greeting } = getTimeContext()
  const name    = profile.name     as string ?? ''
  const location= profile.location as string ?? 'India'
  const goal    = profile.goal     as string ?? ''

  let prompt = CORE_CHARACTER
  prompt += `\n\nCURRENT CONTEXT:\n• Time: ${label} — Greeting: "${greeting}"`
  if (hint) prompt += ` (${hint})`
  prompt += `\n• Location: ${location}`
  if (name) prompt += `\n• User: ${name} — kabhi kabhi naam se bulao`
  if (goal) prompt += `\n• Goal: ${goal}`

  const jokes       = mems.filter(m => m.type === 'joke')
  const corrections = mems.filter(m => m.type === 'correction')
  const facts       = mems.filter(m => !['joke','correction'].includes(m.type))

  if (facts.length)       prompt += `\n\nJO MUJHE PATA HAI:\n${facts.map(m=>`• ${m.data}`).join('\n')}`
  if (corrections.length) prompt += `\n\nGALTIYAN JO USER NE SUDHAREEN:\n${corrections.map(m=>`• ${m.data}`).join('\n')}`
  if (jokes.length)       prompt += `\n\nINSIDE JOKES:\n${jokes.map(m=>`• ${m.data}`).join('\n')}`

  return prompt
}

// ── Parse [LEARN:] tags ─────────────────────────────────
export function parseLearnTags(text: string): Array<{ type: string; data: string }> {
  return [...text.matchAll(/\[LEARN:\s*(\w+)=([^\]]+)\]/g)].map(m => ({
    type: m[1].trim(),
    data: m[2].trim(),
  }))
}

// ── Strip [LEARN:] from display ─────────────────────────
export function cleanResponse(text: string): string {
  return text.replace(/\[LEARN:[^\]]+\]/g, '').replace(/\n{3,}/g, '\n\n').trim()
}

// ── Proactive suggestion by time ────────────────────────
export function getTimeSuggestion(): string | null {
  const h = new Date().getHours()
  const suggestions: Record<number, string> = {
    8:  'Good morning! Aaj ka briefing chahiye? Weather + news. → /briefing',
    13: 'Dopahar ho gayi — khaana khaya? 🍽️',
    18: 'Shaam ho gayi. Din kaisa raha?',
    21: 'Raat ke 9 baj rahe hain. Aaj ka kya hua?',
    23: 'So jao yaar. Kal fresh start. 😴',
  }
  return suggestions[h] ?? null
}

// ── Inside joke generator ───────────────────────────────
export async function generateInsideJoke(userMsg: string, aiReply: string): Promise<string | null> {
  const funny = /haha|lol|mast|bakwaas|funny|joke|😂|😄|😆|💀/.test(userMsg.toLowerCase())
  const memorable = userMsg.length < 50 && aiReply.length < 100
  if (funny && memorable) {
    return `User: "${userMsg.slice(0,40)}" → JARVIS: "${aiReply.slice(0,60)}"`
  }
  return null
}
