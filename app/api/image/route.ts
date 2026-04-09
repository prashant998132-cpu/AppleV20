// app/api/image/route.ts — JARVIS Image v2 — Zero Base64 Policy
// VERCEL BANDWIDTH OPTIMIZATION:
//   - Pollinations = URL only (client loads directly, zero Vercel)
//   - HuggingFace = client-side direct (zero Vercel) [see lib/media/image.ts]
//   - Gemini = returns binary stream (not base64 JSON) — server only for key privacy
//   - NEVER proxy large base64 blobs through Vercel

import { NextRequest, NextResponse } from 'next/server'

const STYLE_MAP: Record<string,string> = {
  realistic:   'hyperrealistic photography, 8K, DSLR, sharp, natural lighting',
  anime:       'anime art, Studio Ghibli style, vibrant, detailed illustration',
  artistic:    'oil painting, masterpiece, museum quality, textured brushwork',
  cinematic:   'cinematic shot, anamorphic lens, dramatic lighting, movie still',
  '3d':        '3D render, Octane render, ray tracing, photorealistic materials',
  bollywood:   'Bollywood poster, colorful, Indian aesthetic, dramatic composition',
  nature:      'Indian landscape, golden hour, wildlife photography, stunning',
  minimal:     'minimalist flat design, clean lines, simple, modern vector art',
  portrait:    'professional portrait, studio lighting, sharp focus, 8K detail',
  watercolor:  'watercolor painting, soft washes, artistic, beautiful texture',
}

// ── Pollinations URL (Zero Vercel) ────────────────────────
function pollinationsUrl(prompt: string, w=1024, h=1024, model='flux'): string {
  const seed = Math.floor(Math.random() * 99999)
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&model=${model}&nologo=true&seed=${seed}`
}

// ── Gemini Imagen — streams binary (key privacy reason) ───
async function geminiStream(prompt: string): Promise<ArrayBuffer | null> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${key}`,
    {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instances:[{prompt}], parameters:{sampleCount:1, aspectRatio:'1:1'} }),
      signal: AbortSignal.timeout(35000),
    }
  )
  if (!res.ok) return null
  const data = await res.json()
  const b64  = data.predictions?.[0]?.bytesBase64Encoded
  if (!b64) return null
  // Decode base64 on SERVER, return binary to client — saves 33% bandwidth
  const binary = atob(b64)
  const bytes  = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

// ── External links (Zero Vercel) ──────────────────────────
function externalLinks(prompt: string) {
  const q = encodeURIComponent(prompt)
  return [
    { name:'🎨 Pollinations (Direct)', url:`https://image.pollinations.ai/prompt/${q}?nologo=true`, limit:'Unlimited' },
    { name:'🎨 Bing Creator',          url:`https://www.bing.com/images/create?q=${q}`,             limit:'Unlimited' },
    { name:'🎨 Perchance AI',          url:'https://perchance.org/ai-text-to-image-generator',      limit:'Unlimited' },
    { name:'🎨 Leonardo AI',           url:'https://app.leonardo.ai/',                              limit:'150/day'   },
    { name:'🎨 Ideogram 2.0',          url:'https://ideogram.ai/',                                  limit:'25/day'    },
  ]
}

// ════════════════════════════════════════════════════════
// POST — Returns Pollinations URL (default) or binary stream (Gemini only)
// ════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const { prompt, style, provider: pref, width=1024, height=1024, model='flux' } = await req.json()
  if (!prompt) return NextResponse.json({ error:'No prompt' }, { status:400 })

  let enhanced = prompt
  if (style && STYLE_MAP[style]) enhanced += ', ' + STYLE_MAP[style]
  enhanced += ', high quality, 4K'

  // Gemini: API key privacy → server-side, returns BINARY (not base64 JSON)
  if (pref === 'gemini') {
    try {
      const buffer = await geminiStream(enhanced)
      if (buffer && buffer.byteLength > 1000) {
        return new Response(buffer, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
            'X-Image-Provider': 'Gemini Imagen 3',
          },
        })
      }
    } catch { /* fallback */ }
  }

  // Default: Pollinations URL — client loads directly (ZERO Vercel bandwidth)
  const url = pollinationsUrl(enhanced, width, height, model)
  return NextResponse.json({
    imageUrl: url,
    provider: 'Pollinations.ai (Unlimited Free)',
    note: 'Client loads this URL directly — zero Vercel bandwidth',
    externalLinks: externalLinks(prompt),
  })
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get('prompt') || 'landscape'
  return NextResponse.json({
    v: 2,
    strategy: 'url_first_binary_stream',
    note: 'All images are URLs (zero Vercel bandwidth). Gemini = binary stream (not base64).',
    providers: [
      { id:'pollinations', vercelBandwidth:'0 bytes',   free:true,  key:false,                           quality:3 },
      { id:'hf_client',    vercelBandwidth:'0 bytes',   free:true,  key:'HUGGINGFACE_TOKEN (optional)',   quality:5, note:'Client-side direct' },
      { id:'gemini',       vercelBandwidth:'~600KB img', free:true, key:!!process.env.GEMINI_API_KEY,     quality:5, note:'Binary stream (not base64 JSON)' },
    ],
    externalLinks: externalLinks(p),
  })
}
