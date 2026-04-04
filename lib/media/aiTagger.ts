// lib/media/aiTagger.ts — AI Vision Tagging v1
// Uses Puter GPT-4o vision to auto-tag uploaded images
// Tags stored in IndexedDB → fully searchable gallery

// ── Common tag categories ─────────────────────────────────
// Nature: mountain, ocean, forest, sunset, sky, flowers
// People: person, family, friends, portrait, selfie, crowd
// Places: city, road, building, market, temple, house, school
// Food: food, snacks, fruits, vegetables, meal, chai, biryani
// Animals: dog, cat, cow, bird, elephant, insect
// Objects: phone, laptop, car, bike, book, clothes
// Events: wedding, birthday, festival, exam, cricket, diwali
// Colors: red, blue, green, yellow, dark, bright, colorful
// Time: morning, evening, night, dawn

const TAGGER_PROMPT = `You are an image tagging AI. Look at this image and return ONLY a JSON array of 5-12 short English/Hindi tags.

Rules:
- Max 2 words per tag
- Mix: what's in it, colors, mood, setting, time of day
- Include Indian context tags if relevant (chai, gully, temple, etc.)
- Return ONLY valid JSON array, no explanation
- Example: ["sunset", "ocean", "orange sky", "peaceful", "evening", "nature"]`

// ── Tag an image via Puter vision ─────────────────────────
export async function tagImageWithAI(
  imageUrlOrBase64: string,
  timeoutMs = 12000
): Promise<string[]> {
  if (typeof window === 'undefined' || !window.puter?.ai) return []

  try {
    // Build message with image
    const isBase64 = imageUrlOrBase64.startsWith('data:')
    const isBlob   = imageUrlOrBase64.startsWith('blob:')

    let imageData: string = imageUrlOrBase64

    // Convert blob URL to base64 for Puter
    if (isBlob) {
      try {
        const res   = await fetch(imageUrlOrBase64)
        const blob  = await res.blob()
        const b64   = await blobToBase64(blob)
        imageData   = b64
      } catch { return [] }
    }

    // Puter AI chat with image content
    const response = await Promise.race([
      window.puter.ai.chat([
        {
          role: 'user',
          content: [
            {
              type:      'image_url',
              image_url: { url: imageData },
            },
            {
              type: 'text',
              text: TAGGER_PROMPT,
            },
          ],
        },
      ] as any),
      new Promise<null>((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs)),
    ])

    if (!response) return []

    const text = typeof response === 'string'
      ? response
      : (response as any)?.message?.content || (response as any)?.content || ''

    // Parse JSON array from response
    const match = text.match(/\[[\s\S]*?\]/)
    if (!match) return []
    const tags: string[] = JSON.parse(match[0])
    return tags
      .filter((t: any) => typeof t === 'string' && t.length > 0 && t.length < 30)
      .map((t: string) => t.toLowerCase().trim())
      .slice(0, 12)
  } catch (e) {
    console.warn('[AITagger] Failed:', e)
    return []
  }
}

// ── Rule-based fallback tagger (zero AI, instant) ─────────
export function basicTagger(filename: string): string[] {
  const name = filename.toLowerCase()
  const tags: string[] = []

  // Time hints
  const now = new Date()
  const hour = now.getHours()
  if (hour >= 5  && hour < 12) tags.push('morning')
  if (hour >= 12 && hour < 17) tags.push('afternoon')
  if (hour >= 17 && hour < 20) tags.push('evening')
  if (hour >= 20 || hour < 5)  tags.push('night')

  // Filename hints
  if (/selfie|me|myself/.test(name)) tags.push('selfie', 'person')
  if (/food|eat|lunch|dinner|biryani|chai/.test(name)) tags.push('food')
  if (/trip|travel|tour/.test(name)) tags.push('travel')
  if (/birthday|party|celebration/.test(name)) tags.push('celebration')
  if (/screenshot|screen/.test(name)) tags.push('screenshot')
  if (/doc|document|note|paper/.test(name)) tags.push('document')
  if (/friend|gang|group/.test(name)) tags.push('friends', 'people')

  // File type
  if (/\.png$/.test(name)) tags.push('screenshot')

  return [...new Set(tags)]
}

// ── Smart tagger: AI if available, else basic ─────────────
export async function autoTag(
  imageUrl: string,
  filename: string,
  useAI = true
): Promise<string[]> {
  // Basic tags first (instant)
  const basic = basicTagger(filename)

  // AI tags if Puter available and signed in
  if (useAI && window.puter?.auth?.isSignedIn?.()) {
    const aiTags = await tagImageWithAI(imageUrl).catch(() => [])
    if (aiTags.length > 0) {
      return [...new Set([...aiTags, ...basic])]
    }
  }

  return basic
}

// ── Search tags ───────────────────────────────────────────
export function matchesTags(itemTags: string[] = [], query: string): boolean {
  if (!query.trim()) return true
  const q = query.toLowerCase().trim()
  const words = q.split(/\s+/)
  return words.every(word =>
    itemTags.some(t => t.includes(word)) ||
    // Also check common translations
    TRANSLATIONS[word]?.some((alt: string) => itemTags.some(t => t.includes(alt)))
  )
}

// ── Hindi → English tag translations ─────────────────────
const TRANSLATIONS: Record<string, string[]> = {
  'khana':    ['food', 'meal', 'eat'],
  'sundar':   ['beautiful', 'pretty', 'scenic'],
  'paani':    ['water', 'ocean', 'river', 'lake'],
  'gaadi':    ['car', 'vehicle', 'bike', 'auto'],
  'dost':     ['friend', 'friends', 'people'],
  'subah':    ['morning', 'sunrise', 'dawn'],
  'shaam':    ['evening', 'sunset', 'dusk'],
  'raat':     ['night', 'dark', 'midnight'],
  'phool':    ['flower', 'flowers', 'garden'],
  'mandir':   ['temple', 'religious', 'holy'],
  'baarish':  ['rain', 'rainy', 'wet', 'monsoon'],
  'ghar':     ['home', 'house', 'room', 'indoor'],
  'baazar':   ['market', 'shopping', 'street'],
  'jungle':   ['forest', 'trees', 'nature', 'green'],
  'nadiyan':  ['river', 'water', 'stream'],
}

// ── Helper: Blob → base64 ─────────────────────────────────
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = () => rej(new Error('FileReader failed'))
    r.readAsDataURL(blob)
  })
}
