// app/api/tts/route.ts — JARVIS TTS v2 — Binary Streaming
// VERCEL BANDWIDTH OPTIMIZATION:
//   - Returns binary audio stream (NOT base64 JSON) — saves 33% bandwidth
//   - Client plays via URL.createObjectURL(blob)
//   - Edge TTS = free, no key, best Hindi quality (primary)
//   - Browser Web Speech API = use client-side first (zero Vercel)

import { NextRequest, NextResponse } from 'next/server'

function audioResponse(buffer: ArrayBuffer, mimeType = 'audio/mpeg', provider = 'TTS'): Response {
  return new Response(buffer, {
    headers: {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      'X-TTS-Provider': provider,
    },
  })
}

// ── 1. Edge TTS (Microsoft, No Key Required, Free) ────────
async function edgeTTS(text: string, voiceName = 'hi-IN-SwaraNeural', speed = 1.0): Promise<ArrayBuffer> {
  const rate = speed >= 1 ? `+${Math.round((speed - 1) * 100)}%` : `${Math.round((speed - 1) * 100)}%`
  const esc  = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const lang = voiceName.startsWith('hi') ? 'hi-IN' : 'en-IN'
  const ssml = `<speak version='1.0' xml:lang='${lang}'><voice name='${voiceName}'><prosody rate='${rate}'>${esc}</prosody></voice></speak>`
  const res = await fetch(
    'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
      },
      body: ssml,
      signal: AbortSignal.timeout(12000),
    }
  )
  if (!res.ok) throw new Error('edge_' + res.status)
  return res.arrayBuffer()
}

// ── 2. Azure Neural TTS ────────────────────────────────────
async function azureTTS(text: string, lang: string, speed: number, voiceName?: string): Promise<ArrayBuffer> {
  const key = process.env.AZURE_TTS_KEY
  const region = process.env.AZURE_REGION || 'eastus'
  if (!key) throw new Error('no_key')
  const voice = voiceName || (lang === 'hi' ? 'hi-IN-SwaraNeural' : 'en-IN-NeerjaNeural')
  const esc   = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const ssml  = `<speak version='1.0' xml:lang='${lang === 'en' ? 'en-IN' : 'hi-IN'}'><voice name='${voice}'><prosody rate='${speed}'>${esc}</prosody></voice></speak>`
  const tok   = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
    { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': key }, signal: AbortSignal.timeout(5000) })
  if (!tok.ok) throw new Error('azure_tok')
  const token = await tok.text()
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3' },
    body: ssml, signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error('azure_' + res.status)
  return res.arrayBuffer()
}

// ── 3. Google Cloud TTS ────────────────────────────────────
async function googleTTS(text: string, lang: string, speed: number): Promise<ArrayBuffer> {
  const key = process.env.GOOGLE_TTS_KEY
  if (!key) throw new Error('no_key')
  const voice = lang === 'hi' ? 'hi-IN-Wavenet-D' : 'en-US-Wavenet-D'
  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input:{text}, voice:{languageCode: lang==='en'?'en-US':'hi-IN', name:voice}, audioConfig:{audioEncoding:'MP3', speakingRate:speed} }),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error('google_' + res.status)
  const data = await res.json()
  if (!data.audioContent) throw new Error('no_audio')
  const binary = atob(data.audioContent)
  const bytes  = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

// ── 4. ElevenLabs ─────────────────────────────────────────
async function elevenLabsTTS(text: string, lang: string): Promise<ArrayBuffer> {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) throw new Error('no_key')
  const voiceId = lang === 'hi' ? (process.env.ELEVENLABS_HINDI_VOICE||'pNInz6obpgDQGcFmaJgB') : (process.env.ELEVENLABS_VOICE_ID||'EXAVITQu4vr4xnSDxMaL')
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id:'eleven_multilingual_v2', voice_settings:{stability:0.5, similarity_boost:0.8} }),
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error('el_' + res.status)
  return res.arrayBuffer()
}

// ── 5. HuggingFace MMS ────────────────────────────────────
async function hfTTS(text: string, lang: string): Promise<ArrayBuffer> {
  const token  = process.env.HUGGINGFACE_TOKEN
  const model  = lang === 'hi' ? 'facebook/mms-tts-hin' : 'microsoft/speecht5_tts'
  const headers: Record<string,string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`,
    { method:'POST', headers, body:JSON.stringify({ inputs:text }), signal:AbortSignal.timeout(45000) })
  if (!res.ok) throw new Error('hf_' + res.status)
  return res.arrayBuffer()
}

// ════════════════════════════════════════════════════════
// POST — Returns BINARY AUDIO (not base64 JSON) = 33% less bandwidth
// ════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const { text, lang='hi', speed=1.0, voiceName } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error:'No text' }, { status:400 })
  const clean = text.trim().slice(0, 600)

  // Cascade — Edge TTS first (free, no key, great Hindi)
  const providers: Array<{id:string; fn:()=>Promise<ArrayBuffer>; mime:string}> = [
    { id:'edge',       fn:()=>edgeTTS(clean, voiceName, speed),        mime:'audio/mpeg' },
    { id:'azure',      fn:()=>azureTTS(clean, lang, speed, voiceName), mime:'audio/mpeg' },
    { id:'google',     fn:()=>googleTTS(clean, lang, speed),           mime:'audio/mpeg' },
    { id:'elevenlabs', fn:()=>elevenLabsTTS(clean, lang),              mime:'audio/mpeg' },
    { id:'hf',         fn:()=>hfTTS(clean, lang),                     mime:'audio/wav'  },
  ]

  for (const {id, fn, mime} of providers) {
    try {
      const buffer = await fn()
      if (buffer.byteLength < 500) continue
      return audioResponse(buffer, mime, id)
    } catch { /* try next */ }
  }

  // Browser fallback signal
  return NextResponse.json({ useBrowser:true, text:clean, lang, speed, provider:'Browser Web Speech' })
}

export async function GET() {
  return NextResponse.json({
    v: 2, strategy: 'binary_stream',
    note: 'Returns binary audio stream — 33% less Vercel bandwidth vs base64 JSON',
    providers: [
      { id:'edge',       free:true,  key:false,                             quality:4, hindi:true },
      { id:'azure',      free:false, key:!!process.env.AZURE_TTS_KEY,       quality:5, hindi:true },
      { id:'google',     free:false, key:!!process.env.GOOGLE_TTS_KEY,      quality:5, hindi:true },
      { id:'elevenlabs', free:false, key:!!process.env.ELEVENLABS_API_KEY,  quality:5, hindi:true },
      { id:'hf',         free:true,  key:!!process.env.HUGGINGFACE_TOKEN,   quality:3, hindi:true },
      { id:'browser',    free:true,  key:false,                             quality:2, hindi:true },
    ],
  })
}
