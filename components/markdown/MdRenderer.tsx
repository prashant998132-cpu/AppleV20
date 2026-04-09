'use client'
// MdRenderer.tsx — v3: Multi-line math fixed + LEARN strip hardened

import React, { useState, useCallback } from 'react'

/* ── KaTeX helper ────────────────────────────────────────── */
function renderKaTeX(formula: string, display: boolean): string {
  try {
    if (typeof window !== 'undefined' && (window as any).katex) {
      return (window as any).katex.renderToString(formula.trim(), {
        displayMode: display, throwOnError: false, output: 'html', trust: false
      })
    }
  } catch {}
  // Fallback: styled raw formula
  return display
    ? `<div style="padding:8px 12px;background:rgba(0,229,255,.06);border-radius:6px;text-align:center;font-family:monospace;color:#00e5ff;overflow-x:auto;font-size:13px">${formula.trim()}</div>`
    : `<code style="color:#00e5ff;background:rgba(0,229,255,.08);padding:1px 5px;border-radius:3px;font-family:monospace">${formula}</code>`
}

/* ── Math span (safe dangerouslySetInnerHTML — KaTeX only) ─ */
function MathSpan({ formula, display }: { formula: string; display: boolean }) {
  const html = renderKaTeX(formula, display)
  if (display) {
    return <div style={{ margin:'8px 0', overflowX:'auto' }} dangerouslySetInnerHTML={{ __html: html }}/>
  }
  return <span dangerouslySetInnerHTML={{ __html: html }}/>
}

/* ── Lang colors ─────────────────────────────────────────── */
const LANG_COLOR: Record<string, string> = {
  js:'#f7df1e',javascript:'#f7df1e',ts:'#3178c6',typescript:'#3178c6',
  py:'#3776ab',python:'#3776ab',rs:'#f74c00',rust:'#f74c00',
  go:'#00add8',java:'#ed8b00',cpp:'#f34b7d',c:'#555',bash:'#89e051',
  sh:'#89e051',css:'#563d7c',html:'#e34c26',json:'#f39c12',sql:'#e38c00',
  jsx:'#61dafb',tsx:'#3178c6',dart:'#00b4ab',kotlin:'#7f52ff',swift:'#f05138',
}

/* ── Code block ──────────────────────────────────────────── */
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
        <span style={{ fontSize:10, fontWeight:700, color, textTransform:'uppercase', letterSpacing:'.5px' }}>
          {lang || 'CODE'}
        </span>
        <button onClick={copy} style={{
          background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)',
          borderRadius:5, color:copied?'#34d399':'rgba(255,255,255,.45)',
          padding:'2px 10px', fontSize:11, cursor:'pointer', fontFamily:'inherit', transition:'color .15s'
        }}>
          {copied ? '✓ Copied' : '⎘ Copy'}
        </button>
      </div>
      <pre className="code-pre"><code>{code}</code></pre>
    </div>
  )
}

/* ── InlineSegment: handles inline math $...$ + formatting ─ */
function InlineSegment({ text }: { text: string }) {
  const nodes: React.ReactNode[] = []
  let i = 0, key = 0

  while (i < text.length) {
    // Inline math: $...$
    if (text[i] === '$' && text[i-1] !== '$' && text[i+1] !== '$') {
      const e = text.indexOf('$', i+1)
      if (e > -1 && e > i+1) {
        const formula = text.slice(i+1, e)
        if (/[+\-=^_{}\\]|\\[a-zA-Z]|\d|frac|sqrt|sum|int|alpha|beta|theta|pi/.test(formula)) {
          nodes.push(<MathSpan key={key++} formula={formula} display={false}/>)
          i = e + 1; continue
        }
      }
    }
    // Image: ![alt](url)
    if (text[i]==='!' && text[i+1]==='[') {
      const ce = text.indexOf(']', i+2)
      if (ce>-1 && text[ce+1]==='(') {
        const ue = text.indexOf(')', ce+2)
        if (ue>-1) {
          const alt = text.slice(i+2,ce), url = text.slice(ce+2,ue)
          nodes.push(<img key={key++} src={url} alt={alt} loading="lazy"
            style={{maxWidth:'100%',borderRadius:10,display:'block',margin:'6px 0'}}
            onError={e=>(e.currentTarget.style.display='none')}/>)
          i=ue+1; continue
        }
      }
    }
    // Link: [text](url)
    if (text[i]==='[') {
      const ce=text.indexOf(']',i+1)
      if (ce>-1 && text[ce+1]==='(') {
        const ue=text.indexOf(')',ce+2)
        if (ue>-1) {
          nodes.push(<a key={key++} href={text.slice(ce+2,ue)} target="_blank" rel="noopener"
            style={{color:'var(--accent)',textDecoration:'underline',wordBreak:'break-all'}}>{text.slice(i+1,ce)}</a>)
          i=ue+1; continue
        }
      }
    }
    // Bold+italic: ***
    if (text.slice(i,i+3)==='***') { const e=text.indexOf('***',i+3); if(e>-1){nodes.push(<strong key={key++}><em>{text.slice(i+3,e)}</em></strong>);i=e+3;continue} }
    // Bold: **
    if (text.slice(i,i+2)==='**') { const e=text.indexOf('**',i+2); if(e>-1){nodes.push(<strong key={key++} style={{color:'var(--text)',fontWeight:700}}>{text.slice(i+2,e)}</strong>);i=e+2;continue} }
    // Italic: *
    if (text[i]==='*'&&text[i+1]!=='*') { const e=text.indexOf('*',i+1); if(e>-1){nodes.push(<em key={key++} style={{color:'var(--text-2)'}}>{text.slice(i+1,e)}</em>);i=e+1;continue} }
    // Strikethrough: ~~
    if (text.slice(i,i+2)==='~~') { const e=text.indexOf('~~',i+2); if(e>-1){nodes.push(<del key={key++} style={{opacity:.6}}>{text.slice(i+2,e)}</del>);i=e+2;continue} }
    // Inline code: `
    if (text[i]==='`') { const e=text.indexOf('`',i+1); if(e>-1){nodes.push(<code key={key++} className="ic">{text.slice(i+1,e)}</code>);i=e+1;continue} }
    // Accumulate plain chars
    let j=i+1
    while(j<text.length){const c=text[j];if(c==='$'||c==='!'||c==='['||c==='*'||c==='~'||c==='`')break;j++}
    nodes.push(<React.Fragment key={key++}>{text.slice(i,j)}</React.Fragment>)
    i=j
  }
  return <>{nodes}</>
}

/* ── InlineText: handles inline $$ display math + segments ─ */
function InlineText({ text }: { text: string }) {
  const segments: Array<{ type:'text'|'dispmath'; content:string }> = []
  const dispRe = /\$\$([\s\S]+?)\$\$/g
  let lastIdx = 0
  let m: RegExpExecArray | null
  while ((m = dispRe.exec(text)) !== null) {
    if (m.index > lastIdx) segments.push({ type:'text', content:text.slice(lastIdx, m.index) })
    segments.push({ type:'dispmath', content:m[1] })
    lastIdx = m.index + m[0].length
  }
  if (lastIdx < text.length) segments.push({ type:'text', content:text.slice(lastIdx) })
  return (
    <>
      {segments.map((seg, si) => {
        if (seg.type === 'dispmath') return <MathSpan key={si} formula={seg.content} display={true}/>
        return <InlineSegment key={si} text={seg.content}/>
      })}
    </>
  )
}

/* ── Block types ─────────────────────────────────────────── */
type Block =
  | { t:'code'; lang:string; code:string }
  | { t:'math'; formula:string }              // NEW: display math block
  | { t:'h1'|'h2'|'h3'; text:string }
  | { t:'hr' }
  | { t:'bq'; text:string }
  | { t:'ul'; items:string[] }
  | { t:'ol'; items:string[] }
  | { t:'blank' }
  | { t:'p'; text:string }

/* ── Parser ──────────────────────────────────────────────── */
function parse(raw: string): Block[] {
  const blocks: Block[] = []

  // Step 1: Extract code blocks AND display math blocks FIRST (before line-splitting)
  type Seg = { isCode:boolean; isMath?:boolean; lang?:string; code?:string; formula?:string; text?:string }
  const segs: Seg[] = []

  // Regex to match ``` code ``` OR $$ display math $$ (both can be multi-line)
  const re = /```(\w*)\n([\s\S]*?)```|\$\$([\s\S]+?)\$\$/g
  let last=0, m: RegExpExecArray|null
  while ((m=re.exec(raw))!==null) {
    if (m.index>last) segs.push({isCode:false,text:raw.slice(last,m.index)})
    if (m[0].startsWith('`')) {
      segs.push({isCode:true,lang:m[1],code:m[2]})
    } else {
      segs.push({isCode:false,isMath:true,formula:m[3]})
    }
    last=m.index+m[0].length
  }
  if (last<raw.length) segs.push({isCode:false,text:raw.slice(last)})

  // Step 2: Process each segment
  for (const seg of segs) {
    if (seg.isCode) { blocks.push({t:'code',lang:seg.lang||'',code:seg.code||''}); continue }
    if (seg.isMath) { blocks.push({t:'math',formula:seg.formula||''}); continue }

    const lines=(seg.text||'').split('\n')
    let ulI:string[]=[],olI:string[]=[],tableRows:string[][]=[]
    const fUL=()=>{if(ulI.length){blocks.push({t:'ul',items:[...ulI]});ulI=[]}}
    const fOL=()=>{if(olI.length){blocks.push({t:'ol',items:[...olI]});olI=[]}}
    const fTB=()=>{tableRows=[]}

    for (const line of lines) {
      const lt=line.trim()
      if(lt.startsWith('### ')){fUL();fOL();blocks.push({t:'h3',text:lt.slice(4)});continue}
      if(lt.startsWith('## ')){fUL();fOL();blocks.push({t:'h2',text:lt.slice(3)});continue}
      if(lt.startsWith('# ')){fUL();fOL();blocks.push({t:'h1',text:lt.slice(2)});continue}
      if(/^---+$/.test(lt)){fUL();fOL();blocks.push({t:'hr'});continue}
      if(lt.startsWith('> ')){fUL();fOL();blocks.push({t:'bq',text:lt.slice(2)});continue}
      if(/^\d+\. /.test(lt)){fUL();olI.push(lt.replace(/^\d+\. /,''));continue}
      if(/^[-*•] /.test(lt)){fOL();ulI.push(lt.replace(/^[-*•] /,''));continue}
      fUL();fOL()
      if(lt===''){blocks.push({t:'blank'});continue}
      blocks.push({t:'p',text:line})
    }
    fUL();fOL()
  }
  return blocks
}

/* ── Preprocess: strip internal tags + normalize math ──────── */
function preprocess(raw: string): string {
  let s = raw

  // Strip ALL [LEARN: ...] tags — internal memory tags, never show to user
  // Handles: [LEARN: key=value], [LEARN: type=data], multiline etc.
  s = s.replace(/\[LEARN:[^\]]*\]/g, '')
  s = s.replace(/\[LEARN:[^\n]*\n?/g, '')  // also catch unclosed tags

  // Convert LaTeX display math \[...\] → $$ ... $$
  // Handles both single-line and multi-line
  s = s.replace(/\\\[\s*([\s\S]+?)\s*\\\]/g, (_: string, f: string) => `$$${f.trim()}$$`)

  // Convert LaTeX inline math \(...\) → $...$
  s = s.replace(/\\\(([^)]+)\\\)/g, (_: string, f: string) => `$${f.trim()}$`)

  // Also handle \( ... \) with multiline (rare but possible)
  s = s.replace(/\\\(([\s\S]+?)\\\)/g, (_: string, f: string) => `$${f.trim()}$`)

  // Clean up multiple blank lines
  s = s.replace(/\n{3,}/g, '\n\n').trim()

  return s
}

/* ── Main renderer ───────────────────────────────────────── */
export default function MdRenderer({ content }: { content: string }) {
  const blocks = parse(preprocess(content))
  return (
    <div style={{minWidth:0,width:'100%'}}>
      {blocks.map((b,i) => {
        switch(b.t) {
          case 'code':  return <CodeBlock key={i} lang={b.lang} code={b.code}/>
          case 'math':  return <MathSpan key={i} formula={b.formula} display={true}/>
          case 'h1':    return <div key={i} style={{fontSize:18,fontWeight:900,color:'var(--text)',margin:'14px 0 8px',lineHeight:1.3}}><InlineText text={b.text}/></div>
          case 'h2':    return <div key={i} style={{fontSize:16,fontWeight:800,color:'var(--text)',margin:'12px 0 6px',borderBottom:'1px solid var(--border)',paddingBottom:4}}><InlineText text={b.text}/></div>
          case 'h3':    return <div key={i} style={{fontSize:14,fontWeight:700,color:'var(--text)',margin:'10px 0 5px'}}><InlineText text={b.text}/></div>
          case 'hr':    return <div key={i} style={{height:1,background:'var(--border)',margin:'10px 0'}}/>
          case 'bq':    return <div key={i} style={{borderLeft:'3px solid var(--accent)',padding:'4px 12px',margin:'6px 0',color:'var(--text-3)',fontStyle:'italic',background:'var(--accent-bg)',borderRadius:'0 6px 6px 0'}}><InlineText text={b.text}/></div>
          case 'ul':    return <ul key={i} style={{margin:'5px 0',paddingLeft:20,display:'block',listStyle:'disc'}}>{b.items.map((it,j)=><li key={j} style={{fontSize:13.5,lineHeight:1.65,marginBottom:3,color:'var(--text)'}}><InlineText text={it}/></li>)}</ul>
          case 'ol':    return <ol key={i} style={{margin:'5px 0',paddingLeft:22,display:'block'}}>{b.items.map((it,j)=><li key={j} style={{fontSize:13.5,lineHeight:1.65,marginBottom:3,color:'var(--text)'}}><InlineText text={it}/></li>)}</ol>
          case 'blank': return <div key={i} style={{height:5}}/>
          case 'p':     return <div key={i} style={{margin:'0 0 3px',fontSize:13.5,lineHeight:1.7,color:'inherit',display:'block'}}><InlineText text={b.text}/></div>
        }
      })}
    </div>
  )
}
