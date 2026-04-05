'use client'
// app/calculator/page.tsx — JARVIS Scientific Calculator
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Mode = 'basic'|'sci'|'converter'

const UNITS: Record<string,Record<string,number>> = {
  length: { m:1, km:1000, cm:0.01, mm:0.001, mile:1609.34, ft:0.3048, inch:0.0254 },
  weight: { kg:1, g:0.001, lb:0.453592, oz:0.028349, ton:1000 },
  temp: { C:1, F:1, K:1 }, // special case
  area: { m2:1, km2:1e6, ft2:0.0929, acre:4046.86, hectare:1e4 },
  speed: { 'km/h':1, mph:1.60934, 'm/s':3.6, knots:1.852 },
}

function convertTemp(val:number, from:string, to:string):number {
  let celsius = from==='F'?(val-32)*5/9:from==='K'?val-273.15:val
  return to==='F'?celsius*9/5+32:to==='K'?celsius+273.15:celsius
}

export default function CalculatorPage() {
  const router = useRouter()
  const [expr, setExpr] = useState('')
  const [result, setResult] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [tab, setTab] = useState<Mode>('basic')
  const [sci, setSci] = useState(false)
  const [unitType, setUnitType] = useState('length')
  const [unitFrom, setUnitFrom] = useState('m')
  const [unitTo, setUnitTo] = useState('km')
  const [unitVal, setUnitVal] = useState('')

  const press = (v:string) => {
    if(v==='C'){ setExpr(''); setResult(''); return }
    if(v==='⌫'){ setExpr(p=>p.slice(0,-1)); return }
    if(v==='='){ calc(); return }
    setExpr(p=>p+v)
  }

  const calc = () => {
    try {
      let e = expr
        .replace(/×/g,'*').replace(/÷/g,'/')
        .replace(/π/g,'Math.PI').replace(/e(?![x])/g,'Math.E')
        .replace(/sin\(/g,'Math.sin(').replace(/cos\(/g,'Math.cos(')
        .replace(/tan\(/g,'Math.tan(').replace(/log\(/g,'Math.log10(')
        .replace(/ln\(/g,'Math.log(').replace(/√\(/g,'Math.sqrt(')
        .replace(/\^/g,'**')
      const r = Function('"use strict"; return ('+e+')')()
      const res = Number.isFinite(r)?String(parseFloat(r.toFixed(10))):'Error'
      setResult(res)
      if(res!=='Error') setHistory(h=>[`${expr} = ${res}`,...h.slice(0,19)])
    } catch { setResult('Error') }
  }

  const convertUnit = () => {
    const v = parseFloat(unitVal)
    if(isNaN(v)) return
    if(unitType==='temp') { return String(convertTemp(v,unitFrom,unitTo).toFixed(4)) }
    const map = UNITS[unitType]
    return String((v * map[unitFrom] / map[unitTo]).toFixed(6))
  }
  const unitResult = unitVal ? convertUnit() : ''

  const BTN = (label:string, type:'num'|'op'|'eq'|'fn'='num', action?:string) => (
    <button onClick={()=>press(action||label)} style={{
      padding:'16px 0', borderRadius:12, fontSize:type==='fn'?13:18, fontWeight:type==='eq'?700:500,
      background:type==='eq'?'var(--accent)':type==='op'?'rgba(0,229,255,.1)':type==='fn'?'rgba(167,139,250,.1)':'rgba(255,255,255,.06)',
      border:`1px solid ${type==='eq'?'var(--accent)':type==='op'?'var(--border-a)':type==='fn'?'rgba(167,139,250,.2)':'var(--border)'}`,
      color:type==='eq'?'#000':type==='op'?'var(--accent)':type==='fn'?'#a78bfa':'var(--text)',
      cursor:'pointer', width:'100%',
    }}>{label}</button>
  )

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg)',color:'var(--text)',fontFamily:"'Inter',sans-serif",display:'flex',flexDirection:'column'}}>
      <div className="bg-grid"/>
      <div style={{position:'sticky',top:0,zIndex:50,background:'var(--header)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--border)',padding:'10px 16px',display:'flex',alignItems:'center',gap:8}}>
        <button onClick={()=>router.push('/')} style={{background:'var(--accent-bg)',border:'1px solid var(--border-a)',borderRadius:8,color:'var(--accent)',fontSize:14,fontWeight:800,width:28,height:28,fontFamily:'monospace'}}>J</button>
        <div style={{flex:1,fontSize:15,fontWeight:700}}>🧮 Calculator</div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',borderBottom:'1px solid var(--border)'}}>
        {(['basic','sci','converter'] as Mode[]).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'9px',background:tab===t?'var(--accent-bg)':'transparent',border:'none',borderBottom:`2px solid ${tab===t?'var(--accent)':'transparent'}`,color:tab===t?'var(--accent)':'var(--text-3)',fontSize:11,fontWeight:600,cursor:'pointer',textTransform:'capitalize'}}>
            {t==='basic'?'🔢':t==='sci'?'📐':'🔄'} {t}
          </button>
        ))}
      </div>

      {/* CONVERTER */}
      {tab==='converter'&&(
        <div style={{padding:'16px 14px',flex:1}}>
          <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
            {Object.keys(UNITS).map(u=>(
              <button key={u} onClick={()=>{setUnitType(u);setUnitFrom(Object.keys(UNITS[u])[0]);setUnitTo(Object.keys(UNITS[u])[1])}} style={{padding:'5px 12px',borderRadius:20,fontSize:11,background:unitType===u?'var(--accent-bg)':'transparent',border:`1px solid ${unitType===u?'var(--border-a)':'var(--border)'}`,color:unitType===u?'var(--accent)':'var(--text-3)',cursor:'pointer'}}>{u}</button>
            ))}
          </div>
          <input value={unitVal} onChange={e=>setUnitVal(e.target.value)} type="number" placeholder="Value daalo..." style={{width:'100%',background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:10,padding:'12px',color:'var(--text)',fontSize:18,fontFamily:"'JetBrains Mono',monospace",marginBottom:10}}/>
          <div style={{display:'flex',gap:8,marginBottom:10}}>
            <select value={unitFrom} onChange={e=>setUnitFrom(e.target.value)} style={{flex:1,background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:10,padding:'10px',color:'var(--text)',fontSize:13}}>
              {Object.keys(unitType==='temp'?{C:0,F:0,K:0}:UNITS[unitType]).map(u=><option key={u}>{u}</option>)}
            </select>
            <button onClick={()=>{const t=unitFrom;setUnitFrom(unitTo);setUnitTo(t)}} style={{padding:'10px 14px',background:'var(--accent-bg)',border:'1px solid var(--border-a)',borderRadius:10,color:'var(--accent)',cursor:'pointer',fontSize:16}}>⇄</button>
            <select value={unitTo} onChange={e=>setUnitTo(e.target.value)} style={{flex:1,background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:10,padding:'10px',color:'var(--text)',fontSize:13}}>
              {Object.keys(unitType==='temp'?{C:0,F:0,K:0}:UNITS[unitType]).map(u=><option key={u}>{u}</option>)}
            </select>
          </div>
          {unitResult&&<div style={{background:'var(--accent-bg)',border:'1px solid var(--border-a)',borderRadius:12,padding:'16px',textAlign:'center'}}>
            <div style={{fontSize:11,color:'var(--text-3)',marginBottom:4}}>{unitVal} {unitFrom} =</div>
            <div style={{fontSize:28,fontWeight:800,color:'var(--accent)',fontFamily:"'JetBrains Mono',monospace"}}>{unitResult} {unitTo}</div>
          </div>}
        </div>
      )}

      {/* BASIC + SCI */}
      {(tab==='basic'||tab==='sci')&&(
        <>
          {/* Display */}
          <div style={{padding:'16px 16px 8px',textAlign:'right',flex:1,display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
            <div style={{fontSize:13,color:'var(--text-3)',minHeight:20,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{expr}</div>
            <div style={{fontSize:40,fontWeight:900,color:result?'var(--accent)':'var(--text)',fontFamily:"'JetBrains Mono',monospace",lineHeight:1.1}}>{result||expr||'0'}</div>
          </div>

          {/* Sci functions */}
          {tab==='sci'&&(
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:4,padding:'0 10px 4px'}}>
              {[['sin(','fn'],['cos(','fn'],['tan(','fn'],['log(','fn'],['ln(','fn'],['√(','fn'],['π','fn'],['e','fn'],['(',  'fn'],[')','fn'],['^','op'],['%','op']].map(([l,t])=>BTN(l,t as any))}
            </div>
          )}

          {/* Main buttons */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,padding:'0 10px 16px'}}>
            {BTN('C','op')} {BTN('⌫','op')} {BTN('%','op')} {BTN('÷','op')}
            {BTN('7')} {BTN('8')} {BTN('9')} {BTN('×','op')}
            {BTN('4')} {BTN('5')} {BTN('6')} {BTN('-','op')}
            {BTN('1')} {BTN('2')} {BTN('3')} {BTN('+','op')}
            {BTN('0')} {BTN('.')} {BTN('00')} {BTN('=','eq')}
          </div>

          {/* History */}
          {history.length>0&&(
            <div style={{padding:'0 10px 16px'}}>
              <div style={{fontSize:10,color:'var(--text-4)',marginBottom:6}}>History</div>
              {history.slice(0,5).map((h,i)=>(
                <div key={i} onClick={()=>{const[,r]=h.split(' = ');setExpr(r);setResult('')}} style={{fontSize:12,color:'var(--text-3)',padding:'4px 8px',borderRadius:6,cursor:'pointer',fontFamily:"'JetBrains Mono',monospace"}}>{h}</div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
