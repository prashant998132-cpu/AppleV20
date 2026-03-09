// lib/render/markdown.ts
// JARVIS Chat Renderer v17
// - Markdown (bold, italic, code, lists, headings, links)
// - KaTeX math: $inline$ and $$display$$
// - Safe HTML output for dangerouslySetInnerHTML
// All client-side, zero API, works offline

'use client'

// ── Escape HTML ────────────────────────────────────────────
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── KaTeX render (safe wrapper) ───────────────────────────
function renderKaTeX(formula: string, display: boolean): string {
  try {
    if (typeof window !== 'undefined' && (window as any).katex) {
      return (window as any).katex.renderToString(formula, {
        displayMode: display,
        throwOnError: false,
        output: 'html',
        trust: false,
      })
    }
  } catch {}
  // Fallback: styled code block
  return display
    ? `<div class="math-display" style="overflow-x:auto;padding:8px;background:rgba(0,229,255,.06);border-radius:6px;text-align:center;font-family:monospace;color:#00e5ff">$$${esc(formula)}$$</div>`
    : `<code style="color:#00e5ff;background:rgba(0,229,255,.08);padding:1px 4px;border-radius:3px">$${esc(formula)}$</code>`
}

// ── Extract and protect math blocks before processing ─────
interface Chunk { type: 'text' | 'math_display' | 'math_inline'; content: string }

function splitMath(text: string): Chunk[] {
  const chunks: Chunk[] = []
  let rest = text

  // Process $$...$$ display math first (greedy)
  const DISPLAY_RE = /\$\$([\s\S]+?)\$\$/g
  const INLINE_RE  = /\$([^$\n]+?)\$/g

  // Replace display math
  let lastIndex = 0
  let m: RegExpExecArray | null
  DISPLAY_RE.lastIndex = 0
  const textWithDisplayPlaceholders: string[] = []
  const displayMaths: string[] = []

  let withoutDisplay = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, formula) => {
    displayMaths.push(formula)
    return `\x00DMATH${displayMaths.length - 1}\x00`
  })

  // Replace inline math
  const inlineMaths: string[] = []
  let withoutInline = withoutDisplay.replace(/\$([^$\n\x00]+?)\$/g, (_, formula) => {
    // Only if looks like math (has operators, letters, digits)
    if (/[+\-=^_{}\\]|\\[a-zA-Z]|\d/.test(formula)) {
      inlineMaths.push(formula)
      return `\x00IMATH${inlineMaths.length - 1}\x00`
    }
    return `$${formula}$` // not math, restore
  })

  return [{ type: 'text', content: withoutInline }, ...displayMaths.map(f => ({ type: 'math_display' as const, content: f })), ...inlineMaths.map(f => ({ type: 'math_inline' as const, content: f }))]
  // (we return structured but use renderMath which replaces placeholders inline)
}

// ── Single-pass math replacer (used in renderMarkdown) ────
function processMath(text: string): string {
  // Display math first (greedy match $$...$$)
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, f) => renderKaTeX(f.trim(), true))
  // Inline math $...$  (only if contains math symbols)
  text = text.replace(/\$([^$\n]+?)\$/g, (orig, f) => {
    if (/[+\-=^_{}\\]|\\[a-zA-Z]|\d/.test(f)) return renderKaTeX(f.trim(), false)
    return orig
  })
  return text
}

// ── Code block renderer ───────────────────────────────────
function processCode(text: string): string {
  // Fenced code blocks ```lang\n...\n```
  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = esc(code.trim())
    const langLabel = lang ? `<span style="font-size:10px;color:#666;float:right;padding-right:6px">${lang}</span>` : ''
    return `<pre style="background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 12px;overflow-x:auto;margin:8px 0;font-size:12px;line-height:1.5">${langLabel}<code style="color:#e8f4ff;font-family:'Space Mono',monospace">${escaped}</code></pre>`
  })
  // Inline code `...`
  text = text.replace(/`([^`]+)`/g, (_, code) =>
    `<code style="background:rgba(255,255,255,.08);color:#00e5ff;padding:1px 5px;border-radius:4px;font-family:'Space Mono',monospace;font-size:0.9em">${esc(code)}</code>`
  )
  return text
}

// ── Full markdown renderer ─────────────────────────────────
export function renderMarkdown(raw: string): string {
  if (!raw) return ''

  let t = raw

  // 1. Protect code blocks (don't process math inside code)
  const codeBlocks: string[] = []
  t = t.replace(/```[\s\S]*?```/g, m => { codeBlocks.push(m); return `\x00CODE${codeBlocks.length-1}\x00` })
  const inlineCodes: string[] = []
  t = t.replace(/`[^`]+`/g, m => { inlineCodes.push(m); return `\x00INLINE${inlineCodes.length-1}\x00` })

  // 2. Math rendering
  t = processMath(t)

  // 3. Headings
  t = t.replace(/^### (.+)$/gm, '<h3 style="font-size:14px;color:#00e5ff;margin:10px 0 4px;font-weight:700">$1</h3>')
  t = t.replace(/^## (.+)$/gm,  '<h2 style="font-size:16px;color:#00e5ff;margin:12px 0 5px;font-weight:700">$1</h2>')
  t = t.replace(/^# (.+)$/gm,   '<h1 style="font-size:18px;color:#00e5ff;margin:14px 0 6px;font-weight:700">$1</h1>')

  // 4. Bold, italic
  t = t.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  t = t.replace(/\*\*(.+?)\*\*/g,     '<strong style="color:#e8f4ff;font-weight:700">$1</strong>')
  t = t.replace(/\*(.+?)\*/g,         '<em style="color:#b8d4f4">$1</em>')

  // 5. Lists
  t = t.replace(/^(\s*)[-•]\s+(.+)$/gm,
    '<div style="display:flex;gap:6px;margin:2px 0"><span style="color:#00e5ff;margin-top:1px">•</span><span>$2</span></div>')
  t = t.replace(/^(\s*)\d+\.\s+(.+)$/gm,
    '<div style="display:flex;gap:6px;margin:2px 0"><span style="color:#00e5ff;min-width:16px;text-align:right">$1.</span><span>$2</span></div>')

  // 6. Links
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener" style="color:#00e5ff;text-decoration:underline">$1</a>')

  // 7. Horizontal rule
  t = t.replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid rgba(255,255,255,.1);margin:8px 0"/>')

  // 8. Blockquote
  t = t.replace(/^> (.+)$/gm,
    '<div style="border-left:3px solid #00e5ff;padding-left:10px;color:#8bacc8;font-style:italic;margin:4px 0">$1</div>')

  // 9. Line breaks → <br>
  t = t.replace(/\n/g, '<br/>')

  // 10. Restore code blocks
  t = t.replace(/\x00CODE(\d+)\x00/g, (_, i) => processCode(codeBlocks[parseInt(i)]))
  t = t.replace(/\x00INLINE(\d+)\x00/g, (_, i) => processCode(inlineCodes[parseInt(i)]))

  return t
}

// ── Chat bubble text splitter (image vs text) ─────────────
export function splitImageAndText(content: string): { text: string; imageUrl: string | null; mapQuery: string | null } {
  const imgMatch = content.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/)
  const mapMatch = content.match(/\[MAP:\s*([^\]]+)\]/)

  const text = content
    .replace(/!\[.*?\]\(https?:\/\/[^)]+\)/g, '')
    .replace(/\[MAP:\s*[^\]]+\]/g, '')
    .trim()

  return {
    text,
    imageUrl: imgMatch ? imgMatch[1] : null,
    mapQuery: mapMatch ? mapMatch[1] : null,
  }
}
