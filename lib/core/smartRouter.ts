// lib/core/smartRouter.ts — JARVIS Smart Routing Engine v1
// Credit-aware, limit-tracking, cost-optimized AI provider selection
// Never waste credits. Never hit rate limits. Never break.

export interface ProviderDef {
  id: string
  name: string
  model: string
  type: 'flash' | 'think' | 'image' | 'tts' | 'storage'
  endpoint: string
  authType: 'bearer' | 'query' | 'none' | 'client'
  keyEnv?: string            // server-side env var
  keyStorage?: string        // client localStorage key
  free: boolean
  creditType: 'free_tier' | 'free_forever' | 'paid' | 'user_owned'
  limits: {
    perMin?: number          // requests per minute
    perDay?: number          // requests per day
    tokensPerMin?: number
    tokensPerDay?: number
  }
  costPer1KTokens?: number   // USD. 0 = free
  priority: number           // lower = try first
  fallbackTo?: string        // next provider id if this fails
  notes: string
}

// ══════════════════════════════════════════════════════════
// PROVIDER REGISTRY
// ══════════════════════════════════════════════════════════
export const PROVIDERS: ProviderDef[] = [

  // ── FLASH CHAT ────────────────────────────────────────
  {
    id: 'groq_llama8b',
    name: 'Groq (Llama 3.1 8B)',
    model: 'llama-3.1-8b-instant',
    type: 'flash',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    authType: 'bearer', keyEnv: 'GROQ_API_KEY',
    free: true, creditType: 'free_tier',
    limits: { perMin: 30, perDay: 14400, tokensPerMin: 131072, tokensPerDay: 500000 },
    costPer1KTokens: 0,
    priority: 1,
    fallbackTo: 'groq_llama70b',
    notes: 'Fastest. 30 req/min, 500K tokens/day free. First choice always.',
  },
  {
    id: 'groq_llama70b',
    name: 'Groq (Llama 3.3 70B)',
    model: 'llama-3.3-70b-versatile',
    type: 'flash',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    authType: 'bearer', keyEnv: 'GROQ_API_KEY',
    free: true, creditType: 'free_tier',
    limits: { perMin: 30, perDay: 1000, tokensPerMin: 6000 },
    costPer1KTokens: 0,
    priority: 2,
    fallbackTo: 'together_llama70b',
    notes: 'Better quality. 1000 req/day free. Same Groq key.',
  },
  {
    id: 'together_llama70b',
    name: 'Together AI (Llama 3.1 70B)',
    model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    type: 'flash',
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    authType: 'bearer', keyEnv: 'TOGETHER_API_KEY',
    free: false, creditType: 'paid',
    limits: { perMin: 60 },
    costPer1KTokens: 0.0009,   // $0.0009/1K = very cheap
    priority: 3,
    fallbackTo: 'gemini_flash',
    notes: '$25 free credit one-time. Then $0.0009/1K tokens. ~27M tokens on free credit.',
  },
  {
    id: 'gemini_flash',
    name: 'Gemini 2.5 Flash',
    model: 'gemini-2.5-flash-preview-04-17',
    type: 'flash',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent',
    authType: 'query', keyEnv: 'GEMINI_API_KEY',
    free: true, creditType: 'free_tier',
    limits: { perMin: 15, perDay: 1500 },
    costPer1KTokens: 0,
    priority: 4,
    fallbackTo: 'puter_gpt4o',
    notes: '1500 req/day free. Used for deep-mode tools. 15 req/min.',
  },
  {
    id: 'puter_gpt4o',
    name: 'Puter (GPT-4o-mini)',
    model: 'gpt-4o-mini',
    type: 'flash',
    endpoint: 'client_puter',
    authType: 'client',      // runs in browser via puter.js
    free: true, creditType: 'user_owned',
    limits: {},               // Puter's own limits (generous)
    costPer1KTokens: 0,
    priority: 5,
    fallbackTo: undefined,
    notes: 'User\'s own Puter account. Free forever. Browser-side. Last resort.',
  },

  // ── THINK MODE ───────────────────────────────────────
  {
    id: 'deepseek_r1',
    name: 'DeepSeek R1 (OpenRouter)',
    model: 'deepseek/deepseek-r1',
    type: 'think',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    authType: 'bearer', keyEnv: 'OPENROUTER_API_KEY',
    free: false, creditType: 'paid',
    limits: {},
    costPer1KTokens: 0.55,   // $0.55/1M = cheapest reasoning model
    priority: 1,
    fallbackTo: 'gemini_flash_think',
    notes: 'Best reasoning/think model. $0.55/1M tokens. OpenRouter key.',
  },
  {
    id: 'gemini_flash_think',
    name: 'Gemini 2.5 Flash',
    model: 'gemini-2.5-flash-preview-04-17',
    type: 'think',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent',
    authType: 'query', keyEnv: 'GEMINI_API_KEY',
    free: true, creditType: 'free_tier',
    limits: { perMin: 10, perDay: 50 },
    costPer1KTokens: 0,
    priority: 2,
    fallbackTo: 'gemini_flash',
    notes: '50 req/day free think model. Gemini key.',
  },
  {
    id: 'puter_gpt4o_think',
    name: 'Puter (GPT-4o Think)',
    model: 'gpt-4o',
    type: 'think',
    endpoint: 'client_puter',
    authType: 'client',
    free: true, creditType: 'user_owned',
    limits: {},
    costPer1KTokens: 0,
    priority: 3,
    fallbackTo: undefined,
    notes: 'User Puter account. GPT-4o for complex reasoning.',
  },

  // ── IMAGE GENERATION ────────────────────────────────
  {
    id: 'puter_dalle3',
    name: 'Puter (DALL-E 3)',
    model: 'dall-e-3',
    type: 'image',
    endpoint: 'client_puter',
    authType: 'client',
    free: true, creditType: 'user_owned',
    limits: {},
    costPer1KTokens: 0,
    priority: 1,
    fallbackTo: 'pollinations_flux',
    notes: 'Puter DALL-E 3. Best quality. User\'s own account. First choice.',
  },
  {
    id: 'pollinations_flux',
    name: 'Pollinations.ai (Flux)',
    model: 'flux',
    type: 'image',
    endpoint: 'https://image.pollinations.ai/prompt/',
    authType: 'none',
    free: true, creditType: 'free_forever',
    limits: {},
    costPer1KTokens: 0,
    priority: 2,
    fallbackTo: 'pollinations_turbo',
    notes: '100% free forever. No key. Returns URL. No Vercel bandwidth.',
  },
  {
    id: 'pollinations_turbo',
    name: 'Pollinations.ai (Turbo)',
    model: 'turbo',
    type: 'image',
    endpoint: 'https://image.pollinations.ai/prompt/',
    authType: 'none',
    free: true, creditType: 'free_forever',
    limits: {},
    costPer1KTokens: 0,
    priority: 3,
    fallbackTo: undefined,
    notes: 'Faster lower quality. Same free tier.',
  },

  // ── STORAGE ─────────────────────────────────────────
  {
    id: 'puter_storage',
    name: 'Puter Cloud Storage',
    model: 'puter_fs',
    type: 'storage',
    endpoint: 'puter_fs',
    authType: 'client',
    free: true, creditType: 'user_owned',
    limits: {},  // 1GB free
    costPer1KTokens: 0,
    priority: 1,
    fallbackTo: 'indexeddb',
    notes: 'User 1GB FREE. All media goes here. ZERO Vercel bandwidth.',
  },
  {
    id: 'indexeddb',
    name: 'IndexedDB (Local)',
    model: 'indexeddb',
    type: 'storage',
    endpoint: 'browser_indexeddb',
    authType: 'none',
    free: true, creditType: 'free_forever',
    limits: {},  // ~50MB typical quota
    costPer1KTokens: 0,
    priority: 2,
    fallbackTo: undefined,
    notes: 'Chat + memory + metadata. Offline. No size limit for most browsers.',
  },
  {
    id: 'supabase',
    name: 'Supabase (PostgreSQL)',
    model: 'supabase',
    type: 'storage',
    endpoint: 'https://your-project.supabase.co',
    authType: 'bearer', keyStorage: 'SUPABASE_ANON_KEY',
    free: true, creditType: 'free_tier',
    limits: {},  // 500MB free, 2GB transfer/month
    costPer1KTokens: 0,
    priority: 3,
    fallbackTo: 'indexeddb',
    notes: 'Optional cross-device chat sync. 500MB free. No key = stays local only.',
  },
]

// ══════════════════════════════════════════════════════════
// SMART ROUTER — Credit-aware selection
// ══════════════════════════════════════════════════════════

// Daily usage tracking (localStorage, server-side Map)
const USAGE_KEY = 'jarvis_provider_usage'

interface UsageRecord { calls: number; tokens: number; date: string; cost: number }
type UsageMap = Record<string, UsageRecord>

export function getUsage(): UsageMap {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(USAGE_KEY) || '{}') } catch { return {} }
}

export function trackUsage(providerId: string, tokens = 500): void {
  if (typeof window === 'undefined') return
  try {
    const today = new Date().toISOString().slice(0, 10)
    const usage = getUsage()
    const cur = usage[providerId] || { calls: 0, tokens: 0, date: today, cost: 0 }
    if (cur.date !== today) { cur.calls = 0; cur.tokens = 0; cur.cost = 0; cur.date = today }
    const p = PROVIDERS.find(x => x.id === providerId)
    cur.calls++
    cur.tokens += tokens
    cur.cost += p ? (p.costPer1KTokens || 0) * (tokens / 1000) : 0
    usage[providerId] = cur
    localStorage.setItem(USAGE_KEY, JSON.stringify(usage))
  } catch {}
}

export function isProviderAvailable(p: ProviderDef): boolean {
  if (!p.limits.perDay) return true   // no daily limit
  const today = new Date().toISOString().slice(0, 10)
  const usage = getUsage()
  const cur = usage[p.id]
  if (!cur || cur.date !== today) return true
  return cur.calls < (p.limits.perDay - 5)   // -5 buffer
}

// Get best available provider for a task type + mode
export function getBestProvider(
  type: 'flash' | 'think' | 'image',
  availableKeys: Record<string, boolean>
): ProviderDef | null {
  const candidates = PROVIDERS
    .filter(p => p.type === type)
    .filter(p => {
      if (p.authType === 'client') return true   // always available
      if (p.authType === 'none') return true
      if (p.keyEnv) return availableKeys[p.keyEnv] === true
      if (p.keyStorage) return !!localStorage.getItem(`jarvis_key_${p.keyStorage}`)
      return false
    })
    .filter(p => isProviderAvailable(p))
    .sort((a, b) => a.priority - b.priority)
  return candidates[0] || null
}

// Total cost today (across all providers)
export function getDailyCost(): number {
  const usage = getUsage()
  const today = new Date().toISOString().slice(0, 10)
  return Object.values(usage).filter(u => u.date === today).reduce((s, u) => s + u.cost, 0)
}

// Reset daily stats
export function resetUsage(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(USAGE_KEY)
}

// Formatted summary for dashboard
export interface ProviderStatus {
  provider: ProviderDef
  available: boolean
  hasKey: boolean
  todayCalls: number
  todayTokens: number
  todayCost: number
  limitPct: number   // 0-100%
  status: 'ok' | 'warn' | 'limit' | 'nokey' | 'free'
}

export function getProviderStatuses(): ProviderStatus[] {
  const today = new Date().toISOString().slice(0, 10)
  const usage = getUsage()

  return PROVIDERS.map(p => {
    const cur = (usage[p.id]?.date === today) ? usage[p.id] : { calls: 0, tokens: 0, cost: 0, date: today }
    const hasKey = p.authType === 'client' || p.authType === 'none' ||
      (p.keyEnv ? (typeof process !== 'undefined' ? !!process.env[p.keyEnv] : false) : false) ||
      (p.keyStorage && typeof window !== 'undefined' ? !!localStorage.getItem(`jarvis_key_${p.keyStorage}`) : false)

    const limitPct = p.limits.perDay ? Math.min(100, (cur.calls / p.limits.perDay) * 100) : 0
    let status: ProviderStatus['status'] = 'ok'
    if (!hasKey) status = 'nokey'
    else if (limitPct >= 90) status = 'limit'
    else if (limitPct >= 70) status = 'warn'
    else if (p.creditType === 'free_forever') status = 'free'

    return {
      provider: p,
      available: hasKey && limitPct < 95,
      hasKey,
      todayCalls: cur.calls,
      todayTokens: cur.tokens,
      todayCost: cur.cost,
      limitPct,
      status,
    }
  })
}
