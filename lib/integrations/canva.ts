// lib/integrations/canva.ts — JARVIS × Canva Integration v1
// Zero backend, zero OAuth, zero API key needed
// Uses Canva's public URL scheme + AI design brief generation

// ── Canva Design Categories ───────────────────────────────
export interface CanvaTemplate {
  id: string
  name: string
  emoji: string
  category: string
  canvaUrl: string          // base URL for this design type
  textParam?: string        // URL param name for injecting text
  dimensions?: string
  tags: string[]
}

export const CANVA_TEMPLATES: CanvaTemplate[] = [
  // Social Media
  { id: 'instagram_post',   emoji: '📸', name: 'Instagram Post',    category: 'Social', dimensions: '1080×1080', canvaUrl: 'https://www.canva.com/create/instagram-posts/',    tags: ['social','instagram','square','post'] },
  { id: 'instagram_story',  emoji: '📱', name: 'Instagram Story',   category: 'Social', dimensions: '1080×1920', canvaUrl: 'https://www.canva.com/create/instagram-stories/',  tags: ['social','story','vertical'] },
  { id: 'whatsapp_status',  emoji: '💬', name: 'WhatsApp Status',   category: 'Social', dimensions: '1080×1920', canvaUrl: 'https://www.canva.com/create/whatsapp-status/',    tags: ['whatsapp','status','social'] },
  { id: 'youtube_thumbnail',emoji: '▶️', name: 'YouTube Thumbnail', category: 'Social', dimensions: '1280×720',  canvaUrl: 'https://www.canva.com/create/youtube-thumbnails/', tags: ['youtube','thumbnail','video'] },
  { id: 'twitter_post',     emoji: '🐦', name: 'Twitter/X Post',    category: 'Social', dimensions: '1600×900',  canvaUrl: 'https://www.canva.com/create/twitter-posts/',     tags: ['twitter','x','social'] },
  { id: 'facebook_post',    emoji: '👥', name: 'Facebook Post',     category: 'Social', dimensions: '940×788',   canvaUrl: 'https://www.canva.com/create/facebook-posts/',    tags: ['facebook','social'] },

  // Documents
  { id: 'resume',           emoji: '📄', name: 'Resume/CV',         category: 'Docs',   dimensions: 'A4',        canvaUrl: 'https://www.canva.com/create/resumes/',           tags: ['resume','cv','job','career'] },
  { id: 'poster',           emoji: '🖼️', name: 'Poster',            category: 'Docs',   dimensions: '42×59cm',   canvaUrl: 'https://www.canva.com/create/posters/',           tags: ['poster','print','event'] },
  { id: 'flyer',            emoji: '📋', name: 'Flyer',             category: 'Docs',   dimensions: 'A5',        canvaUrl: 'https://www.canva.com/create/flyers/',            tags: ['flyer','leaflet','event'] },
  { id: 'presentation',     emoji: '📊', name: 'Presentation',      category: 'Docs',   dimensions: '16:9',      canvaUrl: 'https://www.canva.com/create/presentations/',     tags: ['presentation','slides','ppt'] },
  { id: 'certificate',      emoji: '🏆', name: 'Certificate',       category: 'Docs',   dimensions: 'A4',        canvaUrl: 'https://www.canva.com/create/certificates/',      tags: ['certificate','award','appreciation'] },
  { id: 'invitation',       emoji: '💌', name: 'Invitation Card',   category: 'Docs',   dimensions: '5×7 in',    canvaUrl: 'https://www.canva.com/create/invitations/',       tags: ['invitation','party','wedding','birthday'] },

  // India specific
  { id: 'business_card',    emoji: '💼', name: 'Business Card',     category: 'India',  dimensions: '3.5×2 in',  canvaUrl: 'https://www.canva.com/create/business-cards/',    tags: ['business','card','visiting','contact'] },
  { id: 'banner',           emoji: '🎯', name: 'Banner/Flex',       category: 'India',  dimensions: '728×90',    canvaUrl: 'https://www.canva.com/create/banners/',           tags: ['banner','flex','print','event'] },
  { id: 'menu',             emoji: '🍽️', name: 'Restaurant Menu',   category: 'India',  dimensions: 'A4',        canvaUrl: 'https://www.canva.com/create/menus/',             tags: ['menu','restaurant','food','hotel'] },
  { id: 'logo',             emoji: '✨', name: 'Logo',              category: 'India',  dimensions: 'Square',    canvaUrl: 'https://www.canva.com/create/logos/',             tags: ['logo','brand','business','icon'] },

  // Education
  { id: 'infographic',      emoji: '📈', name: 'Infographic',       category: 'Edu',    dimensions: '800×2000',  canvaUrl: 'https://www.canva.com/create/infographics/',      tags: ['infographic','info','data','visual'] },
  { id: 'mind_map',         emoji: '🧠', name: 'Mind Map',          category: 'Edu',    dimensions: 'A3',        canvaUrl: 'https://www.canva.com/create/mind-maps/',         tags: ['mindmap','study','notes','learning'] },
  { id: 'worksheet',        emoji: '📝', name: 'Worksheet',         category: 'Edu',    dimensions: 'A4',        canvaUrl: 'https://www.canva.com/create/worksheets/',        tags: ['worksheet','study','school','education'] },
]

// ── Match templates from natural language ─────────────────
export function matchTemplate(query: string): CanvaTemplate[] {
  const q = query.toLowerCase()
  const scored = CANVA_TEMPLATES.map(t => {
    let score = 0
    if (t.name.toLowerCase().includes(q)) score += 5
    if (t.category.toLowerCase().includes(q)) score += 3
    score += t.tags.filter(tag => q.includes(tag) || tag.includes(q)).length * 2
    // Hindi keywords
    if (/instagram|insta/.test(q) && t.id.startsWith('instagram')) score += 5
    if (/resume|cv|naukri|job/.test(q) && t.id === 'resume') score += 5
    if (/poster|flex|banner/.test(q) && ['poster','banner','flyer'].includes(t.id)) score += 5
    if (/logo|brand/.test(q) && t.id === 'logo') score += 5
    if (/presentation|ppt|slides/.test(q) && t.id === 'presentation') score += 5
    if (/certificate|sertificate/.test(q) && t.id === 'certificate') score += 5
    if (/invitation|shaadi|birthday|bday/.test(q) && t.id === 'invitation') score += 5
    if (/business.?card|visiting.?card/.test(q) && t.id === 'business_card') score += 5
    if (/youtube|thumbnail/.test(q) && t.id === 'youtube_thumbnail') score += 5
    if (/mind.?map|mindmap/.test(q) && t.id === 'mind_map') score += 5
    if (/menu|restaurant|dhaba/.test(q) && t.id === 'menu') score += 5
    return { ...t, score }
  })
  return scored.filter(t => t.score > 0).sort((a, b) => b.score - a.score).slice(0, 4)
}

// ── Generate Canva deep link ──────────────────────────────
export function buildCanvaUrl(template: CanvaTemplate, text?: string): string {
  let url = template.canvaUrl
  if (text) {
    // Canva supports ?text= param on some templates
    url += `?text=${encodeURIComponent(text.slice(0, 100))}`
  }
  return url
}

// ── AI Design Brief Generator ─────────────────────────────
// Returns a structured design brief for Canva
export async function generateDesignBrief(
  prompt: string,
  template: CanvaTemplate
): Promise<string> {
  if (typeof window === 'undefined' || !window.puter?.ai) {
    return defaultBrief(prompt, template)
  }

  try {
    const resp = await Promise.race([
      window.puter.ai.chat([{
        role: 'user',
        content: `You are a graphic design consultant. Give a concise design brief for a ${template.name}.

Request: "${prompt}"

Reply in this exact format (no extra text):
TITLE: [short headline, max 8 words]
TAGLINE: [supporting text, max 12 words]
COLORS: [3 color suggestions, e.g. "Navy #1A2744, Gold #FFD700, White #FFFFFF"]
STYLE: [one word: Modern/Bold/Elegant/Playful/Professional/Minimalist]
KEYWORDS: [5 search keywords for Canva templates, comma separated]`,
      }]),
      new Promise<null>((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
    ])

    if (!resp) return defaultBrief(prompt, template)
    const text = typeof resp === 'string' ? resp : (resp as any)?.message?.content || ''
    return text.trim() || defaultBrief(prompt, template)
  } catch {
    return defaultBrief(prompt, template)
  }
}

function defaultBrief(prompt: string, template: CanvaTemplate): string {
  return `TITLE: ${prompt.slice(0, 50)}
TAGLINE: Designed with JARVIS × Canva
COLORS: Deep Blue #0D1B2A, Cyan #00E5FF, White #FFFFFF
STYLE: Modern
KEYWORDS: ${template.tags.slice(0, 5).join(', ')}`
}

// ── Parse brief text into structured object ───────────────
export interface DesignBrief {
  title: string
  tagline: string
  colors: string
  style: string
  keywords: string
}

export function parseBrief(text: string): DesignBrief {
  const get = (key: string) => {
    const m = text.match(new RegExp(`${key}:\\s*(.+)`, 'i'))
    return m ? m[1].trim() : ''
  }
  return {
    title:    get('TITLE')    || 'Untitled Design',
    tagline:  get('TAGLINE')  || '',
    colors:   get('COLORS')   || '',
    style:    get('STYLE')    || 'Modern',
    keywords: get('KEYWORDS') || '',
  }
}

// ── Canva search URL (find templates by keyword) ──────────
export function canvaSearchUrl(query: string): string {
  return `https://www.canva.com/search/templates?q=${encodeURIComponent(query)}`
}

// ── Build full action URL with text pre-fill ──────────────
export function openCanvaTemplate(template: CanvaTemplate, text?: string): void {
  const url = buildCanvaUrl(template, text)
  window.open(url, '_blank', 'noopener,noreferrer')
}
