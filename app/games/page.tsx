'use client'
// app/games/page.tsx — JARVIS Mini Games Hub
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { initTheme } from '../../lib/theme'

type Game = 'menu'|'snake'|'memory'|'word'

// ── SNAKE ──────────────────────────────────────────────────
const GRID = 20
type Point = {x:number;y:number}
const DIRS: Record<string,Point> = {UP:{x:0,y:-1},DOWN:{x:0,y:1},LEFT:{x:-1,y:0},RIGHT:{x:1,y:0}}

function SnakeGame({onBack}:{onBack:()=>void}) {
  const [snake, setSnake] = useState<Point[]>([{x:10,y:10}])
  const [food, setFood] = useState<Point>({x:15,y:10})
  const [dir, setDir] = useState('RIGHT')
  const [running, setRunning] = useState(false)
  const [score, setScore] = useState(0)
  const [dead, setDead] = useState(false)
  const dirRef = useRef('RIGHT')
  const snakeRef = useRef(snake)
  snakeRef.current = snake

  const newFood = (s: Point[]): Point => {
    let f: Point
    do { f = {x:Math.floor(Math.random()*GRID),y:Math.floor(Math.random()*GRID)} }
    while (s.some(p=>p.x===f.x&&p.y===f.y))
    return f
  }

  useEffect(() => {
    if (!running || dead) return
    const id = setInterval(() => {
      const d = DIRS[dirRef.current]
      const s = snakeRef.current
      const head = {x:s[0].x+d.x,y:s[0].y+d.y}
      if (head.x<0||head.x>=GRID||head.y<0||head.y>=GRID||s.some(p=>p.x===head.x&&p.y===head.y)) {
        setRunning(false); setDead(true); return
      }
      setFood(f => {
        if (head.x===f.x&&head.y===f.y) {
          setSnake(p=>[head,...p]); setScore(sc=>sc+10); return newFood([head,...s])
        }
        setSnake(p=>[head,...p.slice(0,-1)]); return f
      })
    }, 150)
    return () => clearInterval(id)
  }, [running, dead])

  const changeDir = (d:string) => {
    const opp: Record<string,string> = {UP:'DOWN',DOWN:'UP',LEFT:'RIGHT',RIGHT:'LEFT'}
    if (opp[d]!==dirRef.current) { dirRef.current=d; setDir(d) }
  }

  const reset = () => { setSnake([{x:10,y:10}]); setFood({x:15,y:10}); setDir('RIGHT'); dirRef.current='RIGHT'; setScore(0); setDead(false); setRunning(true) }
  const cell = 300/GRID

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'10px 0'}}>
      <div style={{display:'flex',justifyContent:'space-between',width:'100%',maxWidth:300,marginBottom:8}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer'}}>← Back</button>
        <span style={{fontSize:14,fontWeight:700,color:'var(--accent)'}}>Score: {score}</span>
        <button onClick={reset} style={{background:'none',border:'none',color:'var(--accent)',cursor:'pointer',fontSize:12}}>↺ Reset</button>
      </div>
      <div style={{width:300,height:300,background:'#0a0a0a',border:'2px solid var(--border-a)',borderRadius:8,position:'relative',overflow:'hidden'}}>
        {snake.map((p,i)=><div key={i} style={{position:'absolute',left:p.x*cell,top:p.y*cell,width:cell-1,height:cell-1,background:i===0?'var(--accent)':'rgba(0,229,255,.6)',borderRadius:i===0?3:2}}/>)}
        <div style={{position:'absolute',left:food.x*cell,top:food.y*cell,width:cell-1,height:cell-1,background:'#ef4444',borderRadius:'50%'}}/>
        {!running&&<div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.8)'}}>
          <div style={{fontSize:dead?18:20,fontWeight:800,color:dead?'#ef4444':'var(--accent)',marginBottom:8}}>{dead?`Game Over! Score: ${score}`:'Snake 🐍'}</div>
          <button onClick={reset} style={{padding:'10px 24px',background:'var(--accent)',color:'#000',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer'}}>{dead?'Play Again':'Start'}</button>
        </div>}
      </div>
      {/* Controls */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginTop:12,width:150}}>
        <div/><button onClick={()=>changeDir('UP')} style={{padding:'12px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,fontSize:18,cursor:'pointer'}}>↑</button><div/>
        <button onClick={()=>changeDir('LEFT')} style={{padding:'12px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,fontSize:18,cursor:'pointer'}}>←</button>
        <button onClick={()=>changeDir('DOWN')} style={{padding:'12px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,fontSize:18,cursor:'pointer'}}>↓</button>
        <button onClick={()=>changeDir('RIGHT')} style={{padding:'12px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,fontSize:18,cursor:'pointer'}}>→</button>
      </div>
    </div>
  )
}

// ── MEMORY CARD ──────────────────────────────────────────
const EMOJIS = ['🚀','🌍','🎵','💎','🌸','🔥','⚡','🎨','🦁','🎭','🌊','🍕']
function MemoryGame({onBack}:{onBack:()=>void}) {
  const [cards,setCards]=useState<{id:number;emoji:string;flipped:boolean;matched:boolean}[]>([])
  const [sel,setSel]=useState<number[]>([])
  const [moves,setMoves]=useState(0)
  const [won,setWon]=useState(false)

  const init = useCallback(()=>{
    const pairs=[...EMOJIS.slice(0,8),...EMOJIS.slice(0,8)].sort(()=>Math.random()-.5).map((e,i)=>({id:i,emoji:e,flipped:false,matched:false}))
    setCards(pairs);setSel([]);setMoves(0);setWon(false)
  },[])
  useEffect(()=>init(),[])

  const flip=(i:number)=>{
    if(sel.length===2||cards[i].matched||cards[i].flipped||sel.includes(i)) return
    const newC=[...cards]; newC[i]={...newC[i],flipped:true}; setCards(newC)
    const newSel=[...sel,i]
    if(newSel.length===2){
      setMoves(m=>m+1)
      if(newC[newSel[0]].emoji===newC[newSel[1]].emoji){
        const mc=[...newC]; mc[newSel[0]]={...mc[newSel[0]],matched:true}; mc[newSel[1]]={...mc[newSel[1]],matched:true}
        setTimeout(()=>{setCards(mc);setSel([]);if(mc.every(c=>c.matched))setWon(true)},500)
      }else{
        setTimeout(()=>{const rc=[...newC];rc[newSel[0]]={...rc[newSel[0]],flipped:false};rc[newSel[1]]={...rc[newSel[1]],flipped:false};setCards(rc);setSel([])},800)
      }
    }else setSel(newSel)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'10px 0'}}>
      <div style={{display:'flex',justifyContent:'space-between',width:'100%',maxWidth:320,marginBottom:8}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer'}}>← Back</button>
        <span style={{fontSize:13,fontWeight:700,color:'var(--accent)'}}>Moves: {moves}</span>
        <button onClick={init} style={{background:'none',border:'none',color:'var(--accent)',cursor:'pointer',fontSize:12}}>↺ New</button>
      </div>
      {won&&<div style={{color:'#22c55e',fontWeight:800,fontSize:18,marginBottom:8}}>🎉 Won in {moves} moves!</div>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,maxWidth:320}}>
        {cards.map((c,i)=>(
          <div key={c.id} onClick={()=>flip(i)} style={{width:70,height:70,borderRadius:12,background:c.matched?'rgba(34,197,94,.15)':c.flipped?'var(--accent-bg)':'var(--bg-card)',border:`1px solid ${c.matched?'rgba(34,197,94,.3)':c.flipped?'var(--border-a)':'var(--border)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:c.flipped||c.matched?28:20,cursor:'pointer',transition:'all .15s',color:c.flipped||c.matched?'inherit':'var(--text-4)'}}>
            {c.flipped||c.matched?c.emoji:'?'}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── WORD SCRAMBLE ─────────────────────────────────────────
const WORDS=[{w:'JARVIS',hint:'Tony Stark ka AI'},{w:'INDIA',hint:'Bharat'},{w:'PYTHON',hint:'Programming language'},{w:'MOBILE',hint:'Haath mein rakhte hain'},{w:'CODING',hint:'Computer ke liye instructions'},{w:'GALAXY',hint:'Taron ka samooh'},{w:'MUSIC',hint:'Gaana'},{w:'CINEMA',hint:'Movies dekhte hain'},{w:'ROCKET',hint:'Space mein jaata hai'},{w:'TIGER',hint:'Indian national animal'}]
function WordGame({onBack}:{onBack:()=>void}){
  const [idx,setIdx]=useState(0); const [guess,setGuess]=useState(''); const [result,setResult]=useState(''); const [score,setScore]=useState(0); const [shown,setShown]=useState(false)
  const word=WORDS[idx%WORDS.length]
  const scrambled=word.w.split('').sort(()=>Math.random()-.5).join('')
  const check=()=>{if(guess.toUpperCase()===word.w){setResult('✅ Correct! +10');setScore(s=>s+10)}else{setResult(`❌ Wrong! Answer: ${word.w}`)};setShown(true)}
  const next=()=>{setIdx(i=>i+1);setGuess('');setResult('');setShown(false)}

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'16px 0'}}>
      <div style={{display:'flex',justifyContent:'space-between',width:'100%',maxWidth:300,marginBottom:12}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer'}}>← Back</button>
        <span style={{fontSize:13,fontWeight:700,color:'var(--accent)'}}>Score: {score}</span>
        <span style={{fontSize:11,color:'var(--text-3)'}}>{idx+1}/{WORDS.length}</span>
      </div>
      <div style={{fontSize:13,color:'var(--text-3)',marginBottom:8}}>Hint: {word.hint}</div>
      <div style={{fontSize:32,fontWeight:900,letterSpacing:8,color:'var(--accent)',fontFamily:"'JetBrains Mono',monospace",marginBottom:16}}>{scrambled}</div>
      <input value={guess} onChange={e=>setGuess(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&!shown&&check()} placeholder="Type your answer..." maxLength={word.w.length} style={{textAlign:'center',width:200,background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:10,padding:'10px',color:'var(--text)',fontSize:16,fontFamily:"'JetBrains Mono',monospace",outline:'none',marginBottom:10,letterSpacing:4}}/>
      {result&&<div style={{fontSize:14,fontWeight:700,color:result.startsWith('✅')?'#22c55e':'#ef4444',marginBottom:10}}>{result}</div>}
      <div style={{display:'flex',gap:8}}>
        {!shown&&<button onClick={check} disabled={!guess} style={{padding:'10px 24px',background:'var(--accent)',color:'#000',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer'}}>Check ✓</button>}
        {shown&&<button onClick={next} style={{padding:'10px 24px',background:'var(--accent-bg)',border:'1px solid var(--border-a)',color:'var(--accent)',borderRadius:10,fontWeight:700,cursor:'pointer'}}>Next →</button>}
      </div>
    </div>
  )
}

// ── MAIN ──────────────────────────────────────────────────
export default function GamesPage() {
  const router = useRouter()
  const [game, setGame] = useState<Game>('menu')
  useEffect(()=>initTheme(),[])

  if (game==='snake') return <div style={{minHeight:'100dvh',background:'var(--bg)',color:'var(--text)',fontFamily:"'Inter',sans-serif",padding:'14px'}}><SnakeGame onBack={()=>setGame('menu')}/></div>
  if (game==='memory') return <div style={{minHeight:'100dvh',background:'var(--bg)',color:'var(--text)',fontFamily:"'Inter',sans-serif",padding:'14px'}}><MemoryGame onBack={()=>setGame('menu')}/></div>
  if (game==='word') return <div style={{minHeight:'100dvh',background:'var(--bg)',color:'var(--text)',fontFamily:"'Inter',sans-serif",padding:'14px'}}><WordGame onBack={()=>setGame('menu')}/></div>

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg)',color:'var(--text)',fontFamily:"'Inter',sans-serif"}}>
      <div className="bg-grid"/>
      <div style={{position:'sticky',top:0,zIndex:50,background:'var(--header)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--border)',padding:'10px 16px',display:'flex',alignItems:'center',gap:8}}>
        <button onClick={()=>router.push('/')} style={{background:'var(--accent-bg)',border:'1px solid var(--border-a)',borderRadius:8,color:'var(--accent)',fontSize:14,fontWeight:800,width:28,height:28,fontFamily:'monospace'}}>J</button>
        <div style={{flex:1,fontSize:15,fontWeight:700}}>🎮 Mini Games</div>
      </div>
      <div style={{padding:'20px 14px'}}>
        {[
          {id:'snake',icon:'🐍',label:'Snake',desc:'Classic snake game',color:'#22c55e'},
          {id:'memory',icon:'🃏',label:'Memory Cards',desc:'Flip and match pairs',color:'#a78bfa'},
          {id:'word',icon:'🔤',label:'Word Scramble',desc:'Unscramble the word',color:'#f59e0b'},
        ].map(g=>(
          <div key={g.id} onClick={()=>setGame(g.id as Game)} style={{display:'flex',alignItems:'center',gap:14,padding:'18px 16px',background:'var(--bg-card)',border:`1px solid ${g.color}33`,borderRadius:16,marginBottom:12,cursor:'pointer',borderLeft:`4px solid ${g.color}`}}>
            <span style={{fontSize:36}}>{g.icon}</span>
            <div><div style={{fontSize:16,fontWeight:700}}>{g.label}</div><div style={{fontSize:11,color:'var(--text-3)',marginTop:2}}>{g.desc}</div></div>
            <span style={{marginLeft:'auto',fontSize:18,color:g.color}}>▶</span>
          </div>
        ))}
      </div>
    </div>
  )
}
