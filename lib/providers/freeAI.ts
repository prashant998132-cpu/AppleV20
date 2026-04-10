// lib/providers/freeAI.ts — 100% Free AI, No Key, No Login, No Server
// Browser calls these directly — Vercel server not involved!

// ─── Option 1: Pollinations AI (OpenAI-compatible, free) ──
export async function pollinationsChat(
  messages: {role:string; content:string}[],
  onToken?: (t:string) => void
): Promise<string|null> {
  try {
    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, model: 'openai-large', seed: Math.floor(Math.random()*9999) }),
      signal: AbortSignal.timeout(30000)
    })
    if (!res.ok) return null
    const text = await res.text()
    if (!text?.trim()) return null
    // Simulate streaming if callback provided
    if (onToken) {
      for (const word of text.split(' ')) {
        onToken(word + ' ')
        await new Promise(r => setTimeout(r, 15))
      }
    }
    return text
  } catch { return null }
}

// ─── Option 2: Hugging Face (no key needed for public models) ─
export async function hfChat(
  messages: {role:string; content:string}[],
  onToken?: (t:string) => void
): Promise<string|null> {
  try {
    const lastMsg = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || ''
    const sys = messages.find(m => m.role === 'system')?.content || ''
    const prompt = sys ? `${sys}\n\nUser: ${lastMsg}\nAssistant:` : `User: ${lastMsg}\nAssistant:`
    
    const res = await fetch(
      'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 200 } }),
        signal: AbortSignal.timeout(15000)
      }
    )
    if (!res.ok) return null
    const d = await res.json()
    const text = d?.[0]?.generated_text?.split('Assistant:')?.slice(-1)?.[0]?.trim() || null
    if (text && onToken) {
      for (const w of text.split(' ')) { onToken(w+' '); await new Promise(r=>setTimeout(r,15)) }
    }
    return text
  } catch { return null }
}

// ─── Fallback chain: try all free options ─────────────────
export async function freeAIChat(
  messages: {role:string; content:string}[],
  onToken: (t:string) => void,
  onDone: (full:string) => void,
  onError: () => void
): Promise<void> {
  let full = ''
  const tokenHandler = (t:string) => { full+=t; onToken(t) }

  // Try Pollinations first (best quality)
  const pol = await pollinationsChat(messages, tokenHandler)
  if (pol) { onDone(full||pol); return }

  // Fallback to HuggingFace
  full = ''
  const hf = await hfChat(messages, tokenHandler)
  if (hf) { onDone(full||hf); return }

  // Nothing worked
  onError()
}
