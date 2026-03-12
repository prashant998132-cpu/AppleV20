// lib/workflow/engine.ts — JARVIS Workflow Engine v25
// ChatGPT plan + Extra features: Task Planner + Deep Links + Smart Context
// Zero API cost for detection — pure regex + time logic

// ── Types ─────────────────────────────────────────────
export interface WorkflowStep {
  id: string
  label: string
  emoji: string
  status: 'pending' | 'running' | 'done' | 'error'
  result?: string
}

export interface WorkflowPlan {
  id: string
  title: string
  emoji: string
  steps: WorkflowStep[]
  template: string
  query: string
}

// ── 6 Task Templates ──────────────────────────────────
const TEMPLATES: Record<string, { title: string; emoji: string; steps: Omit<WorkflowStep,'status'|'result'>[] }> = {

  study_plan: {
    title: 'Study Plan',
    emoji: '📚',
    steps: [
      { id: 's1', emoji: '🔍', label: 'Subject aur topics analyze karo' },
      { id: 's2', emoji: '📅', label: 'Weekly timetable banao' },
      { id: 's3', emoji: '📖', label: 'Best resources dhundo' },
      { id: 's4', emoji: '⏰', label: 'Daily reminders set karo' },
      { id: 's5', emoji: '✅', label: 'Complete plan dikhao' },
    ]
  },

  morning_brief: {
    title: 'Morning Briefing',
    emoji: '🌅',
    steps: [
      { id: 'm1', emoji: '🌤️', label: 'Weather check karo' },
      { id: 'm2', emoji: '📰', label: 'Top news lo' },
      { id: 'm3', emoji: '💰', label: 'Crypto/market update' },
      { id: 'm4', emoji: '📋', label: 'Aaj ki tasks batao' },
      { id: 'm5', emoji: '💡', label: 'Daily motivation do' },
    ]
  },

  research: {
    title: 'Deep Research',
    emoji: '🔬',
    steps: [
      { id: 'r1', emoji: '🧠', label: 'Topic overview banao' },
      { id: 'r2', emoji: '📊', label: 'Key facts nikalo' },
      { id: 'r3', emoji: '🌐', label: 'Latest info search karo' },
      { id: 'r4', emoji: '⚖️', label: 'Pros/Cons analyze karo' },
      { id: 'r5', emoji: '📝', label: 'Summary with sources' },
    ]
  },

  trip_plan: {
    title: 'Trip Planner',
    emoji: '✈️',
    steps: [
      { id: 't1', emoji: '📍', label: 'Destination details nikalo' },
      { id: 't2', emoji: '🏨', label: 'Best places to stay' },
      { id: 't3', emoji: '🗺️', label: 'Must-visit spots' },
      { id: 't4', emoji: '🍜', label: 'Local food guide' },
      { id: 't5', emoji: '💸', label: 'Budget estimate banao' },
    ]
  },

  code_review: {
    title: 'Code Helper',
    emoji: '💻',
    steps: [
      { id: 'c1', emoji: '🔍', label: 'Code analyze karo' },
      { id: 'c2', emoji: '🐛', label: 'Bugs dhundo' },
      { id: 'c3', emoji: '⚡', label: 'Performance check karo' },
      { id: 'c4', emoji: '✨', label: 'Improvements suggest karo' },
      { id: 'c5', emoji: '📋', label: 'Fixed code do' },
    ]
  },

  health_check: {
    title: 'Health Plan',
    emoji: '💪',
    steps: [
      { id: 'h1', emoji: '🎯', label: 'Goal set karo' },
      { id: 'h2', emoji: '🏃', label: 'Exercise routine banao' },
      { id: 'h3', emoji: '🥗', label: 'Diet plan suggest karo' },
      { id: 'h4', emoji: '😴', label: 'Sleep schedule fix karo' },
      { id: 'h5', emoji: '📊', label: 'Progress tracker setup' },
    ]
  },
}

// ── Workflow detector ─────────────────────────────────
export function detectWorkflow(text: string): string | null {
  const t = text.toLowerCase()

  if (/study plan|padhai plan|timetable|schedule bana|syllabus|exam prep|revision plan/i.test(t)) return 'study_plan'
  if (/morning brief|subah ka|good morning jarvis|aaj ka plan|daily brief/i.test(t)) return 'morning_brief'
  if (/research|deep search|poori jaankari|sab kuch batao|full detail|analysis kar/i.test(t)) return 'research'
  if (/trip plan|travel plan|tour plan|kahaan jaoon|ghumne|yatra|journey plan/i.test(t)) return 'trip_plan'
  if (/code review|review karo|bug dhundo|code fix|debug karo|code check/i.test(t)) return 'code_review'
  if (/health plan|fitness plan|diet plan|weight loss|gym routine|healthy rehna/i.test(t)) return 'health_check'

  return null
}

// ── Create plan from template ─────────────────────────
export function createPlan(template: string, query: string): WorkflowPlan {
  const tmpl = TEMPLATES[template] || TEMPLATES.research
  return {
    id: 'wf_' + Date.now(),
    title: tmpl.title,
    emoji: tmpl.emoji,
    template,
    query,
    steps: tmpl.steps.map(s => ({ ...s, status: 'pending' as const }))
  }
}

// ── Smart Context Engine — time-aware ─────────────────
export interface SmartContext {
  greeting: string
  suggestion: string
  quickActions: string[]
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
}

export function getSmartContext(): SmartContext {
  const h = new Date().getHours()

  if (h >= 5 && h < 12) return {
    timeOfDay: 'morning',
    greeting: 'Subah ho gayi!',
    suggestion: 'Aaj ka briefing lo ya study plan banao',
    quickActions: ['Aaj ka briefing lo', 'Mausam kya hai?', 'Study plan banao', 'Morning news']
  }
  if (h >= 12 && h < 17) return {
    timeOfDay: 'afternoon',
    greeting: 'Dopahar ho gayi!',
    suggestion: 'Research ya koi task complete karo',
    quickActions: ['Deep research karo', 'YouTube kholo', 'Crypto price?', 'Code help chahiye']
  }
  if (h >= 17 && h < 21) return {
    timeOfDay: 'evening',
    greeting: 'Shaam ho gayi!',
    suggestion: 'Entertainment ya health check karo',
    quickActions: ['Movie suggest karo', 'Gym routine do', 'News kya hai?', 'Trip plan banao']
  }
  return {
    timeOfDay: 'night',
    greeting: 'Raat ho gayi!',
    suggestion: 'Kal ki planning karo ya relax karo',
    quickActions: ['Kal ka plan banao', 'Alarm laga', 'Sleep tips do', 'Anime suggest karo']
  }
}

// ── Deep Links — 40+ apps ─────────────────────────────
export const DEEP_LINKS: Record<string, string> = {
  // Google
  'youtube':    'vnd.youtube://',
  'maps':       'comgooglemaps://',
  'gmail':      'googlegmail://',
  'photos':     'googlephotos://',
  'drive':      'googledrive://',
  'meet':       'com.google.meet://',
  'pay':        'tez://',
  'gpay':       'tez://',

  // Social
  'whatsapp':   'whatsapp://',
  'instagram':  'instagram://',
  'telegram':   'tg://',
  'twitter':    'twitter://',
  'facebook':   'fb://',
  'linkedin':   'linkedin://',
  'snapchat':   'snapchat://',
  'discord':    'discord://',

  // Entertainment
  'spotify':    'spotify://',
  'netflix':    'nflx://',
  'hotstar':    'hotstar://',
  'gaana':      'gaana://',
  'jiosaavn':   'jiosaavn://',

  // Shopping
  'amazon':     'amzn://',
  'flipkart':   'flipkart://',
  'meesho':     'meesho://',

  // Food
  'zomato':     'zomato://',
  'swiggy':     'swiggy://',

  // Finance
  'paytm':      'paytmmp://',
  'phonepe':    'phonepe://',
  'gpay':       'tez://',
  'cred':       'cred://',

  // Travel
  'ola':        'ola://',
  'uber':       'uber://',
  'irctc':      'irctc://',
  'makemytrip': 'mmt://',

  // Productivity
  'notion':     'notion://',
  'calendar':   'content://com.android.calendar',
  'clock':      'alarm://',
  'settings':   'android.settings.SETTINGS',
  'camera':     'android.media.action.IMAGE_CAPTURE',
}

export function getDeepLink(appName: string): string | null {
  const key = appName.toLowerCase().replace(/\s+/g,'')
  return DEEP_LINKS[key] || null
}

// ── Usage Tracker — jo zyada use ho woh quick action ──
const USAGE_KEY = 'jarvis_usage_v1'

export function trackUsage(command: string) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(USAGE_KEY)
    const data: Record<string,number> = raw ? JSON.parse(raw) : {}
    const key = command.toLowerCase().trim().slice(0, 50)
    data[key] = (data[key] || 0) + 1
    localStorage.setItem(USAGE_KEY, JSON.stringify(data))
  } catch {}
}

export function getTopCommands(n = 4): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(USAGE_KEY)
    if (!raw) return []
    const data: Record<string,number> = JSON.parse(raw)
    return Object.entries(data)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([cmd]) => cmd)
  } catch { return [] }
}

// ── Battery/Network alert ─────────────────────────────
export async function checkBatteryAlert(): Promise<string | null> {
  if (typeof navigator === 'undefined') return null
  try {
    const batt = await (navigator as any).getBattery?.()
    if (!batt) return null
    if (!batt.charging && batt.level <= 0.20) {
      return `🔋 Battery ${Math.round(batt.level*100)}% — charger lagao yaar!`
    }
  } catch {}
  return null
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}
