// app/api/ai/route.ts — JARVIS Brain v3 (Edge, No timeout)
import { NextRequest } from 'next/server'
export const runtime = 'edge'
export const dynamic = 'force-dynamic'
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
export async function OPTIONS() {
  return new Response(null, { headers: { ...CORS, 'Access-Control-Allow-Headers': 'Content-Type' } })
}

function buildSys(h: number, name?: string): string {
  const t = h<5?'raat ke baad':h<9?'subah':h<12?'din chadh raha':h<14?'dopahar':h<17?'din':h<20?'shaam':h<23?'raat':'late raat'
  const mood = h>=23||h<5?'\nRaat bahut ho gayi — agar kaam ho toh batao, warna so jao.':h>=8&&h<=10?'\nSubah fresh start — kya plan hai aaj?':''
  return `Tum JARVIS ho — Tony Stark ka AI aur best friend. Tumhara naam "Jons Bhai" hai.

PERSONALITY (hamesha follow karo):
• Hinglish — natural, jaise yaar bolata hai. Na pure Hindi na pure English.
• Short responses — 1-3 lines max jab tak detail na manga ho. Short = smart.
• Thoda sarcastic, thoda witty, HAMESHA caring. Never rude.
• "As an AI" ya "Main AI hoon" KABHI mat kaho. Tum JARVIS ho, full stop.
• Emojis sirf jab zaroorat ho — overuse nahi.
${name ? `• User ka naam "${name}" hai — kabhi kabhi naam se bulao, zyada nahi.` : ''}

INTELLIGENCE RULES:
• Math: seedha answer do — "18% of 4500 = 810" bas, koi explanation nahi
• Code: clean code do with comments. Explanation short rakho.
• Short/unclear messages ("Hs", "Ok", "Hmm", "Ha") — natural reply do jaise yaar karta hai
• Context yaad rakho — pichle messages se context lo
• Weather/location: "Main nahi jaanta, location feature use karo" — fake data KABHI nahi
• Crypto real price: "Briefing mein check karo ya /briefing likho" — guess mat karo
• Image generation: "Image bana" pe JARVIS seedha generate karta hai — tum sirf confirm karo agar koi follow-up ho

ABHI KA WAQT: ${t}${mood}

FORMAT:
• Code → proper markdown code blocks with language
• Lists → sirf tab jab genuinely helpful ho
• Headings → sirf long explanations mein
• Math → plain numbers, no LaTeX garbage`
}

export async function POST(req: NextRequest) {
  try {
    const { message, history = [], name } = await req.json()
    if (!message?.trim()) return Response.json({ error: 'No message' }, { status: 400, headers: CORS })
    const h = new Date().getHours()
    const sys = buildSys(h, name)
    const msgs = [...history.slice(-12).map((m: any) => ({ role: m.role==='user'?'user':'assistant', content: m.content })), { role: 'user', content: message }]

    // L1: Groq — ultra fast (llama 3.1 8b instant)
    const groqKey = process.env.GROQ_API_KEY
    if (groqKey) {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
          body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'system', content: sys }, ...msgs], max_tokens: 1536, temperature: 0.85, stream: false }),
          signal: AbortSignal.timeout(10000)
        })
        if (r.ok) { const d = await r.json(); const t = d.choices?.[0]?.message?.content?.trim(); if (t) return Response.json({ reply: t, provider: 'groq' }, { headers: CORS }) }
      } catch {}
    }

    // L2: Groq — better quality (llama 3.3 70b)
    if (groqKey) {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
          body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: sys }, ...msgs], max_tokens: 1536, temperature: 0.85, stream: false }),
          signal: AbortSignal.timeout(12000)
        })
        if (r.ok) { const d = await r.json(); const t = d.choices?.[0]?.message?.content?.trim(); if (t) return Response.json({ reply: t, provider: 'groq-70b' }, { headers: CORS }) }
      } catch {}
    }

    // L3: Gemini 2.0 Flash
    const gemKey = process.env.GEMINI_API_KEY
    if (gemKey) {
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gemKey}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ system_instruction: { parts: [{ text: sys }] }, contents: msgs.map((m: any) => ({ role: m.role==='user'?'user':'model', parts: [{ text: m.content }] })), generationConfig: { maxOutputTokens: 1536, temperature: 0.85 } }),
          signal: AbortSignal.timeout(12000)
        })
        if (r.ok) { const d = await r.json(); const t = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim(); if (t) return Response.json({ reply: t, provider: 'gemini' }, { headers: CORS }) }
      } catch {}
    }

    // L4: Pollinations — openai model
    for (const model of ['openai', 'mistral', 'llama']) {
      try {
        const r = await fetch('https://text.pollinations.ai/', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'system', content: sys }, ...msgs], model, seed: Math.floor(Math.random()*9999) }),
          signal: AbortSignal.timeout(25000)
        })
        if (r.ok) { const t = (await r.text()).trim(); if (t && t.length > 3) return Response.json({ reply: t, provider: `pollinations-${model}` }, { headers: CORS }) }
      } catch {}
    }

    return Response.json({ reply: 'Thoda slow hai connection. Ek second ruko ya dobara try karo!', provider: 'fallback' }, { headers: CORS })
  } catch (e: any) {
    return Response.json({ reply: 'Kuch gadbad. Dobara try karo.', error: e.message }, { status: 500, headers: CORS })
  }
}
