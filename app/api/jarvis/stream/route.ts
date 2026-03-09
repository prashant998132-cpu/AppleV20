// app/api/jarvis/stream/route.ts — v17 JARVIS Stream
// 4-Level Cascade: Groq → Together AI → Gemini → error
// Think: DeepSeek R1 (OpenRouter) → Gemini fallback
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const JARVIS_BASE = `Tum JARVIS ho — "Jons Bhai". Tony Stark ka AI + Grok attitude.
Hinglish. Short (1-3 lines). Sarcastic but caring. Direct.
Math → seedha number. "As an AI" kabhi mat kaho.
[LEARN: type=data] add karo jab user kuch bataye. Types: fact, habit, preference, correction, joke
Format: Markdown + KaTeX math ($formula$ inline, $$formula$$ display). NEET/JEE ke liye LaTeX use karo.`

async function streamOpenAI(url: string, headers: Record<string,string>, body: object, send: (d:object)=>void, timeout=15000): Promise<boolean> {
  try {
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json',...headers}, body:JSON.stringify(body), signal:AbortSignal.timeout(timeout) })
    if (!res.ok||!res.body) return false
    const reader=res.body.getReader(); const dec=new TextDecoder()
    while(true){
      const{done,value}=await reader.read(); if(done) break
      for(const line of dec.decode(value).split('\n')){
        if(!line.startsWith('data: ')||line==='data: [DONE]') continue
        try{ const d=JSON.parse(line.slice(6)); const tok=d.choices?.[0]?.delta?.content||''; if(tok) send({type:'token',token:tok}) }catch{}
      }
    }
    return true
  } catch { return false }
}

async function streamGemini(model: string, key: string, sys: string, msgs: any[], send: (d:object)=>void, maxTok=1024): Promise<boolean> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ system_instruction:{parts:[{text:sys}]}, contents:msgs.map(m=>({role:m.role==='user'?'user':'model',parts:[{text:m.content}]})), generationConfig:{temperature:0.85,maxOutputTokens:maxTok} }),
      signal:AbortSignal.timeout(20000)
    })
    if(!res.ok) return false
    const data=await res.json(); const text=data.candidates?.[0]?.content?.parts?.[0]?.text||''
    if(!text) return false
    const chunks=text.split('').reduce((acc:string[],ch:string)=>{ if(acc.length===0||acc[acc.length-1].length>=6) acc.push(ch); else acc[acc.length-1]+=ch; return acc; },[])||[]
    for(const c of chunks){ send({type:'token',token:c}); await new Promise(r=>setTimeout(r,8)) }
    return true
  } catch { return false }
}

export async function POST(req: NextRequest) {
  const { message, chatMode='flash', history=[], memoryContext, systemOverride } = await req.json()
  if (!message?.trim()) return new Response('No message', { status: 400 })

  const enc = new TextEncoder()
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (d: object) => { try{ ctrl.enqueue(enc.encode(`data: ${JSON.stringify(d)}\n\n`)) }catch{} }
      try {
        const h=new Date().getHours()
        const timeNote=h<6?'[Raat]':h<12?'[Subah]':h<17?'[Din]':h<22?'[Shaam]':'[Raat]'
        const mem=memoryContext?`\n\nCONTEXT:\n${memoryContext}`:''
        const sys=systemOverride||`${JARVIS_BASE}\n${timeNote}${mem}`
        const msgs=[...history.slice(-10).map((m:any)=>({role:m.role==='user'?'user':'assistant',content:m.content})),{role:'user',content:message}]

        // ── THINK: DeepSeek R1 → Gemini ──────────────────
        if(chatMode==='think'){
          const orKey=process.env.OPENROUTER_API_KEY; const gkT=process.env.GEMINI_API_KEY
          if(!orKey && !gkT){ send({type:'error',message:'server_providers_failed'}); send({type:'done'}); ctrl.close(); return }
          let ok=false
          if(orKey){
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
          if(!ok){ const gk=process.env.GEMINI_API_KEY; if(gk) await streamGemini('gemini-2.0-flash',gk,sys,msgs,send,2048) }
          send({type:'done'}); ctrl.close(); return
        }

        // ── FLASH: 4-level cascade ────────────────────────
        let ok=false

        // Fast-path: no keys → skip to Puter instantly
        const groqKey=process.env.GROQ_API_KEY
        const toKey2=process.env.TOGETHER_API_KEY
        const gemKey2=process.env.GEMINI_API_KEY
        if(!groqKey && !toKey2 && !gemKey2){
          send({type:'error',message:'server_providers_failed'})
          send({type:'done'}); ctrl.close(); return
        }

        // L1: Groq llama-3.1-8b (fastest)
        if(groqKey){
          ok=await streamOpenAI('https://api.groq.com/openai/v1/chat/completions',
            {Authorization:`Bearer ${groqKey}`},
            {model:'llama-3.1-8b-instant',messages:[{role:'system',content:sys},...msgs],stream:true,max_tokens:1024,temperature:0.85},
            send)
        }

        // L2: Together AI llama-3.1-70b (better quality, $25 free credit)
        if(!ok){
          const toKey=process.env.TOGETHER_API_KEY
          if(toKey){
            ok=await streamOpenAI('https://api.together.xyz/v1/chat/completions',
              {Authorization:`Bearer ${toKey}`},
              {model:'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',messages:[{role:'system',content:sys},...msgs],stream:true,max_tokens:1024,temperature:0.85},
              send)
          }
        }

        // L3: Gemini 2.0 Flash (1500/day free)
        if(!ok){
          const gemKey=process.env.GEMINI_API_KEY
          if(gemKey) ok=await streamGemini('gemini-2.0-flash',gemKey,sys,msgs,send)
        }

        // L4: Client Puter fallback
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
