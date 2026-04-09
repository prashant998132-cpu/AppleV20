// app/api/jarvis/stream/route.ts — v18 JARVIS Stream
// 4-Level Cascade: Groq Llama4 → Together Llama3.3 → Gemini 2.5 Flash → error
// Think: DeepSeek R1 (OpenRouter) → Gemini 2.5 Flash fallback
// Updated April 2026: Llama 4 Scout + Gemini 2.5 Flash
import { NextRequest } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const JARVIS_BASE = `Tum JARVIS ho — "Jons Bhai". Tony Stark ka AI + Grok attitude.
Hinglish. Short (1-3 lines). Sarcastic but caring. Direct.
Math → seedha number. "As an AI" kabhi mat kaho.
[LEARN: type=data] add karo jab user kuch bataye. Types: fact, habit, preference, correction, joke
Format: Markdown + KaTeX math ($formula$ inline, $$formula$$ display). Math formulas ke liye LaTeX use karo.`

async function streamOpenAI(url: string, headers: Record<string,string>, body: object, send: (d:object)=>void, timeout=15000): Promise<boolean> {
  try {
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json',...headers}, body:JSON.stringify(body), signal:AbortSignal.timeout(timeout) })
    if (!res.ok||!res.body) return false
    const reader=res.body.getReader(); const dec=new TextDecoder()
    while(true){
      const{done,value}=await reader.read(); if(done) break
      for(const line of dec.decode(value).split('\n')){
        if(!line.startsWith('data: ')||line==='data: [DONE]') continue
        try{ const d=JSON.parse(line.slice(6)); let tok=d.choices?.[0]?.delta?.content||''; tok=tok.replace(/\[LEARN:[^\]]*\]/g,''); if(tok) send({type:'token',token:tok}) }catch{}
      }
    }
    return true
  } catch { return false }
}

async function streamGemini(model: string, key: string, sys: string, msgs: any[], send: (d:object)=>void, maxTok=1024): Promise<boolean> {
  // Try provided model first, fallback to gemini-2.0-flash if 404
  const modelsToTry = ['gemini-2.0-flash', model, 'gemini-1.5-flash', 'gemini-pro']
  for (const m of modelsToTry) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ system_instruction:{parts:[{text:sys}]}, contents:msgs.map((msg:any)=>({role:msg.role==='user'?'user':'model',parts:[{text:msg.content}]})), generationConfig:{temperature:0.85,maxOutputTokens:maxTok} }),
        signal:AbortSignal.timeout(25000)
      })
      if(!res.ok) {
        const errText = await res.text().catch(()=>'')
        // 404 = model not found, try next; 429 = quota; 400 = bad request
        if(res.status===404 || res.status===400) continue
        send({type:'model',name:`Gemini (${res.status})`})
        return false
      }
      const data=await res.json()
      const text=data.candidates?.[0]?.content?.parts?.[0]?.text||''
      if(!text) { if(data.error) continue; return false }
      send({type:'model',name:`Gemini · ${m.replace('gemini-','').replace('-preview-04-17','')}`})
      const chunks=text.split('').reduce((acc:string[],ch:string)=>{ if(acc.length===0||acc[acc.length-1].length>=6) acc.push(ch); else acc[acc.length-1]+=ch; return acc; },[])||[]
      for(const c of chunks){ send({type:'token',token:c}); await new Promise(r=>setTimeout(r,8)) }
      return true
    } catch { continue }
  }
  return false
}

export async function POST(req: NextRequest) {
  const { message, chatMode='flash', history=[], memoryContext, systemOverride, userLat, userLon, userCity, forceProvider } = await req.json()
  if (!message?.trim()) return new Response('No message', { status: 400 })

  const enc = new TextEncoder()
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (d: object) => { try{ ctrl.enqueue(enc.encode(`data: ${JSON.stringify(d)}\n\n`)) }catch{} }
      try {
        const h=new Date().getHours()
        const timeNote=h<6?'[Raat]':h<12?'[Subah]':h<17?'[Din]':h<22?'[Shaam]':'[Raat]'
        const locNote=userCity?`\n[User Location: ${userCity}${userLat?` (${Number(userLat).toFixed(3)},${Number(userLon).toFixed(3)})`:''} — automatically use this for weather/map/local queries]`:''
        const mem=memoryContext?`\n\nCONTEXT:\n${memoryContext}`:''
        const sys=systemOverride||`${JARVIS_BASE}\n${timeNote}${locNote}${mem}`
        const msgs=[...history.slice(-10).map((m:any)=>({role:m.role==='user'?'user':'assistant',content:m.content})),{role:'user',content:message}]

        // ── THINK: DeepSeek R1 → Gemini → Pollinations ───
        if(chatMode==='think'){
          const orKey=process.env.OPENROUTER_API_KEY; const gkT=(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY)
          let ok=false
          // forceProvider: skip to specific model
          if(forceProvider==='gemini' && gkT){ send({type:'model',name:'Gemini 2.5 Flash'}); ok=!!(await streamGemini('gemini-2.5-flash-preview-04-17',gkT,sys,msgs,send,2048)); if(ok){send({type:'done'});ctrl.close();return} }
          if(forceProvider==='pollinations'){ /* fall through to pollinations below */ }
          else if(orKey){
            try{
              const res=await fetch('https://openrouter.ai/api/v1/chat/completions',{
                method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${orKey}`,'HTTP-Referer':'https://jarvis-ai.vercel.app','X-Title':'JARVIS'},
                body:JSON.stringify({model:'deepseek/deepseek-r1',messages:[{role:'system',content:sys},...msgs],stream:true,max_tokens:2048}),
                signal:AbortSignal.timeout(35000)
              })
              if(res.ok&&res.body){
                ok=true
                const reader=res.body.getReader(); const dec=new TextDecoder()
                while(true){
                  const{done,value}=await reader.read(); if(done) break
                  for(const line of dec.decode(value).split('\n')){
                    if(!line.startsWith('data: ')||line==='data: [DONE]') continue
                    try{ const d=JSON.parse(line.slice(6)); const delta=d.choices?.[0]?.delta
                      if(delta?.reasoning) send({type:'thinking',thinking:delta.reasoning})
                      else if(delta?.content) send({type:'token',token:delta.content})
                    }catch{}
                  }
                }
              }
            }catch{}
          }
          if(!ok && gkT) ok=!!(await streamGemini('gemini-2.5-flash-preview-04-17',gkT,sys,msgs,send,2048))
          // Pollinations fallback for think mode too
          if(!ok){
            try {
              const polRes = await fetch('https://text.pollinations.ai/', {
                method:'POST', headers:{'Content-Type':'application/json'},
                body:JSON.stringify({messages:[{role:'system',content:sys},...msgs],model:'openai'}),
                signal:AbortSignal.timeout(25000)
              })
              if(polRes.ok){
                const t=await polRes.text()
                if(t){ for(const w of t.split(' ')){ send({type:'token',token:w+' '}); await new Promise(r=>setTimeout(r,15)) }; ok=true }
              }
            }catch{}
          }
          if(!ok) send({type:'error',message:'server_providers_failed'})
          send({type:'done'}); ctrl.close(); return
        }

        // ── FLASH: 4-level cascade (or forceProvider) ───────
        let ok=false

        const groqKey=process.env.GROQ_API_KEY
        const toKey2=process.env.TOGETHER_API_KEY
        const gemKey2=(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY)

        // forceProvider: jump directly to specific model
        if(forceProvider==='groq' && groqKey){
          send({type:'model',name:'Groq · Llama 4 Scout'})
          ok=await streamOpenAI('https://api.groq.com/openai/v1/chat/completions',{Authorization:`Bearer ${groqKey}`},{model:'meta-llama/llama-4-scout-17b-16e-instruct',messages:[{role:'system',content:sys},...msgs],stream:true,max_tokens:1024,temperature:0.85},send)
          if(ok){send({type:'done'});ctrl.close();return}
        }
        if(forceProvider==='together' && toKey2){
          send({type:'model',name:'Together · Llama 3.3 70B'})
          ok=await streamOpenAI('https://api.together.xyz/v1/chat/completions',{Authorization:`Bearer ${toKey2}`},{model:'meta-llama/Llama-3.3-70B-Instruct-Turbo',messages:[{role:'system',content:sys},...msgs],stream:true,max_tokens:1024,temperature:0.85},send)
          if(ok){send({type:'done'});ctrl.close();return}
        }
        if(forceProvider==='gemini' && gemKey2){
          send({type:'model',name:'Gemini 2.5 Flash'})
          ok=!!(await streamGemini('gemini-2.5-flash-preview-04-17',gemKey2,sys,msgs,send))
          if(ok){send({type:'done'});ctrl.close();return}
        }
        if(forceProvider==='pollinations'){ /* skip to pollinations below */ }
        else if(!forceProvider || forceProvider==='auto'){
          // L1: Groq (fastest)
          if(groqKey){
            send({type:'model',name:'Groq · Llama 4 Scout'})
            ok=await streamOpenAI('https://api.groq.com/openai/v1/chat/completions',{Authorization:`Bearer ${groqKey}`},{model:'meta-llama/llama-4-scout-17b-16e-instruct',messages:[{role:'system',content:sys},...msgs],stream:true,max_tokens:1024,temperature:0.85},send)
          }
          // L2: Together AI
          if(!ok && toKey2){
            send({type:'model',name:'Together · Llama 3.3 70B'})
            ok=await streamOpenAI('https://api.together.xyz/v1/chat/completions',{Authorization:`Bearer ${toKey2}`},{model:'meta-llama/Llama-3.3-70B-Instruct-Turbo',messages:[{role:'system',content:sys},...msgs],stream:true,max_tokens:1024,temperature:0.85},send)
          }
          // L3: Gemini (1500/day free)
          if(!ok && gemKey2){
            send({type:'model',name:'Gemini 2.5 Flash'})
            ok=!!(await streamGemini('gemini-2.5-flash-preview-04-17',gemKey2,sys,msgs,send))
          }
        }

        // L4: Pollinations AI — FREE, no key, no login needed!
        if(!ok){
          try {
            const polMsgs = [{role:'system',content:sys},...msgs]
            // Try streaming first
            const polRes = await fetch('https://text.pollinations.ai/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: polMsgs, model: 'openai', stream: true }),
              signal: AbortSignal.timeout(25000)
            })
            if(polRes.ok && polRes.body){
              const reader = polRes.body.getReader(); const dec = new TextDecoder()
              let buf = '', hasContent = false
              while(true){
                const{done,value} = await reader.read(); if(done) break
                buf += dec.decode(value)
                const lines = buf.split('\n'); buf = lines.pop()||''
                for(const line of lines){
                  if(!line.startsWith('data: ')||line==='data: [DONE]') continue
                  try{
                    const d = JSON.parse(line.slice(6))
                    const tok = d.choices?.[0]?.delta?.content||''
                    if(tok){ send({type:'token',token:tok}); hasContent=true }
                  }catch{
                    // Plain text response
                    const t = line.slice(6).trim()
                    if(t && t!=='[DONE]'){ send({type:'token',token:t+' '}); hasContent=true }
                  }
                }
              }
              ok = hasContent
            }
            // Fallback: non-streaming
            if(!ok){
              const polRes2 = await fetch('https://text.pollinations.ai/', {
                method:'POST', headers:{'Content-Type':'application/json'},
                body:JSON.stringify({messages:polMsgs, model:'openai'}),
                signal:AbortSignal.timeout(20000)
              })
              if(polRes2.ok){
                const t = await polRes2.text()
                if(t?.trim()){
                  for(const w of t.split(' ')){ send({type:'token',token:w+' '}); await new Promise(r=>setTimeout(r,12)) }
                  ok=true
                }
              }
            }
          } catch(polErr){ /* ignore */ }
        }

        // L5: Client Puter fallback (last resort)
        if(!ok) send({type:'error',message:'server_providers_failed'})
        else send({type:'done'})

      } catch(e:any){
        send({type:'error',message:e.message||'Unknown'})
      }
      ctrl.close()
    }
  })

  return new Response(stream, { headers:{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'} })
}
