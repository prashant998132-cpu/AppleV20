'use client'
// components/markdown/MdRenderer.tsx
// PURE REACT — zero dangerouslySetInnerHTML — overlap IMPOSSIBLE
// Code blocks are React components, not injected HTML strings

import React, { useState, useCallback } from 'react'

/* ── helpers ─────────────────────────────────────────────── */
const LANG_COLOR: Record<string, string> = {
  js:'#f7df1e',javascript:'#f7df1e',ts:'#3178c6',typescript:'#3178c6',
  py:'#3776ab',python:'#3776ab',rs:'#f74c00',rust:'#f74c00',
  go:'#00add8',java:'#ed8b00',cpp:'#f34b7d',c:'#555',bash:'#89e051',
  sh:'#89e051',css:'#563d7c',html:'#e34c26',json:'#f39c12',sql:'#e38c00',
  jsx:'#61dafb',tsx:'#3178c6',dart:'#00b4ab',kotlin:'#7f52ff',swift:'#f05138',
}

/* ── Code block as a proper React component ─────────────── */
function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    }).catch(() => {})
  }, [code])
  const lc = lang.toLowerCase()
  const color = LANG_COLOR[lc] || '#8899aa'
  return (
    <div className="code-wrap">
      <div className="code-hdr">
        <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.5px' }}>
          {lang || 'CODE'}
        </span>
        <button onClick={copy} style={{
          background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 5, color: copied ? '#34d399' : 'rgba(255,255,255,.45)',
          padding: '2px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
          transition: 'color .15s'
        }}>
          {copied ? '✓ Copied' : '⎘ Copy'}
        </button>
      </div>
      <pre className="code-pre"><code>{code}</code></pre>
    </div>
  )
}

/* ── Inline text formatting ──────────────────────────────── */
function InlineText({ text }: { text: string }) {
  // Split by inline patterns: bold, italic, inline-code, links, images
  const parts: React.ReactNode[] = []
  let i = 0, key = 0

  while (i < text.length) {
    // Image: ![alt](url)
    if (text[i] === '!' && text[i+1] === '[') {
      const ce = text.indexOf(']', i+2)
      if (ce > -1 && text[ce+1] === '(') {
        const ue = text.indexOf(')', ce+2)
        if (ue > -1) {
          const alt = text.slice(i+2, ce)
          const url = text.slice(ce+2, ue)
          parts.push(<img key={key++} src={url} alt={alt} loading="lazy"
            style={{ maxWidth:'100%', borderRadius:10, display:'block', margin:'6px 0' }}
            onError={e => (e.currentTarget.style.display='none')} />)
          i = ue + 1; continue
        }
      }
    }
    // Link: [text](url)
    if (text[i] === '[') {
      const ce = text.indexOf(']', i+1)
      if (ce > -1 && text[ce+1] === '(') {
        const ue = text.indexOf(')', ce+2)
        if (ue > -1) {
          const label = text.slice(i+1, ce)
          const url = text.slice(ce+2, ue)
          parts.push(<a key={key++} href={url} target="_blank" rel="noopener"
            style={{ color:'var(--accent)', textDecoration:'underline', wordBreak:'break-all' }}>{label}</a>)
          i = ue + 1; continue
        }
      }
    }
    // Bold+italic: ***
    if (text.slice(i, i+3) === '***') {
      const e = text.indexOf('***', i+3)
      if (e > -1) {
        parts.push(<strong key={key++}><em>{text.slice(i+3, e)}</em></strong>)
        i = e + 3; continue
      }
    }
    // Bold: **
    if (text.slice(i, i+2) === '**') {
      const e = text.indexOf('**', i+2)
      if (e > -1) {
        parts.push(<strong key={key++} style={{ color:'var(--text)', fontWeight:700 }}>{text.slice(i+2, e)}</strong>)
        i = e + 2; continue
      }
    }
    // Italic: *
    if (text[i] === '*' && text[i+1] !== '*') {
      const e = text.indexOf('*', i+1)
      if (e > -1) {
        parts.push(<em key={key++} style={{ color:'var(--text-2)' }}>{text.slice(i+1, e)}</em>)
        i = e + 1; continue
      }
    }
    // Strikethrough: ~~
    if (text.slice(i, i+2) === '~~') {
      const e = text.indexOf('~~', i+2)
      if (e > -1) {
        parts.push(<del key={key++} style={{ opacity:.6 }}>{text.slice(i+2, e)}</del>)
        i = e + 2; continue
      }
    }
    // Inline code: `
    if (text[i] === '`') {
      const e = text.indexOf('`', i+1)
      if (e > -1) {
        parts.push(<code key={key++} className="ic">{text.slice(i+1, e)}</code>)
        i = e + 1; continue
      }
    }
    // Plain char — accumulate
    let j = i + 1
    while (j < text.length) {
      const c = text[j]
      if (c === '!' || c === '[' || c === '*' || c === '~' || c === '`') break
      j++
    }
    parts.push(<React.Fragment key={key++}>{text.slice(i, j)}</React.Fragment>)
    i = j
  }

  return <>{parts}</>
}

/* ── Block types ─────────────────────────────────────────── */
type Block =
  | { t: 'code'; lang: string; code: string }
  | { t: 'h1' | 'h2' | 'h3'; text: string }
  | { t: 'hr' }
  | { t: 'bq'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'ol'; items: string[] }
  | { t: 'blank' }
  | { t: 'p'; text: string }

/* ── Parser: raw string → Block[] ───────────────────────── */
function parse(raw: string): Block[] {
  const blocks: Block[] = []

  // Split code blocks first (the ONLY correct approach)
  const segs: Array<{ isCode: boolean; lang?: string; code?: string; text?: string }> = []
  const re = /```(\w*)\n([\s\S]*?)```/g
  let last = 0, m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) segs.push({ isCode: false, text: raw.slice(last, m.index) })
    segs.push({ isCode: true, lang: m[1], code: m[2] })
    last = m.index + m[0].length
  }
  if (last < raw.length) segs.push({ isCode: false, text: raw.slice(last) })

  for (const seg of segs) {
    if (seg.isCode) {
      blocks.push({ t: 'code', lang: seg.lang || '', code: seg.code || '' })
      continue
    }

    const lines = (seg.text || '').split('\n')
    let ulItems: string[] = []
    let olItems: string[] = []

    const flushUL = () => { if (ulItems.length) { blocks.push({ t:'ul', items:[...ulItems] }); ulItems=[] } }
    const flushOL = () => { if (olItems.length) { blocks.push({ t:'ol', items:[...olItems] }); olItems=[] } }

    for (const line of lines) {
      const lt = line.trim()

      if (lt.startsWith('### '))      { flushUL(); flushOL(); blocks.push({ t:'h3', text:lt.slice(4) }); continue }
      if (lt.startsWith('## '))       { flushUL(); flushOL(); blocks.push({ t:'h2', text:lt.slice(3) }); continue }
      if (lt.startsWith('# '))        { flushUL(); flushOL(); blocks.push({ t:'h1', text:lt.slice(2) }); continue }
      if (/^---+$/.test(lt))          { flushUL(); flushOL(); blocks.push({ t:'hr' }); continue }
      if (lt.startsWith('> '))        { flushUL(); flushOL(); blocks.push({ t:'bq', text:lt.slice(2) }); continue }
      if (/^\d+\. /.test(lt))         { flushUL(); olItems.push(lt.replace(/^\d+\. /,'')); continue }
      if (/^[-*•] /.test(lt))         { flushOL(); ulItems.push(lt.replace(/^[-*•] /,'')); continue }

      flushUL(); flushOL()
      if (lt === '')                  { blocks.push({ t:'blank' }); continue }
      blocks.push({ t:'p', text:line })
    }

    flushUL(); flushOL()
  }

  return blocks
}

/* ── Renderer: Block[] → JSX ─────────────────────────────── */
export default function MdRenderer({ content }: { content: string }) {
  const blocks = parse(content)

  return (
    <div style={{ minWidth: 0, width: '100%' }}>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'code':
            return <CodeBlock key={i} lang={b.lang} code={b.code} />
          case 'h1':
            return <div key={i} style={{ fontSize:18, fontWeight:900, color:'var(--text)', margin:'14px 0 8px', lineHeight:1.3 }}><InlineText text={b.text}/></div>
          case 'h2':
            return <div key={i} style={{ fontSize:16, fontWeight:800, color:'var(--text)', margin:'12px 0 6px', borderBottom:'1px solid var(--border)', paddingBottom:4 }}><InlineText text={b.text}/></div>
          case 'h3':
            return <div key={i} style={{ fontSize:14, fontWeight:700, color:'var(--text)', margin:'10px 0 5px' }}><InlineText text={b.text}/></div>
          case 'hr':
            return <div key={i} style={{ height:1, background:'var(--border)', margin:'10px 0' }}/>
          case 'bq':
            return <div key={i} style={{ borderLeft:'3px solid var(--accent)', padding:'4px 12px', margin:'6px 0', color:'var(--text-3)', fontStyle:'italic', background:'var(--accent-bg)', borderRadius:'0 6px 6px 0' }}><InlineText text={b.text}/></div>
          case 'ul':
            return <ul key={i} style={{ margin:'5px 0', paddingLeft:20, display:'block', listStyle:'disc' }}>
              {b.items.map((it,j) => <li key={j} style={{ fontSize:13.5, lineHeight:1.65, marginBottom:3, color:'var(--text)' }}><InlineText text={it}/></li>)}
            </ul>
          case 'ol':
            return <ol key={i} style={{ margin:'5px 0', paddingLeft:22, display:'block' }}>
              {b.items.map((it,j) => <li key={j} style={{ fontSize:13.5, lineHeight:1.65, marginBottom:3, color:'var(--text)' }}><InlineText text={it}/></li>)}
            </ol>
          case 'blank':
            return <div key={i} style={{ height:5 }}/>
          case 'p':
            return <div key={i} style={{ margin:'0 0 3px', fontSize:13.5, lineHeight:1.7, color:'inherit', display:'block' }}><InlineText text={b.text}/></div>
        }
      })}
    </div>
  )
}
