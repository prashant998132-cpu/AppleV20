// lib/rateLimit.ts — JARVIS Client-Side Rate Limiter v25
// Vercel free tier: 100GB bandwidth, 100K function invocations/month
// Yeh limiter client-side hai — API calls track karta hai per day/minute

const KEYS = {
  daily:  'jarvis_rl_daily_v1',   // { date: "2025-01-01", counts: {groq:0, gemini:0, puter:0} }
  minute: 'jarvis_rl_minute_v1',  // { minute: 123456789, count: 0 }
}

// Limits per provider per day
const DAILY_LIMITS: Record<string, number> = {
  groq:    100,   // Groq free: 14400/day but conserve
  gemini:  50,    // Gemini free: 1500/day
  puter:   9999,  // Puter unlimited
  flash:   200,   // flash = fast path
  think:   20,    // think = expensive
  deep:    30,    // deep = tools
}

const MINUTE_LIMIT = 10 // max 10 requests per minute total

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function currentMinute(): number {
  return Math.floor(Date.now() / 60000)
}

function getDailyData(): { date: string; counts: Record<string, number> } {
  try {
    const raw = localStorage.getItem(KEYS.daily)
    if (!raw) return { date: today(), counts: {} }
    const d = JSON.parse(raw)
    if (d.date !== today()) return { date: today(), counts: {} } // reset daily
    return d
  } catch { return { date: today(), counts: {} } }
}

function getMinuteData(): { minute: number; count: number } {
  try {
    const raw = localStorage.getItem(KEYS.minute)
    if (!raw) return { minute: currentMinute(), count: 0 }
    const d = JSON.parse(raw)
    if (d.minute !== currentMinute()) return { minute: currentMinute(), count: 0 }
    return d
  } catch { return { minute: currentMinute(), count: 0 } }
}

// Check if request allowed
export function canRequest(provider: string = 'groq'): { allowed: boolean; reason?: string; remaining?: number } {
  try {
    // Minute rate check
    const minData = getMinuteData()
    if (minData.count >= MINUTE_LIMIT) {
      return { allowed: false, reason: `${MINUTE_LIMIT} requests/minute limit — 1 minute ruko!`, remaining: 0 }
    }

    // Daily limit check
    const dayData = getDailyData()
    const used = dayData.counts[provider] || 0
    const limit = DAILY_LIMITS[provider] || 100
    if (used >= limit) {
      return { allowed: false, reason: `${provider} daily limit (${limit}) khatam — Puter se chalega!`, remaining: 0 }
    }

    return { allowed: true, remaining: limit - used }
  } catch { return { allowed: true } }
}

// Record a request
export function recordRequest(provider: string = 'groq') {
  try {
    // Update daily
    const dayData = getDailyData()
    dayData.counts[provider] = (dayData.counts[provider] || 0) + 1
    localStorage.setItem(KEYS.daily, JSON.stringify(dayData))

    // Update minute
    const minData = getMinuteData()
    minData.count += 1
    localStorage.setItem(KEYS.minute, JSON.stringify(minData))
  } catch {}
}

// Get usage stats for dashboard
export interface UsageStats {
  date: string
  providers: { name: string; used: number; limit: number; pct: number }[]
  minuteUsed: number
  minuteLimit: number
  totalToday: number
  vercelCallsEstimate: number
}

export function getUsageStats(): UsageStats {
  const dayData = getDailyData()
  const minData = getMinuteData()
  const providers = Object.entries(DAILY_LIMITS).map(([name, limit]) => ({
    name,
    used: dayData.counts[name] || 0,
    limit,
    pct: Math.round(((dayData.counts[name] || 0) / limit) * 100)
  }))
  const totalToday = Object.values(dayData.counts).reduce((a, b) => a + b, 0)
  return {
    date: dayData.date,
    providers,
    minuteUsed: minData.count,
    minuteLimit: MINUTE_LIMIT,
    totalToday,
    vercelCallsEstimate: totalToday, // each AI call = 1 Vercel function call
  }
}

// Reset (for testing)
export function resetLimits() {
  localStorage.removeItem(KEYS.daily)
  localStorage.removeItem(KEYS.minute)
}
