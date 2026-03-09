// app/api/jarvis/deep-stream/route.ts — v18 Autonomous
// Architecture: Intent → Pre-fetch (parallel, cached) → 1 Gemini call → Stream
// OLD: 5 Gemini round-trips, ALL 33 tools loaded, zero cache
// NEW: 1 Gemini call always, 2 tools max, lazy category loading, TTL cache

import { NextRequest } from 'next/server'
import { detectIntent }   from '../../../../lib/tools/intent'
import { getToolsByCategory, getToolById, type ToolMeta } from '../../../../lib/tools/registry'
import { cachedFetch }    from '../../../../lib/tools/cache'

export const runtime = 'nodejs'
export const maxDuration = 30

const JARVIS_PERSONALITY = `Tum JARVIS ho — "Jons Bhai". Tony Stark ka AI + Grok attitude.
Hinglish mein baat karo. Short (1-4 lines max). Sarcastic but caring. Direct answers only.
Math → seedha number. "As an AI" kabhi mat bolna. KaTeX math: $inline$ aur $$display$$.
NEET/JEE: proper formulas aur LaTeX use karo.
[LEARN: type=data] format mein user ke baare mein naya fact yaad rakho.
Memory types: fact, habit, preference, correction`

// Module cache - lazy loaded once per category
const _mods: Record<string, Record<string, Function>> = {}

async function loadCat(cat: string): Promise<Record<string, Function>> {
  if (_mods[cat]) return _mods[cat]
  try {
    const catMap: Record<string, () => Promise<Record<string, any>>> = {
      weather:       () => import('../../../../lib/tools/categories/weather'),
      time:          () => import('../../../../lib/tools/categories/time'),
      news:          () => import('../../../../lib/tools/categories/news'),
      finance:       () => import('../../../../lib/tools/categories/finance'),
      knowledge:     () => import('../../../../lib/tools/categories/knowledge'),
      location:      () => import('../../../../lib/tools/categories/location'),
      india:         () => import('../../../../lib/tools/categories/india'),
      education:     () => import('../../../../lib/tools/categories/education'),
      entertainment: () => import('../../../../lib/tools/categories/entertainment'),
      image_gen:     () => import('../../../../lib/tools/categories/image_gen'),
      productivity:  () => import('../../../../lib/tools/categories/productivity'),
      science:       () => import('../../../../lib/tools/categories/science'),
      health:        () => import('../../../../lib/tools/categories/health'),
      sports:        () => import('../../../../lib/tools/categories/sports'),
      food:          () => import('../../../../lib/tools/categories/food'),
      fun:           () => import('../../../../lib/tools/categories/fun'),
      search:        () => import('../../../../lib/tools/categories/search'),
      travel:        () => import('../../../../lib/tools/categories/travel'),
    }
    const loader = catMap[cat]
    if (!loader) throw new Error(`no loader for ${cat}`)
    _mods[cat] = await loader()
    return _mods[cat]
  } catch {
    // Last resort: legacy no-key + free-key bundle
    const [nk, fk] = await Promise.allSettled([
      import('../../../../lib/tools/no-key/index'),
      import('../../../../lib/tools/free-key/index'),
    ])
    const merged: Record<string, Function> = {}
    if (nk.status === 'fulfilled') Object.assign(merged, nk.value)
    if (fk.status === 'fulfilled') Object.assign(merged, fk.value)
    _mods[cat] = merged
    return merged
  }
}

// Select best 1-2 tools: prefer no-key, prefer has-fallbacks
function selectTools(intent: ReturnType<typeof detectIntent>): ToolMeta[] {
  if (intent.skipTools) return []
  const selected: ToolMeta[] = []
  const seen = new Set<string>()
  for (const cat of intent.categories.slice(0, 3)) {
    if (cat === 'none') continue
    const catTools = getToolsByCategory(cat as any)
    const best = catTools
      .map(t => ({ t, s: (!t.requiresKey ? 10 : 0) + (t.cacheTTL > 0 ? 3 : 0) + (t.fallbacks.length ? 2 : 0) }))
      .sort((a, b) => b.s - a.s)[0]?.t
    if (best && !seen.has(best.id)) {
      selected.push(best)
      seen.add(best.id)
      if (selected.length >= intent.maxTools) break
    }
  }
  return selected
}

// Run tool with fallback chain, wrapped in cache
async function runTool(
  tool: ToolMeta,
  args: Record<string, any>,
  depth = 0
): Promise<{ id: string; data: any; fromCache: boolean } | null> {
  if (depth > 2) return null
  if (tool.requiresKey && tool.keyName && !process.env[tool.keyName]) {
    const fb = tool.fallbacks[0] ? getToolById(tool.fallbacks[0]) : null
    return fb ? runTool(fb, args, depth + 1) : null
  }
  const mod = await loadCat(tool.category)
  const fn = mod[tool.id]
  if (typeof fn !== 'function') {
    const fb = tool.fallbacks[0] ? getToolById(tool.fallbacks[0]) : null
    return fb ? runTool(fb, args, depth + 1) : null
  }
  try {
    const { value, fromCache } = await cachedFetch(
      tool.id,
      Object.keys(args).length ? args : undefined,
      tool.cacheTTL,
      () => Promise.race([fn(args), new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), 7000))])
    )
    return { id: tool.id, data: value, fromCache }
  } catch {
    const fb = tool.fallbacks[0] ? getToolById(tool.fallbacks[0]) : null
    return fb ? runTool(fb, args, depth + 1) : null
  }
}

// Build tool args: defaults + extracted intent args + smart fills
function buildArgs(tool: ToolMeta, query: string, extracted: Record<string, string>): Record<string, any> {
  const args: Record<string, any> = {}
  for (const [k, s] of Object.entries(tool.params || {})) {
    if (s.default !== undefined) args[k] = s.default
  }
  for (const [k, v] of Object.entries(extracted)) {
    if (tool.params?.[k]) args[k] = v
  }
  // Smart fills per tool type
  const id = tool.id
  const q = query
  if ((id.includes('wikipedia') || id.includes('books') || id === 'web_search' || id === 'search_movies_nokey') && !args.query)
    args.query = q.replace(/\b(kya hai|kaun hai|who is|what is|batao|explain|ke baare mein|about|bata)\b/gi, '').trim().slice(0, 120)
  if ((id === 'get_recipe' || id === 'get_joke') && !args.query) args.query = q
  if (id === 'translate_text') {
    if (!args.text) args.text = q.replace(/translate|anuvad|hindi mein|english mein/gi, '').trim()
    args.to = /hindi|हिंदी/.test(q.toLowerCase()) ? 'hi' : 'en'
  }
  if ((id === 'solve_math' || id === 'calculate') && !args.expression) args.expression = q
  if (id === 'get_periodic_element' && !args.query) args.query = q
  if (id === 'get_physics_constant' && !args.name) args.name = q
  if (id === 'get_travel_info' && !args.destination) args.destination = q.replace(/travel|yatra|jaana|ghumna/gi, '').trim()
  if ((id === 'get_sports_news' || id === 'get_cricket_score') && !args.sport) {
    if (/cricket|ipl|test match/.test(q.toLowerCase())) args.sport = 'cricket'
    else if (/football|fifa/.test(q.toLowerCase())) args.sport = 'football'
  }
  if (id === 'calculate_bmi') {
    const wt = q.match(/(\d+)\s*(?:kg|kilo)/i)
    const ht = q.match(/(\d+)\s*(?:cm|centimeter)/i)
    if (wt) args.weight = parseFloat(wt[1])
    if (ht) args.height = parseFloat(ht[1])
  }
  if (id === 'get_india_stock' && !args.symbol) {
    const m = q.match(/\b([A-Z]{2,6})\b/)
    if (m) args.symbol = m[1]
  }
  return args
}

// Format results for system prompt injection
function formatToolData(results: Array<{ id: string; data: any; fromCache: boolean }>): string {
  const parts = results
    .filter(r => r.data != null)
    .map(r => `[${r.id}${r.fromCache ? ' cache' : ' live'}]\n${JSON.stringify(r.data, null, 0).slice(0, 1500)}`)
  if (!parts.length) return ''
  return `\n\n[REAL_TIME_DATA]\n${parts.join('\n\n')}\n[/REAL_TIME_DATA]\nIs data ko use karo. Concise Hinglish response do. Markdown + KaTeX OK.`
}

// ═══════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const { message, history = [], memoryContext, chatMode } = await req.json()
  const gemKey = process.env.GEMINI_API_KEY

  const enc = new TextEncoder()
  const { readable, writable } = new TransformStream()
  const w = writable.getWriter()
  const send = (d: object) => { try { w.write(enc.encode(`data: ${JSON.stringify(d)}\n\n`)) } catch {} }

  ;(async () => {
    const t0 = Date.now()
    if (!gemKey) { send({ type: 'error', message: 'Gemini API key missing' }); w.close(); return }

    // ── 1. Intent detection — <1ms, zero API ─────────────────────────────
    const intent = detectIntent(message)

    // ── 2. Select tools ───────────────────────────────────────────────────
    const selectedTools = selectTools(intent)

    // ── 3. Execute tools in parallel ─────────────────────────────────────
    const toolsUsed: string[] = []
    let toolData = ''

    let results: Array<{ id: string; data: any; fromCache: boolean }> = []

    if (selectedTools.length > 0) {
      for (const t of selectedTools) send({ type: 'tool', tool: t.id, status: 'running' })

      results = (await Promise.all(
        selectedTools.map(t => runTool(t, buildArgs(t, message, intent.extractedArgs)))
      )).filter(Boolean) as Array<{ id: string; data: any; fromCache: boolean }>

      for (const r of results) {
        if (r?.data) {
          toolsUsed.push(r.id)
          send({ type: 'tool', tool: r.id, status: r.fromCache ? 'cached' : 'done' })
        }
      }
      toolData = formatToolData(results)
    }

    // ── 4. Single Gemini call (NO function calling loops) ─────────────────
    const h = new Date().getHours()
    const tod = h < 6 ? 'Raat' : h < 12 ? 'Subah' : h < 17 ? 'Din' : h < 22 ? 'Shaam' : 'Raat'
    const mem = memoryContext ? `\n\nMEMORY:\n${memoryContext}` : ''
    const sys = `${JARVIS_PERSONALITY}\n[${tod}, IST]${mem}${toolData}`

    const msgs = [
      ...history.slice(-8).map((m: any) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
      { role: 'user', parts: [{ text: message }] },
    ]

    let res: Response
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gemKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: sys }] },
            contents: msgs,
            generationConfig: { temperature: 0.85, maxOutputTokens: 1024, topP: 0.95 },
          }),
          signal: AbortSignal.timeout(22000),
        }
      )
    } catch (e: any) { send({ type: 'error', message: `Network error: ${e.message}` }); w.close(); return }

    if (!res.ok) {
      const err = await res.text().catch(() => '')
      send({ type: 'error', message: `Gemini ${res.status}: ${err.slice(0, 200)}` })
      w.close(); return
    }

    const data = await res.json()
    const reply = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('').trim()

    if (!reply) { send({ type: 'error', message: 'Gemini returned empty response' }); w.close(); return }

    // ── 5. Stream tokens ─────────────────────────────────────────────────
    for (const token of reply.split(/(\s+)/)) {
      send({ type: 'token', token })
      await new Promise(r => setTimeout(r, 12))
    }

    // ── 6. Generate rich card from tool results ───────────────────────────
    let card = null
    try {
      const q = message.toLowerCase()
      const firstResult = results?.[0]

      // IMAGE card
      if (/image|photo|pic|tasveer|banao.*wallpaper|draw/i.test(q) && !firstResult) {
        const prompt = message.replace(/image|photo|banao|dikhao|tasveer|please|karo|picture|wallpaper|generate|create|make/gi,'').trim() || message
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=512&model=flux&nologo=true&seed=${Date.now()}`
        card = { type:'image', url, prompt }
      }

      // MUSIC card — deezer result
      if (firstResult?.id?.includes('deezer') || /music|song|gana|deezer|spotify|track|play.*song/i.test(q)) {
        const d = firstResult?.data
        if (d?.data?.[0]) {
          const t = d.data[0]
          card = { type:'music', previewUrl: t.preview, title: t.title, artist: t.artist?.name||'', cover: t.album?.cover_medium||'', deezerId: t.id }
        }
      }

      // MOVIE card — omdb result
      if (firstResult?.id?.includes('omdb') || firstResult?.id?.includes('movie') || /movie|film|series|imdb/i.test(q)) {
        const d = firstResult?.data
        if (d?.Title) {
          card = { type:'movie', title:d.Title, year:d.Year||'', rating:d.imdbRating||'?', poster:d.Poster||'', plot:d.Plot||'', genre:d.Genre||'' }
        }
      }

      // WEATHER card
      if (firstResult?.id?.includes('weather') || intent.cat === 'weather') {
        const d = firstResult?.data
        if (d?.temperature !== undefined || d?.current) {
          const temp = d.temperature || d.current?.temperature_2m
          const feels = d.feelsLike || d.current?.apparent_temperature
          const desc = d.description || d.conditions || ''
          const city = d.city || d.location || 'Your Location'
          const humidity = d.humidity ? `${d.humidity}%` : '—'
          const wind = d.windSpeed ? `${d.windSpeed} km/h` : '—'
          const icons: Record<string,string> = {'clear':'☀️','cloud':'⛅','rain':'🌧️','thunder':'⛈️','snow':'❄️','mist':'🌫️','haze':'🌫️'}
          const icon = Object.entries(icons).find(([k])=>desc.toLowerCase().includes(k))?.[1] || '🌡️'
          card = { type:'weather', city, temp:`${Math.round(temp)}°C`, feels:`${Math.round(feels||temp)}°C`, desc, humidity, wind, icon }
        }
      }

      // GITHUB card
      if (firstResult?.id?.includes('github') || /github|repo|trending.*code/i.test(q)) {
        const d = firstResult?.data
        const repo = d?.data?.[0] || d
        if (repo?.full_name || repo?.name) {
          card = { type:'github', name:repo.full_name||repo.name, desc:repo.description||'', stars:String(repo.stargazers_count||repo.stars||0), forks:String(repo.forks_count||0), lang:repo.language||'', url:repo.html_url||repo.url||'' }
        }
      }

      // NEWS card
      if (firstResult?.id?.includes('news') || intent.cat === 'news') {
        const d = firstResult?.data
        const arts = d?.results || d?.articles || d?.data || []
        if (arts.length > 0) {
          card = { type:'news', articles: arts.slice(0,5).map((a: any) => ({
            title: a.title||a.headline||'',
            source: a.source_id||a.source?.name||a.publication||'',
            url: a.link||a.url||'#',
            time: a.pubDate||a.publishedAt||''
          }))}
        }
      }

      // CANVA card (auto-detect design requests)
      if (!card && /poster|banner|card|flyer|resume|cv|presentation|slides|design|thumbnail|logo/i.test(q)) {
        const templateMap: Record<string,string> = {
          poster:'poster',banner:'banner',card:'card',flyer:'flyer',
          resume:'resume',cv:'resume',presentation:'presentation',slides:'presentation',
          thumbnail:'youtube-thumbnail',logo:'logo'
        }
        const templateType = Object.entries(templateMap).find(([k])=>q.includes(k))?.[1] || 'design'
        const topic = message.replace(/poster|banner|card|flyer|design|banao|create|make|bana|logo|resume/gi,'').trim()
        const canvaUrl = `https://www.canva.com/design/new?template=${encodeURIComponent(templateType)}&q=${encodeURIComponent(topic)}`
        card = { type:'canva', designUrl: canvaUrl, title: `${topic || 'Your'} ${templateType}`, templateType: `Canva ${templateType}` }
      }

      // YOUTUBE card
      if (!card && /youtube|video dekho|video dikhao|watch.*video|yt.*video/i.test(q)) {
        const ytQuery = message.replace(/youtube|video dekho|video dikhao|watch|yt|search|dikhao|batao/gi,'').trim()
        const videoId = firstResult?.data?.items?.[0]?.id?.videoId || ''
        const title = firstResult?.data?.items?.[0]?.snippet?.title || ytQuery
        if (videoId) {
          card = { type:'youtube', videoId, title }
        } else {
          // Fallback — search link card
          card = { type:'links', title:`YouTube: ${ytQuery}`, items:[
            { icon:'▶️', label:`Search "${ytQuery}" on YouTube`, url:`https://www.youtube.com/results?search_query=${encodeURIComponent(ytQuery)}` },
            { icon:'🎵', label:'YT Music', url:`https://music.youtube.com/search?q=${encodeURIComponent(ytQuery)}` },
          ]}
        }
      }

      // WOLFRAM card (math/science computation)
      if (!card && /wolfram|calculate|solve|integral|derivative|equation|expand|simplify|matrix|compute/i.test(q)) {
        const wolframQ = message.replace(/wolfram|solve karo|calculate|compute|karo/gi,'').trim()
        card = { type:'wolfram', query: wolframQ,
          embedUrl: `https://www.wolframalpha.com/input/embed/?i=${encodeURIComponent(wolframQ)}&output=JSON` }
      }

      // DESMOS card (graph/plot)
      if (!card && /graph|plot|desmos|function|curve|parabola|sin|cos|tan|draw.*function/i.test(q)) {
        const expr = message.replace(/graph|plot|desmos|banao|dikhao|draw|function|of/gi,'').trim()
        card = { type:'desmos', expression: expr || 'y = x^2' }
      }

      // GOOGLE MAPS card
      if (!card && /map|location|kahan hai|rasta|navigate|directions|near me|maps/i.test(q)) {
        const place = message.replace(/map|location|kahan hai|rasta|navigate|directions|near me|maps|dikhao|batao/gi,'').trim()
        card = { type:'maps', query: place,
          embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(place)}&output=embed&z=14` }
      }

      // REPLIT card (code run)
      if (!card && /replit|run.*code|code.*run|python.*run|nodejs.*run|execute/i.test(q)) {
        const langMap: Record<string,string> = { python:'python3', node:'nodejs', js:'nodejs', react:'reactts', java:'java', cpp:'cpp' }
        const lang = Object.keys(langMap).find(k=>q.includes(k)) || 'python3'
        card = { type:'replit', lang: lang.toUpperCase(), replUrl: `https://replit.com/new/${langMap[lang]||'python3'}` }
      }

      // SPOTIFY / MUSIC links fallback
      if (!card && /spotify|gaana|music|playlist/i.test(q)) {
        const mq = message.replace(/spotify|gaana|music|playlist|dhundho|search/gi,'').trim()
        card = { type:'links', title:`🎵 Music: ${mq}`, items:[
          { icon:'🟢', label:'Spotify pe search karo', url:`https://open.spotify.com/search/${encodeURIComponent(mq)}` },
          { icon:'🎵', label:'YouTube Music', url:`https://music.youtube.com/search?q=${encodeURIComponent(mq)}` },
          { icon:'🟠', label:'JioSaavn', url:`https://www.jiosaavn.com/search/${encodeURIComponent(mq)}` },
          { icon:'🔴', label:'Gaana', url:`https://gaana.com/search/${encodeURIComponent(mq)}` },
        ]}
      }

      // FIGMA card
      if (!card && /figma|ui design|wireframe|prototype|ux design/i.test(q)) {
        const figQ = message.replace(/figma|banao|design|create|ui|ux|wireframe/gi,'').trim()
        card = { type:'links', title:'🖊️ Figma — UI Design', items:[
          { icon:'✨', label:'New Figma File', url:'https://www.figma.com/design/new' },
          { icon:'🌐', label:`Community: "${figQ}"`, url:`https://www.figma.com/community/search?query=${encodeURIComponent(figQ)}` },
          { icon:'🟡', label:'New FigJam Board', url:'https://www.figma.com/figjam/new' },
        ]}
      }

    } catch {}

    send({ type: 'done', toolsUsed, reply, card, meta: { intent: intent.reason, totalMs: Date.now() - t0 } })

    w.close()
  })()

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' }
  })
}
