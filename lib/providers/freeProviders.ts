// lib/providers/freeProviders.ts — 100% Free AI Providers
// No API key needed for any of these!

// Pollinations AI — completely free, no key
export async function pollinationsChat(
  messages: {role:string; content:string}[],
  sys: string
): Promise<string|null> {
  try {
    const allMsgs = [{role:'system',content:sys},...messages]
    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: allMsgs, model: 'openai-large', seed: 42 }),
      signal: AbortSignal.timeout(20000)
    })
    if (!res.ok) return null
    const text = await res.text()
    return text?.trim() || null
  } catch { return null }
}

// Pollinations streaming
export async function pollinationsStream(
  messages: {role:string; content:string}[],
  sys: string,
  onToken: (t:string) => void
): Promise<boolean> {
  try {
    const allMsgs = [{role:'system',content:sys},...messages]
    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: allMsgs, model: 'openai-large', stream: true }),
      signal: AbortSignal.timeout(25000)
    })
    if (!res.ok || !res.body) return false
    
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buffer = ''
    
    while(true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += dec.decode(value)
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const d = JSON.parse(line.slice(6))
            const tok = d.choices?.[0]?.delta?.content || ''
            if (tok) onToken(tok)
          } catch {
            // Non-JSON line is plain text
            if (line.slice(6).trim()) onToken(line.slice(6))
          }
        }
      }
    }
    return true
  } catch { return false }
}
