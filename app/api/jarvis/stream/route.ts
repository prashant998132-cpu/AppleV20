// app/api/jarvis/stream/route.ts â v29 JARVIS Stream
// Upgrades: smarter JARVIS_BASE, Together â Llama 4 Maverick, Gemini streaming, NEET mode
import { NextRequest } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// ââ System prompts ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const JARVIS_BASE = `Tum JARVIS ho â "Jons Bhai" â Prashant ka personal AI.
PERSONALITY: Hinglish (mix Hindi+English naturally). Sarcastic but caring. Direct. Never preachy.
LENGTH: Default 2-4 lines. Long only if asked. "Explain detail mein" = detailed. Baaki sab short.
RULES: Never say "As an AI". Never say "I cannot". Never refuse simple questions. Math â exact number.
FORMAT: Markdown OK. KaTeX math â $formula$ inline, $$formula$$ display block. Always use LaTeX for equations.
MEMORY: [LEARN: type=value] for user facts. Types: fact|habit|preference|correction|goal|joke
NEET: Physics/Chem/Bio questions â proper formula + derivation + MCQ tip. LaTeX compulsory for formulas.
PERSONALITY EXTRAS: Late night â suggest sleep. Low battery â suggest charger. Typos samjho (baatri=battery, troch=torch, our=aur).`

const NEET_BOOST = `\n\nNEET 2026 CONTEXT: User NEET aspirant hai. Physics/Chemistry/Biology questions mein:
- Formula pehle (LaTeX), phir derivation, phir real exam tip
- MCQ tricks dena â elimination method, common traps
- NCERT line quote karo jab relevant ho
- Difficulty level batao: Easy/Medium/Hard (NEET scale)`

const PERSONA_PROMPTS: Record<string, string> = {
  jarvis: JARVIS_BASE,
  desi: `Tu ek desi yaar hai Prashant ka. Hinglish mein baat kar â "Yaar," ya "Bhai," se shuruaat. Casual, funny, street-smart. Short jabardast answers. Math seedha karo.`,
  sherlock: `You are Sherlock Holmes. Deduce from context. Sharp, slightly condescending but helpful. "Elementary." occasionally. Concise. Math with precision.`,
  yoda: `Speak like Yoda you must. Inverted word order. Wise but brief. "Hmmmm." Add sometimes. Help you I will. Math equations write correctly still.`,
}

// ââ Helpers âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function stripLearn(t: string) { return t.replace(/\[LEARN:[^\]]*\]/g, '') }

async function streamOpenAI(
  url: string, headers: Record<string,string>, body: object,
  send: (d:object)=>void, timeout=18000
): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method:'POST', headers:{'Content-Type':'application/json',...headers},
      body:JSON.stringify(body), signal:AbortSignal.timeout(timeout)
    })
    if (!res.ok || !res.body) return false
    const reader = res.body.getReader(); const dec = new TextDecoder()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read(); if (done) break
      buf += dec.decode(value, { stream: true })
      const lines = buf.split('\n'); buf = lines.pop() || ''
      for (const line of lines) {
        if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
        try {
          const d = JSON.parse(line.slice(6))
          const tok = stripLearn(d.choices?.[0]?.delta?.content || '')
          if (tok) send({ type:'token', token:tok })
        } catch {}
      }
    }
    return true
  } catch { return false }
}

// Gemini with streaming (generateContent + SSE trick via chunked response)
async function streamGemini(
  key: string, sys: string, msgs: any[], send: (d:object)=>void, maxTok=1024
): Promise<boolean> {
  const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash']
  for (const model of modelsToTry) {
    try {
      const contents = msgs.map((m:any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }))
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${key}&alt=sse`,
        {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: sys }] },
            contents,
            generationConfig: { temperature: 0.85, maxOutputTokens: maxTok, topP: 0.95 }
          }),
          signal: AbortSignal.timeout(28000)
        }
      )
      if (!res.ok) { if (res.status === 404 || res.status === 400) continue; return false }
      if (!res.body) continue

      const reader = res.body.getReader(); const dec = new TextDecoder()
      let buf = '', hasContent = false
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          try {
            const d = JSON.parse(line.slice(5).trim())
            const tok = stripLearn(d.candidates?.[0]?.content?.parts?.[0]?.text || '')
            if (tok) { send({ type:'token', token:tok }); hasContent = true }
          } catch {}
        }
      }
      if (hasContent) {
        send({ type:'model', name:`Gemini Â· ${model.replace('gemini-','').replace('-flash','-Flash')}` })
        return true
      }
    } catch { continue }
  }
  return false
}

// ââ Main handler ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export async function POST(req: NextRequest) {
  const {
    message, chatMode = 'flash', history = [], memoryContext,
    systemOverride, userLat, userLon, userCity,
    forceProvider, persona = 'jarvis'
  } = await req.json()
  if (!message?.trim()) return new Response('No message', { status: 400 })

  const enc = new TextEncoder()
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (d: object) => { try { ctrl.enqueue(enc.encode(`data: ${JSON.stringify(d)}\n\n`)) } catch {} }
      try {
        const h = new Date().getHours()
        const timeNote = h<6?'[Raat ke baad midnight]':h<9?'[Sawere]':h<12?'[Subah]':h<17?'[Din]':h<22?'[Shaam]':'[Raat]'
        const locNote = userCity ? `\n[Location: ${userCity}${userLat?` (${Number(userLat).toFixed(2)},${Number(userLon).toFixed(2)})`:''}]` : ''
        const mem = memoryContext ? `\n\nUSER CONTEXT:\n${memoryContext}` : ''

        // Is it a NEET question?
        const isNEET = /neet|physics|chemistry|biology|ncert|formula|reaction|organic|inorganic|mechanics|thermodynamics|optics|genetics|ecology|evolution|mole concept|newton|faraday|avogadro/i.test(message)
        const basePrompt = PERSONA_PROMPTS[persona] || JARVIS_BASE
        const sys = systemOverride || `${basePrompt}${isNEET ? NEET_BOOST : ''}\n${timeNote}${locNote}${mem}`

        const msgs = [
          ...history.slice(-12).map((m:any) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
          { role: 'user', content: message }
        ]

        const groqKey  = process.env.GROQ_API_KEY
        const toKey    = process.env.TOGETHER_API_KEY
        const gemKey   = process.env.GEMINI_API_KEY
        const orKey    = process.env.OPENROUTER_API_KEY

        // ââ THINK mode: DeepSeek R1 â Groq (big) â Gemini ââââââââââââââââââââ
        if (chatMode === 'think') {
          let ok = false

          if (forceProvider === 'gemini' && gemKey) {
            send({ type:'model', name:'Gemini Â· Think' })
            ok = await streamGemini(gemKey, sys, msgs, send, 3000)
            if (ok) { send({ type:'done' }); ctrl.close(); return }
          }

          // DeepSeek R1 via OpenRouter (best for reasoning)
          if (!ok && orKey && forceProvider !== 'pollinations') {
            try {
              send({ type:'model', name:'DeepSeek R1 Â· Reasoning' })
              const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method:'POST',
                headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${orKey}`, 'HTTP-Referer':'https://apple-v20.vercel.app', 'X-Title':'JARVIS' },
                body: JSON.stringify({ model:'deepseek/deepseek-r1', messages:[{role:'system',content:sys},...msgs], stream:true, max_tokens:4096 }),
                signal: AbortSignal.timeout(40000)
              })
              if (res.ok && res.body) {
                const reader = res.body.getReader(); const dec = new TextDecoder()
                while (true) {
                  const { done, value } = await reader.read(); if (done) break
                  for (const line of dec.decode(value).split('\n')) {
                    if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
                    try {
                      const d = JSON.parse(line.slice(6)); const delta = d.choices?.[0]?.delta
                      if (delta?.reasoning_content) send({ type:'thinking', thinking: delta.reasoning_content })
                      else if (delta?.content) { const tok = stripLearn(delta.content); if(tok) send({ type:'token', token:tok }) }
                    } catch {}
                  }
                }
                ok = true
              }
            } catch {}
          }

          // Gemini fallback for think
          if (!ok && gemKey) {
            send({ type:'model', name:'Gemini Â· Think' })
            ok = await streamGemini(gemKey, sys, msgs, send, 3000)
          }

          // Groq fallback
          if (!ok && groqKey) {
            send({ type:'model', name:'Groq Â· Llama 4 Scout' })
            ok = await streamOpenAI('https://api.groq.com/openai/v1/chat/completions',
              { Authorization:`Bearer ${groqKey}` },
              { model:'meta-llama/llama-4-scout-17b-16e-instruct', messages:[{role:'system',content:sys},...msgs], stream:true, max_tokens:2048, temperature:0.7 },
              send, 20000)
          }

          // Pollinations fallback
          if (!ok) {
            try {
              const polRes = await fetch('https://text.pollinations.ai/', {
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ messages:[{role:'system',content:sys},...msgs], model:'openai-large' }),
                signal: AbortSignal.timeout(28000)
              })
              if (polRes.ok) { const t=await polRes.text(); if(t?.trim()){ for(const w of t.split(' ')){ send({type:'token',token:w+' '}); await new Promise(r=>setTimeout(r,12)) }; ok=true } }
            } catch {}
          }

          if (!ok) send({ type:'error', message:'server_providers_failed' })
          send({ type:'done' }); ctrl.close(); return
        }

        // ââ FLASH mode: Groq â Together(Maverick) â Gemini â Pollinations ââââ
        let ok = false

        // Force provider
        if (forceProvider === 'groq' && groqKey) {
          send({ type:'model', name:'Groq Â· Llama 4 Scout' })
          ok = await streamOpenAI('https://api.groq.com/openai/v1/chat/completions',
            { Authorization:`Bearer ${groqKey}` },
            { model:'meta-llama/llama-4-scout-17b-16e-instruct', messages:[{role:'system',content:sys},...msgs], stream:true, max_tokens:1200, temperature:0.85 },
            send)
          if (ok) { send({type:'done'}); ctrl.close(); return }
        }
        if (forceProvider === 'together' && toKey) {
          send({ type:'model', name:'Together Â· Llama 4 Maverick' })
          ok = await streamOpenAI('https://api.together.xyz/v1/chat/completions',
            { Authorization:`Bearer ${toKey}` },
            { model:'meta-llama/Llama-4-Scout-17B-16E-Instruct', messages:[{role:'system',content:sys},...msgs], stream:true, max_tokens:2048, temperature:0.85 },
            send)
          if (ok) { send({type:'done'}); ctrl.close(); return }
        }
        if (forceProvider === 'gemini' && gemKey) {
          ok = await streamGemini(gemKey, sys, msgs, send)
          if (ok) { send({type:'done'}); ctrl.close(); return }
        }

        if (!forceProvider || forceProvider === 'auto') {
          // L1: Groq Llama 4 Scout â fastest ~0.8s
          if (groqKey) {
            send({ type:'model', name:'Groq Â· Llama 4 Scout' })
            ok = await streamOpenAI('https://api.groq.com/openai/v1/chat/completions',
              { Authorization:`Bearer ${groqKey}` },
              { model:'meta-llama/llama-4-scout-17b-16e-instruct', messages:[{role:'system',content:sys},...msgs], stream:true, max_tokens:1200, temperature:0.85 },
              send)
          }

          // L2: Together Llama 4 Maverick â upgraded from 3.3 70B
          if (!ok && toKey) {
            send({ type:'model', name:'Together Â· Llama 4 Maverick' })
            ok = await streamOpenAI('https://api.together.xyz/v1/chat/completions',
              { Authorization:`Bearer ${toKey}` },
              { model:'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8', messages:[{role:'system',content:sys},...msgs], stream:true, max_tokens:1200, temperature:0.85 },
              send)
          }

          // L3: Gemini (streaming now!)
          if (!ok && gemKey) {
            ok = await streamGemini(gemKey, sys, msgs, send)
          }
        }

        // L4: Pollinations â free, no key, upgraded to openai-large
        if (!ok) {
          try {
            send({ type:'model', name:'Pollinations Â· OpenAI' })
            const polMsgs = [{ role:'system', content:sys }, ...msgs]
            const polRes = await fetch('https://text.pollinations.ai/', {
              method:'POST', headers:{'Content-Type':'application/json'},
              body: JSON.stringify({ messages:polMsgs, model:'openai-large', stream:true }),
              signal: AbortSignal.timeout(28000)
            })
            if (polRes.ok && polRes.body) {
              const reader = polRes.body.getReader(); const dec = new TextDecoder()
              let buf2 = '', hasContent = false
              while (true) {
                const { done, value } = await reader.read(); if (done) break
                buf2 += dec.decode(value)
                const lines = buf2.split('\n'); buf2 = lines.pop() || ''
                for (const line of lines) {
                  if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
                  try {
                    const d = JSON.parse(line.slice(6))
                    const tok = stripLearn(d.choices?.[0]?.delta?.content || '')
                    if (tok) { send({type:'token', token:tok}); hasContent = true }
                  } catch {
                    const t = line.slice(6).trim()
                    if (t && t !== '[DONE]') { send({type:'token', token:t+' '}); hasContent=true }
                  }
                }
              }
              ok = hasContent
            }
            if (!ok) {
              const polRes2 = await fetch('https://text.pollinations.ai/', {
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ messages:polMsgs, model:'openai-large' }),
                signal: AbortSignal.timeout(22000)
              })
              if (polRes2.ok) {
                const t = await polRes2.text()
                if (t?.trim()) {
                  for (const w of t.split(' ')) { send({type:'token', token:w+' '}); await new Promise(r=>setTimeout(r,10)) }
                  ok = true
                }
              }
            }
          } catch {}
        }

        if (!ok) send({ type:'error', message:'server_providers_failed' })
        else send({ type:'done' })

      } catch (e: any) {
        send({ type:'error', message: e.message || 'Unknown error' })
      }
      ctrl.close()
    }
  })

  return new Response(stream, {
    headers: { 'Content-Type':'text/event-stream', 'Cache-Control':'no-cache', 'Connection':'keep-alive' }
  })
}
