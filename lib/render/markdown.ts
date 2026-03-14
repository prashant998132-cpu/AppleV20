// lib/render/markdown.ts
// JARVIS Chat Renderer v25
// Claude/ChatGPT-level code blocks, markdown, math

'use client'

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function renderKaTeX(formula: string, display: boolean): string {
  try {
    if (typeof window !== 'undefined' && (window as any).katex) {
      return (window as any).katex.renderToString(formula, { displayMode: display, throwOnError: false, output: 'html', trust: false })
    }
  } catch {}
  return display
    ? `<div class="math-display" style="overflow-x:auto;padding:8px;background:rgba(0,229,255,.06);border-radius:6px;text-align:center;font-family:monospace;color:#00e5ff">$$${esc(formula)}$$</div>`
    : `<code style="color:#00e5ff;background:rgba(0,229,255,.08);padding:1px 4px;border-radius:3px">$${esc(formula)}$</code>`
}

function processMath(text: string): string {
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, f) => renderKaTeX(f.trim(), true))
  text = text.replace(/\$([^$\n]+?)\$/g, (orig, f) => {
    if (/[+\-=^_{}\\]|\\[a-zA-Z]|\d/.test(f)) return renderKaTeX(f.trim(), false)
    return orig
  })
  return text
}

// Language → color mapping (like VS Code / GitHub)
const LANG_COLORS: Record<string, string> = {
  js:'#f7df1e', javascript:'#f7df1e', ts:'#3178c6', typescript:'#3178c6',
  py:'#3776ab', python:'#3776ab', rs:'#f74c00', rust:'#f74c00',
  go:'#00add8', java:'#ed8b00', cpp:'#f34b7d', c:'#555555',
  css:'#563d7c', html:'#e34c26', sh:'#89e051', bash:'#89e051',
  json:'#f39c12', md:'#083fa1', markdown:'#083fa1', sql:'#e38c00',
  jsx:'#61dafb', tsx:'#3178c6', vue:'#42b883', svelte:'#ff3e00',
  dart:'#00b4ab', kotlin:'#7f52ff', swift:'#f05138', rb:'#701516',
  php:'#4f5d95', r:'#276dc3', yaml:'#cb171e', xml:'#f34b7d',
}

function processCode(text: string): string {
  // Fenced code blocks — clean approach, no inline JS escaping issues
  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = esc(code.trim())
    const langLower = lang.toLowerCase()
    const langColor = LANG_COLORS[langLower] || '#8899aa'
    const langLabel = lang
      ? `<span style="font-size:10px;font-weight:600;color:${langColor};letter-spacing:.5px;text-transform:uppercase">${lang}</span>`
      : `<span style="font-size:10px;color:#667788">CODE</span>`
    // Store code in data-attribute — no inline JS escaping issues!
    const safeCode = code.trim().replace(/"/g,'&quot;').replace(/'/g,'&#39;')
    const copyBtn = `<button 
      data-copy="${safeCode}"
      onclick="(()=>{const b=this;const t=b.getAttribute('data-copy').replace(/&quot;/g,'\"').replace(/&#39;/g,\"'\");navigator.clipboard.writeText(t).then(()=>{b.textContent='✓ Copied';b.style.color='#34d399';setTimeout(()=>{b.textContent='⎘ Copy';b.style.color=''},2000)}).catch(()=>{})})()"
      style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:6px;color:rgba(255,255,255,.5);padding:3px 9px;cursor:pointer;font-size:11px;font-family:inherit;transition:all .15s"
      onmouseover="this.style.color='rgba(255,255,255,.9)'"
      onmouseout="this.style.color='rgba(255,255,255,.5)'"
    >⎘ Copy</button>`

    return `<div style="background:rgba(5,8,15,.8);border:1px solid rgba(255,255,255,.09);border-radius:10px;overflow:hidden;margin:10px 0">
  <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(255,255,255,.04);border-bottom:1px solid rgba(255,255,255,.07)">
    ${langLabel}
    ${copyBtn}
  </div>
  <pre style="margin:0;padding:12px 14px;overflow-x:auto;font-size:12.5px;line-height:1.6"><code style="color:#e8f4ff;font-family:'Space Mono',Consolas,monospace;white-space:pre">${escaped}</code></pre>
</div>`
  })
  // Inline code
  text = text.replace(/`([^`]+)`/g, (_, code) =>
    `<code style="background:rgba(0,229,255,.1);color:#00e5ff;padding:1.5px 6px;border-radius:5px;font-family:'Space Mono',monospace;font-size:0.88em;border:1px solid rgba(0,229,255,.15)">${esc(code)}</code>`
  )
  return text
}


export function renderMarkdown(raw: string): string {
  if (!raw) return ''
  let t = raw

  // 1. Protect code blocks
  const codeBlocks: string[] = []
  t = t.replace(/```[\s\S]*?```/g, m => { codeBlocks.push(m); return `\x00CODE${codeBlocks.length-1}\x00` })
  const inlineCodes: string[] = []
  t = t.replace(/`[^`]+`/g, m => { inlineCodes.push(m); return `\x00INLINE${inlineCodes.length-1}\x00` })

  // 2. Math
  t = processMath(t)

  // 3. Block-level
  const lines = t.split('\n')
  const out: string[] = []
  let inList = false, inOL = false

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    // Headings
    if (/^### (.+)/.test(line))      { if(inList){out.push('</ul>');inList=false}if(inOL){out.push('</ol>');inOL=false}; out.push(`<h3 style="font-size:15px;font-weight:700;color:var(--text);margin:14px 0 6px;line-height:1.4">${line.replace(/^### /,'')}</h3>`); continue }
    if (/^## (.+)/.test(line))       { if(inList){out.push('</ul>');inList=false}if(inOL){out.push('</ol>');inOL=false}; out.push(`<h2 style="font-size:16px;font-weight:700;color:var(--text);margin:16px 0 6px;border-bottom:1px solid var(--border);padding-bottom:4px">${line.replace(/^## /,'')}</h2>`); continue }
    if (/^# (.+)/.test(line))        { if(inList){out.push('</ul>');inList=false}if(inOL){out.push('</ol>');inOL=false}; out.push(`<h1 style="font-size:18px;font-weight:800;color:var(--text);margin:16px 0 8px">${line.replace(/^# /,'')}</h1>`); continue }
    
    // Horizontal rule
    if (/^---+$/.test(line.trim()))  { out.push('<hr style="border:none;border-top:1px solid var(--border);margin:12px 0"/>'); continue }

    // Ordered list
    if (/^\d+\. (.+)/.test(line)) {
      if (inList) { out.push('</ul>'); inList = false }
      if (!inOL) { out.push('<ol style="margin:6px 0;padding-left:22px;display:flex;flex-direction:column;gap:3px">'); inOL = true }
      out.push(`<li style="font-size:13.5px;line-height:1.6;color:var(--text)">${inlineFormat(line.replace(/^\d+\. /,''))}</li>`)
      continue
    }

    // Unordered list
    if (/^[-*•] (.+)/.test(line)) {
      if (inOL) { out.push('</ol>'); inOL = false }
      if (!inList) { out.push('<ul style="margin:6px 0;padding-left:18px;display:flex;flex-direction:column;gap:3px;list-style:none">'); inList = true }
      out.push(`<li style="font-size:13.5px;line-height:1.6;color:var(--text);display:flex;gap:7px;align-items:baseline"><span style="color:var(--accent);flex-shrink:0;font-size:10px">▸</span><span>${inlineFormat(line.replace(/^[-*•] /,''))}</span></li>`)
      continue
    }

    // Close lists
    if (inList && line.trim() === '') { out.push('</ul>'); inList = false }
    if (inOL && line.trim() === '') { out.push('</ol>'); inOL = false }

    // Blockquote
    if (/^> (.+)/.test(line)) {
      out.push(`<blockquote style="border-left:3px solid var(--accent);padding:4px 12px;margin:6px 0;color:var(--text-muted);font-style:italic;background:var(--accent-dim);border-radius:0 6px 6px 0">${inlineFormat(line.replace(/^> /,''))}</blockquote>`)
      continue
    }

    // Empty line
    if (line.trim() === '') { out.push('<div style="height:6px"/>'); continue }

    // Normal paragraph
    out.push(`<p style="margin:0 0 4px;font-size:13.5px;line-height:1.7;color:inherit">${inlineFormat(line)}</p>`)
  }

  if (inList) out.push('</ul>')
  if (inOL) out.push('</ol>')

  t = out.join('\n')

  // 4. Restore
  t = t.replace(/\x00CODE(\d+)\x00/g, (_, i) => processCode(codeBlocks[+i]))
  t = t.replace(/\x00INLINE(\d+)\x00/g, (_, i) => processCode(inlineCodes[+i]))

  return t
}

function inlineFormat(text: string): string {
  // Bold + italic
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text);font-weight:700">$1</strong>')
  text = text.replace(/\*(.+?)\*/g, '<em style="color:var(--text-dim)">$1</em>')
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>')
  text = text.replace(/_(.+?)_/g, '<em>$1</em>')
  // Strikethrough
  text = text.replace(/~~(.+?)~~/g, '<del style="opacity:.6">$1</del>')
  // Links
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:underline;text-underline-offset:2px">$1</a>')
  return text
}
