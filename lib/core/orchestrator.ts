// lib/core/orchestrator.ts
// ══════════════════════════════════════════════════════════════
// JARVIS Brain Router v2
// Decide karta hai kaunsa LLM use hoga
// Simple   → Groq (fastest, free)
// Reasoning→ DeepSeek R1 (thinking)
// Tools    → Gemini 2.0 Flash (web/tools)
// Image    → Pollinations (no key)
// Fallback → Browser (offline)
// ══════════════════════════════════════════════════════════════

export type ModelChoice = 'groq' | 'deepseek' | 'gemini' | 'gemini-deep' | 'browser'

export interface RouteDecision {
  model:       ModelChoice
  reason:      string
  streaming:   boolean
  toolsEnabled:boolean
  endpoint:    string
}

// ─── Query classifier ─────────────────────────────────────
function classifyQuery(msg: string): {
  needsTools: boolean; needsReasoning: boolean; isSimple: boolean; isImage: boolean; isMath: boolean; isCode: boolean
} {
  const m = msg.toLowerCase()

  const isImage = /(?:image|photo|pic|draw|generate|banao|dikhao|wallpaper|logo|poster)/i.test(msg)

  const isMath = /(?:\d+[\+\-\*\/\^%]\d+|integral|derivative|solve|equation|calculate|compute|proof|theorem|matrix|vector|probability)/i.test(msg)

  const isCode = /(?:code|function|class|bug|error|debug|script|python|javascript|typescript|sql|api|implement|algorithm)/i.test(msg)

  const needsReasoning = isMath || isCode || 
    /(?:why|explain deeply|analyze|compare|difference between|pros cons|should i|decision|strategy|sochke|sochkar|deeply)/i.test(msg) ||
    msg.split(' ').length > 40

  const needsTools = /(?:weather|mausam|news|search|find|latest|current|today|price|stock|website|url|http|www|lookup|reddit|tweet)/i.test(msg) ||
    /(?:calculate|timer|reminder|alarm|schedule|calendar|date|time|kya baja|time kya)/i.test(msg)

  const isSimple = !needsTools && !needsReasoning && msg.split(' ').length < 20

  return { needsTools, needsReasoning, isSimple, isImage, isMath, isCode }
}

// ─── Key availability ─────────────────────────────────────
function hasKey(name: string): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem(`jarvis_key_${name}`) ||
         !!process.env[name] || 
         !!process.env[`NEXT_PUBLIC_${name}`]
}

// ─── Main router ──────────────────────────────────────────
export function routeQuery(msg: string, forceMode?: 'flash' | 'deep'): RouteDecision {
  
  // Explicit overrides
  if (forceMode === 'deep') {
    return {
      model: 'gemini-deep', reason: 'User-forced deep mode', streaming: true,
      toolsEnabled: true, endpoint: '/api/jarvis/deep-stream',
    }
  }

  const { needsTools, needsReasoning, isSimple } = classifyQuery(msg)

  // Tools needed → Gemini (has function calling)
  if (needsTools) {
    return {
      model: 'gemini-deep', reason: 'Tools/search required',
      streaming: true, toolsEnabled: true, endpoint: '/api/jarvis/deep-stream',
    }
  }

  // Deep reasoning → try DeepSeek R1, fallback to Gemini
  if (needsReasoning) {
    return {
      model: 'deepseek', reason: 'Reasoning/math/code query',
      streaming: true, toolsEnabled: false, endpoint: '/api/jarvis/stream',
    }
  }

  // Simple chat → Groq (fastest)
  return {
    model: 'groq', reason: 'Simple conversational query',
    streaming: true, toolsEnabled: false, endpoint: '/api/jarvis/stream',
  }
}

// ─── Token estimator ──────────────────────────────────────
export function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3)
}

// ─── Context manager — trim chat history smartly ──────────
export function trimContext(
  messages: { role: string; content: string }[],
  maxTokens = 3000
): { role: string; content: string }[] {
  let total = 0
  const result: { role: string; content: string }[] = []

  // Always keep system message
  const system = messages.find(m => m.role === 'system')

  // Reverse iterate (keep recent messages)
  const history = messages.filter(m => m.role !== 'system').reverse()

  for (const msg of history) {
    const tokens = estimateTokens(msg.content)
    if (total + tokens > maxTokens) break
    result.unshift(msg)
    total += tokens
  }

  // Ensure at least 1 message (the user query)
  if (!result.length && history.length) result.push(history[0])

  return system ? [system, ...result] : result
}

// ─── Battery-aware degradation ────────────────────────────
export async function getBatteryMode(): Promise<'normal' | 'low' | 'critical'> {
  try {
    const nav = navigator as any
    if (!nav.getBattery) return 'normal'
    const battery = await nav.getBattery()
    if (battery.level < 0.1 && !battery.charging) return 'critical'
    if (battery.level < 0.2 && !battery.charging) return 'low'
    return 'normal'
  } catch { return 'normal' }
}

// When battery critical → use simplest model, no streaming
export async function routeWithBattery(msg: string, forceMode?: 'flash' | 'deep'): Promise<RouteDecision> {
  const base = routeQuery(msg, forceMode)
  const battery = await getBatteryMode()

  if (battery === 'critical') {
    return { ...base, model: 'groq', toolsEnabled: false, reason: 'Battery critical — using fastest model', endpoint: '/api/jarvis/stream' }
  }
  if (battery === 'low' && base.toolsEnabled) {
    return { ...base, toolsEnabled: false, reason: 'Battery low — tools disabled' }
  }

  return base
}
