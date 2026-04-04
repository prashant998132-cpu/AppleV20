// lib/providers/pollinations.ts — Pollinations AI v2
// 100% Free, No API key, No signup needed!
// Features: Text, Image, TTS, Video (alpha)

// ── Text Generation (OpenAI compatible) ─────────────────
export async function pollinationsText(
  messages: { role: string; content: string }[],
  model = 'openai',
  onToken?: (t: string) => void
): Promise<string | null> {
  try {
    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, model, seed: Math.floor(Math.random() * 9999) }),
      signal: AbortSignal.timeout(30000)
    })
    if (!res.ok) return null
    const text = await res.text()
    if (!text?.trim()) return null
    if (onToken) {
      for (const word of text.split(' ')) {
        onToken(word + ' ')
        await new Promise(r => setTimeout(r, 12))
      }
    }
    return text.trim()
  } catch { return null }
}

// ── Image Generation (Direct URL - instant!) ─────────────
export function pollinationsImageUrl(
  prompt: string,
  options: {
    width?: number
    height?: number
    model?: 'flux' | 'flux-realism' | 'flux-cablyai' | 'turbo' | 'gptimage'
    seed?: number
    nologo?: boolean
    enhance?: boolean
  } = {}
): string {
  const { width = 1024, height = 1024, model = 'flux', nologo = true, enhance = false } = options
  const seed = options.seed || Math.floor(Math.random() * 999999)
  const encoded = encodeURIComponent(prompt)
  return `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&model=${model}&seed=${seed}&nologo=${nologo}&enhance=${enhance}`
}

// ── TTS — Text to Speech (completely free!) ───────────────
export function pollinationsTTSUrl(
  text: string,
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'alloy',
  model: 'openai-audio' | 'kokoro' = 'openai-audio'
): string {
  const encoded = encodeURIComponent(text)
  return `https://text.pollinations.ai/${encoded}?model=${model}&voice=${voice}`
}

// Play TTS audio in browser
export async function speakText(text: string, voice = 'alloy'): Promise<void> {
  const url = pollinationsTTSUrl(text.slice(0, 500), voice as any)
  const audio = new Audio(url)
  audio.volume = 0.8
  return new Promise((resolve, reject) => {
    audio.onended = () => resolve()
    audio.onerror = () => reject(new Error('TTS failed'))
    audio.play().catch(reject)
  })
}

// ── Available Models ──────────────────────────────────────
export const POLLINATIONS_TEXT_MODELS = [
  { id: 'openai',         name: 'GPT-4o',          desc: 'Best quality' },
  { id: 'mistral',        name: 'Mistral',          desc: 'Fast, good Hindi' },
  { id: 'deepseek-r1',    name: 'DeepSeek R1',      desc: 'Reasoning' },
  { id: 'llama',          name: 'Llama 3',          desc: 'Open source' },
  { id: 'claude-hybridspace', name: 'Claude',       desc: 'Anthropic' },
]

export const POLLINATIONS_IMAGE_MODELS = [
  { id: 'flux',           name: 'Flux',             desc: 'Best quality, default' },
  { id: 'flux-realism',   name: 'Flux Realism',     desc: 'Photo-realistic' },
  { id: 'turbo',          name: 'SDXL Turbo',       desc: 'Fastest' },
  { id: 'gptimage',       name: 'GPT Image',        desc: 'OpenAI DALL-E 3' },
]

export const POLLINATIONS_VOICES = [
  { id: 'alloy',   name: 'Alloy',   desc: 'Neutral, clear' },
  { id: 'nova',    name: 'Nova',    desc: 'Female, warm' },
  { id: 'echo',    name: 'Echo',    desc: 'Male, confident' },
  { id: 'fable',   name: 'Fable',   desc: 'British accent' },
  { id: 'onyx',    name: 'Onyx',    desc: 'Deep, authoritative' },
  { id: 'shimmer', name: 'Shimmer', desc: 'Soft, gentle' },
]
