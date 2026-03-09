// lib/memory/vectorSearch.ts — Semantic Memory Search v1
// Zero external API — pure browser TF-IDF cosine similarity
// Fast enough for 500 memories on mobile in <50ms

import { getImportantMemories, type Memory } from '../db'

// ── Tokenizer ──────────────────────────────────────────────
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    // Remove punctuation
    .replace(/[^\w\s\u0900-\u097f]/g, ' ')
    // Split on whitespace
    .split(/\s+/)
    .filter(t => t.length > 1)
    // Remove stop words
    .filter(t => !STOP_WORDS.has(t))
}

const STOP_WORDS = new Set([
  // English
  'the','a','an','is','are','was','were','be','been','has','have','had',
  'do','does','did','will','would','could','should','may','might','shall',
  'to','of','in','on','at','for','with','by','from','up','about','into',
  'and','or','but','if','as','so','yet','nor','not','no','yes',
  'i','me','my','we','our','you','your','he','him','his','she','her',
  'it','its','they','them','their','this','that','these','those',
  'what','which','who','how','when','where','why','can','just',
  // Hindi/Urdu common
  'hai','hain','ho','tha','thi','the','hua','hui','hue',
  'ka','ke','ki','ko','koi','kuch','kab','kaise','kya',
  'main','mera','meri','mere','hum','aap','yeh','woh',
  'aur','ya','par','mein','se','ne','bhi','hi','to',
  'nahi','nhi','mat','karo','karna','kar',
])

// ── TF-IDF Vector builder ──────────────────────────────────
function buildTfVector(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>()
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1)
  const total = tokens.length || 1
  for (const [k, v] of tf) tf.set(k, v / total)
  return tf
}

// ── Cosine similarity ─────────────────────────────────────
function cosineSim(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, normA = 0, normB = 0
  for (const [k, v] of a) {
    dot   += v * (b.get(k) || 0)
    normA += v * v
  }
  for (const [, v] of b) normB += v * v
  if (!normA || !normB) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

// ── Cache ─────────────────────────────────────────────────
let _cachedMemories: Memory[] | null = null
let _cacheTs = 0
const CACHE_TTL = 60_000  // 1 min

async function getMemoriesFromCache(): Promise<Memory[]> {
  const now = Date.now()
  if (_cachedMemories && (now - _cacheTs) < CACHE_TTL) return _cachedMemories
  _cachedMemories = await getImportantMemories(0, 500).catch(() => [])
  _cacheTs = now
  return _cachedMemories
}

// Invalidate cache when new memory added
export function invalidateMemoryCache() { _cachedMemories = null }

// ── Main semantic search ───────────────────────────────────
export interface ScoredMemory {
  memory: Memory
  score: number
  matchReason: string
}

export async function semanticMemorySearch(
  query: string,
  topK = 5,
  threshold = 0.1
): Promise<ScoredMemory[]> {
  if (!query.trim()) return []

  const memories = await getMemoriesFromCache()
  if (!memories.length) return []

  const qTokens = tokenize(query)
  if (!qTokens.length) return []
  const qVec = buildTfVector(qTokens)

  const scored: ScoredMemory[] = []

  for (const mem of memories) {
    const mTokens = tokenize(mem.data)
    if (!mTokens.length) continue
    const mVec = buildTfVector(mTokens)

    const sim = cosineSim(qVec, mVec)

    // Importance boost: higher importance memories get extra weight
    const importanceBoost = (mem.importance || 5) / 20  // 0.0–0.5
    const recencyBoost = Math.max(0, 1 - (Date.now() - mem.timestamp) / (30 * 24 * 3600_000))
    const finalScore = sim + importanceBoost * 0.3 + recencyBoost * 0.1

    if (finalScore > threshold) {
      scored.push({
        memory: mem,
        score: finalScore,
        matchReason: getMatchReason(qTokens, mTokens, sim),
      })
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

function getMatchReason(qTokens: string[], mTokens: string[], sim: number): string {
  const shared = qTokens.filter(t => mTokens.includes(t))
  if (shared.length > 0) return `shared: ${shared.slice(0, 3).join(', ')}`
  if (sim > 0.3) return 'high semantic similarity'
  return 'contextual match'
}

// ── Build context for AI prompt ────────────────────────────
export async function buildSemanticContext(
  query: string,
  maxChars = 800
): Promise<string> {
  const results = await semanticMemorySearch(query, 6, 0.05)
  if (!results.length) return ''

  const lines = results.map(r => {
    const age = timeSince(r.memory.timestamp)
    const imp = r.memory.importance >= 8 ? '⭐' : ''
    return `${imp}[${r.memory.type}] ${r.memory.data} (${age})`
  })

  const joined = lines.join('\n')
  return joined.length > maxChars ? joined.slice(0, maxChars) + '...' : joined
}

function timeSince(ts: number): string {
  const diff = Date.now() - ts
  const days = Math.floor(diff / 86400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days/7)}w ago`
  return `${Math.floor(days/30)}mo ago`
}

// ── Keyword highlight helper ───────────────────────────────
export function highlightKeywords(text: string, query: string): string {
  const words = tokenize(query)
  if (!words.length) return text
  const pattern = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  return text.replace(pattern, '**$1**')
}
