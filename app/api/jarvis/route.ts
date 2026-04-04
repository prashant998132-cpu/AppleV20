// app/api/jarvis/route.ts — v18 Autonomous (non-streaming fallback)
import { NextRequest, NextResponse } from 'next/server'
import { detectIntent }   from '../../../lib/tools/intent'
import { getToolsByCategory, getToolById, type ToolMeta } from '../../../lib/tools/registry'
import { cachedFetch }    from '../../../lib/tools/cache'

export const runtime = 'nodejs'

const SYS = `Tum JARVIS ho — "Jons Bhai". Hinglish. Short (1-3 lines). Sarcastic but caring.
Math → seedha number. "As an AI" kabhi mat. KaTeX math: $inline$ aur $$display$$.`

export async function POST(req: NextRequest) {
  const t0 = Date.now()
  try {
    const { message, history = [], memoryContext } = await req.json()
    if (!message?.trim()) return NextResponse.json({ error: 'No message' }, { status: 400 })
    const gemKey = process.env.GEMINI_API_KEY
    if (!gemKey) return NextResponse.json({ reply: 'Gemini key missing', error: true })

    // Intent + select tools (same logic as deep-stream)
    const intent = detectIntent(message)
    let toolData = ''
    const toolsUsed: string[] = []

    if (!intent.skipTools && intent.categories[0] !== 'none') {
      const selectedTools: ToolMeta[] = []
      const seen = new Set<string>()
      for (const cat of intent.categories.slice(0, 3)) {
        if (cat === 'none') continue
        const best = getToolsByCategory(cat as any)
          .map(t => ({ t, s: (!t.requiresKey ? 10 : 0) + (t.cacheTTL > 0 ? 3 : 0) }))
          .sort((a, b) => b.s - a.s)[0]?.t
        if (best && !seen.has(best.id)) { selectedTools.push(best); seen.add(best.id) }
        if (selectedTools.length >= intent.maxTools) break
      }
      // Execute in parallel
      const results = await Promise.all(
        selectedTools.map(async tool => {
          if (tool.requiresKey && tool.keyName && !process.env[tool.keyName]) return null
          try {
            const catMap: Record<string, () => Promise<Record<string, any>>> = {
              weather: () => import('../../../lib/tools/categories/weather'),
              time:    () => import('../../../lib/tools/categories/time'),
              news:    () => import('../../../lib/tools/categories/news'),
              finance: () => import('../../../lib/tools/categories/finance'),
              knowledge:() => import('../../../lib/tools/categories/knowledge'),
              india:   () => import('../../../lib/tools/categories/india'),
              education:() => import('../../../lib/tools/categories/education'),
              entertainment:() => import('../../../lib/tools/categories/entertainment'),
              science: () => import('../../../lib/tools/categories/science'),
              health:  () => import('../../../lib/tools/categories/health'),
              sports:  () => import('../../../lib/tools/categories/sports'),
              food:    () => import('../../../lib/tools/categories/food'),
              fun:     () => import('../../../lib/tools/categories/fun'),
              search:  () => import('../../../lib/tools/categories/search'),
            }
            const loader = catMap[tool.category]
            if (!loader) return null
            const mod = await loader()
            const fn = mod[tool.id]
            if (typeof fn !== 'function') return null
            const { value, fromCache } = await cachedFetch(tool.id, undefined, tool.cacheTTL, () =>
              Promise.race([fn({}), new Promise<never>((_, r) => setTimeout(() => r(new Error('to')), 6000))])
            )
            if (value) toolsUsed.push(tool.id)
            return value
          } catch { return null }
        })
      )
      const valid = results.filter(Boolean)
      if (valid.length) toolData = `\n\n[REAL_TIME_DATA]\n${valid.map(v => JSON.stringify(v, null, 0).slice(0, 800)).join('\n\n')}\n[/REAL_TIME_DATA]`
    }

    const mem = memoryContext ? `\n\nMEMORY:\n${memoryContext}` : ''
    const sys = `${SYS}${mem}${toolData}`
    const msgs = [
      ...history.slice(-6).map((m: any) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
      { role: 'user', parts: [{ text: message }] },
    ]

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gemKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system_instruction: { parts: [{ text: sys }] }, contents: msgs, generationConfig: { temperature: 0.85, maxOutputTokens: 512 } }), signal: AbortSignal.timeout(15000) }
    )
    const d = await res.json()
    const reply = (d.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('').trim() || 'Kuch gadbad ho gayi 😅'
    return NextResponse.json({ reply, toolsUsed, ms: Date.now() - t0 })
  } catch (e: any) {
    return NextResponse.json({ reply: `Error: ${e.message}`, error: true })
  }
}
