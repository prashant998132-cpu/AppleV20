'use client'
// app/tools/page.tsx — JARVIS India Tools v17
// 100% offline — pure math, zero API, zero Vercel bandwidth
// Calculators: SIP, EMI, GST, BMI, Unit converter, Age, Percentage

import { useState } from 'react'
import BottomNav from '../../components/shared/BottomNav'

const BG     = 'var(--bg)'
const CARD   = 'var(--bg-card)'
const BORDER = 'var(--border)'
const ACCENT = 'var(--accent)'
const DIM    = 'var(--text-faint)'

// ── Types ─────────────────────────────────────────────────
type Tool = 'sip' | 'emi' | 'gst' | 'bmi' | 'unit' | 'age' | 'percent' | 'electricity'

const TOOLS: { id: Tool; icon: string; label: string; tag: string }[] = [
  { id: 'sip',         icon: '📈', label: 'SIP Calculator',    tag: 'Investment' },
  { id: 'emi',         icon: '🏦', label: 'EMI Calculator',    tag: 'Loan'       },
  { id: 'gst',         icon: '🧾', label: 'GST Calculator',    tag: 'Tax'        },
  { id: 'bmi',         icon: '⚖️', label: 'BMI Calculator',    tag: 'Health'     },
  { id: 'electricity', icon: '⚡', label: 'Electricity Bill',  tag: 'Utility'    },
  { id: 'percent',     icon: '🔢', label: '% Calculator',      tag: 'Math'       },
  { id: 'age',         icon: '🎂', label: 'Age Calculator',    tag: 'Date'       },
  { id: 'unit',        icon: '📏', label: 'Unit Converter',    tag: 'Convert'    },
]

// ── Input field helper ────────────────────────────────────
function Field({ label, value, onChange, type='number', placeholder, suffix }:
  { label:string; value:string; onChange:(v:string)=>void; type?:string; placeholder?:string; suffix?:string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: DIM, marginBottom: 5 }}>{label}</div>
      <div style={{ display: 'flex', gap: 0 }}>
        <input
          type={type} value={value} onChange={e=>onChange(e.target.value)}
          placeholder={placeholder || '0'}
          style={{ flex: 1, padding: '10px 12px', borderRadius: suffix ? '8px 0 0 8px' : 8,
            background: 'rgba(255,255,255,.06)', border: `1px solid ${BORDER}`,
            borderRight: suffix ? 'none' : `1px solid ${BORDER}`,
            color: 'var(--text)', fontSize: 14, outline: 'none' }} />
        {suffix && (
          <div style={{ padding: '10px 12px', background: 'var(--bg-card)',
            border: `1px solid ${BORDER}`, borderRadius: '0 8px 8px 0',
            color: DIM, fontSize: 12, display: 'flex', alignItems: 'center' }}>
            {suffix}
          </div>
        )}
      </div>
    </div>
  )
}

function Result({ label, value, highlight }:{ label:string; value:string; highlight?:boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px',
      background: highlight ? 'rgba(0,229,255,.08)' : 'rgba(255,255,255,.03)',
      borderRadius: 8, marginBottom: 6,
      border: `1px solid ${highlight ? 'rgba(0,229,255,.2)' : BORDER}` }}>
      <span style={{ fontSize: 12, color: DIM }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: highlight ? 700 : 400,
        color: highlight ? ACCENT : 'var(--text)', fontFamily: 'Space Mono, monospace' }}>
        {value}
      </span>
    </div>
  )
}

const fmt = (n: number) => n >= 1e7
  ? `₹${(n/1e7).toFixed(2)} Cr`
  : n >= 1e5
  ? `₹${(n/1e5).toFixed(2)} L`
  : `₹${Math.round(n).toLocaleString('en-IN')}`

// ═══════════════════════════════════════════════════════════
// CALCULATORS
// ═══════════════════════════════════════════════════════════

// ── SIP ───────────────────────────────────────────────────
function SIPCalc() {
  const [monthly, setMonthly]   = useState('5000')
  const [rate,    setRate]      = useState('12')
  const [years,   setYears]     = useState('10')

  const r = parseFloat(rate) / 12 / 100
  const n = parseFloat(years) * 12
  const p = parseFloat(monthly) || 0
  const fv = p * ((Math.pow(1 + r, n) - 1) / r) * (1 + r)
  const invested = p * n
  const gains = fv - invested

  return (
    <div>
      <Field label="Monthly Investment" value={monthly} onChange={setMonthly} suffix="₹" />
      <Field label="Expected Annual Return" value={rate} onChange={setRate} suffix="%" />
      <Field label="Time Period" value={years} onChange={setYears} suffix="Yrs" />
      <div style={{ marginTop: 16 }}>
        <Result label="Total Invested" value={fmt(invested)} />
        <Result label="Total Gains"    value={fmt(gains)}    />
        <Result label="Maturity Value" value={fmt(fv)}       highlight />
        <div style={{ fontSize: 10, color: DIM, marginTop: 8, textAlign: 'center' }}>
          ✨ Wealth gain: {invested > 0 ? ((gains/invested)*100).toFixed(1) : 0}% on investment
        </div>
      </div>
    </div>
  )
}

// ── EMI ───────────────────────────────────────────────────
function EMICalc() {
  const [principal, setPrincipal] = useState('500000')
  const [rate,      setRate]      = useState('9')
  const [tenure,    setTenure]    = useState('5')

  const P = parseFloat(principal) || 0
  const r = parseFloat(rate) / 12 / 100
  const n = parseFloat(tenure) * 12
  const emi = P * r * Math.pow(1+r, n) / (Math.pow(1+r, n) - 1)
  const total = emi * n
  const interest = total - P

  return (
    <div>
      <Field label="Loan Amount"       value={principal} onChange={setPrincipal} suffix="₹" />
      <Field label="Annual Interest Rate" value={rate}   onChange={setRate}      suffix="%" />
      <Field label="Loan Tenure"       value={tenure}    onChange={setTenure}    suffix="Yrs" />
      <div style={{ marginTop: 16 }}>
        <Result label="Monthly EMI"    value={fmt(emi)}      highlight />
        <Result label="Total Interest" value={fmt(interest)} />
        <Result label="Total Amount"   value={fmt(total)}    />
      </div>
      {/* EMI Breakdown bar */}
      <div style={{ marginTop: 12, borderRadius: 8, overflow: 'hidden', height: 12, display: 'flex' }}>
        <div style={{ width: `${(P/total)*100}%`, background: ACCENT }}></div>
        <div style={{ flex: 1, background: '#ff4444' }}></div>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 10 }}>
        <span style={{ color: ACCENT }}>■ Principal {total > 0 ? ((P/total)*100).toFixed(0) : 0}%</span>
        <span style={{ color: '#ff4444' }}>■ Interest {total > 0 ? ((interest/total)*100).toFixed(0) : 0}%</span>
      </div>
    </div>
  )
}

// ── GST ───────────────────────────────────────────────────
function GSTCalc() {
  const [amount,    setAmount]  = useState('1000')
  const [gstRate,   setGstRate] = useState('18')
  const [inclusive, setInclusive] = useState(false)

  const amt  = parseFloat(amount) || 0
  const rate = parseFloat(gstRate) / 100

  let base: number, gst: number, total: number
  if (inclusive) {
    // Amount includes GST
    total = amt
    base  = amt / (1 + rate)
    gst   = total - base
  } else {
    base  = amt
    gst   = amt * rate
    total = base + gst
  }

  const cgst = gst / 2
  const sgst = gst / 2

  return (
    <div>
      <Field label="Amount" value={amount} onChange={setAmount} suffix="₹" />
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: DIM, marginBottom: 5 }}>GST Rate</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['3','5','12','18','28'].map(r => (
            <button key={r} onClick={() => setGstRate(r)}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12,
                background: gstRate === r ? ACCENT : 'rgba(255,255,255,.06)',
                color: gstRate === r ? '#000' : 'var(--text)' }}>
              {r}%
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div onClick={() => setInclusive(!inclusive)}
          style={{ width: 36, height: 20, borderRadius: 10, background: inclusive ? ACCENT : 'rgba(255,255,255,.1)',
            position: 'relative', cursor: 'pointer', transition: 'background .2s' }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff',
            position: 'absolute', top: 2, left: inclusive ? 18 : 2, transition: 'left .2s' }}/>
        </div>
        <span style={{ fontSize: 12, color: DIM }}>GST inclusive price</span>
      </div>
      <Result label="Base Amount"  value={fmt(base)}  />
      <Result label="CGST"         value={fmt(cgst)}  />
      <Result label="SGST"         value={fmt(sgst)}  />
      <Result label="Total (with GST)" value={fmt(total)} highlight />
    </div>
  )
}

// ── BMI ───────────────────────────────────────────────────
function BMICalc() {
  const [weight, setWeight] = useState('65')
  const [height, setHeight] = useState('170')
  const [age,    setAge]    = useState('18')

  const w = parseFloat(weight) || 0
  const h = parseFloat(height) / 100 || 1
  const bmi = w / (h * h)

  const [cat, color, advice] = bmi < 18.5 ? ['Underweight 😟', '#ff9800', 'Thoda zyada khao, nutrients lene se weight badhega.']
    : bmi < 25 ? ['Normal Weight ✅', '#00e676', 'Bilkul sahi! Aise hi khao-piyo aur exercise karo.']
    : bmi < 30 ? ['Overweight ⚠️', '#ff9800', 'Exercise badhao, junk food kam karo.']
    : ['Obese 🚨', '#ff4444', 'Doctor se zaroor milna. Diet + exercise critical hai.']

  const idealMin = (18.5 * h * h).toFixed(1)
  const idealMax = (24.9 * h * h).toFixed(1)

  return (
    <div>
      <Field label="Weight" value={weight} onChange={setWeight} suffix="kg" />
      <Field label="Height" value={height} onChange={setHeight} suffix="cm" />
      <Field label="Age"    value={age}    onChange={setAge}    suffix="yrs" />
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 52, fontWeight: 700, color, fontFamily: 'Space Mono, monospace' }}>
          {bmi > 0 ? bmi.toFixed(1) : '—'}
        </div>
        <div style={{ fontSize: 16, color, fontWeight: 600, marginTop: 4 }}>{bmi > 0 ? cat : ''}</div>
      </div>
      {bmi > 0 && (
        <>
          {/* BMI scale bar */}
          <div style={{ position: 'relative', height: 10, borderRadius: 5, overflow: 'hidden', background: 'linear-gradient(to right, #2196f3, #00e676, #ff9800, #ff4444)', marginBottom: 8 }}>
            <div style={{
              position: 'absolute', top: -3, width: 16, height: 16,
              borderRadius: '50%', background: '#fff', border: '2px solid #000',
              left: `${Math.min(Math.max((bmi - 10) / 30 * 100, 0), 100)}%`,
              transform: 'translateX(-50%)'
            }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: DIM, marginBottom: 12 }}>
            <span>10 Underweight</span><span>18.5 Normal</span><span>25 Over</span><span>30+ Obese</span>
          </div>
          <Result label="Ideal Weight Range" value={`${idealMin}–${idealMax} kg`} />
          <div style={{ fontSize: 11, color: '#8ba8c8', background: 'rgba(255,255,255,.03)', borderRadius: 8, padding: '10px 12px', marginTop: 8, lineHeight: 1.5 }}>{advice}</div>
        </>
      )}
    </div>
  )
}

// ── Electricity Bill ──────────────────────────────────────
function ElectricityCalc() {
  const [units,   setUnits]   = useState('200')
  const [rate,    setRate]    = useState('6.5')
  const [fixed,   setFixed]   = useState('50')

  const u = parseFloat(units) || 0
  const r = parseFloat(rate)  || 0
  const f = parseFloat(fixed) || 0

  const energyCharge = u * r
  const total = energyCharge + f

  // Slab info (approximate MP/UP rates)
  const slab = u <= 50 ? `First 50 units: subsidized rate` : u <= 150 ? 'Normal domestic rate' : 'Higher consumption slab'

  return (
    <div>
      <Field label="Monthly Units (kWh)" value={units} onChange={setUnits} suffix="kWh" />
      <Field label="Rate per Unit"       value={rate}  onChange={setRate}  suffix="₹/unit" />
      <Field label="Fixed/Meter Charge"  value={fixed} onChange={setFixed} suffix="₹" />
      <div style={{ marginTop: 16 }}>
        <Result label="Energy Charge"  value={fmt(energyCharge)} />
        <Result label="Fixed Charges"  value={fmt(f)}            />
        <Result label="Total Bill"     value={fmt(total)}        highlight />
        <div style={{ fontSize: 10, color: DIM, textAlign: 'center', marginTop: 8 }}>{slab}</div>
        <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(0,229,255,.05)', borderRadius: 8, border: '1px solid rgba(0,229,255,.1)' }}>
          <div style={{ fontSize: 11, color: ACCENT, fontWeight: 600, marginBottom: 6 }}>💡 Bachat ke tips</div>
          {[
            u > 200 && 'LED bulbs: 75% bijli bachao',
            u > 300 && '5-star AC at 24°C: 20% savings',
            u > 400 && 'Solar panels consider karo — 4-5 yr payback',
            u <= 100 && 'Tum bahut efficient ho! Seedha! ✅',
          ].filter(Boolean).map((tip, i) => (
            <div key={i} style={{ fontSize: 11, color: '#8ba8c8', marginBottom: 2 }}>• {tip}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Percentage Calculator ─────────────────────────────────
function PercentCalc() {
  const [a, setA] = useState('75')
  const [b, setB] = useState('100')
  const [mode, setMode] = useState<'pct'|'of'|'change'>('pct')

  const x = parseFloat(a) || 0
  const y = parseFloat(b) || 1

  const results = {
    pct:    { label: `${a}% of ${b}`, value: (x / 100 * y).toFixed(2) },
    of:     { label: `${a} is what % of ${b}`, value: ((x / y) * 100).toFixed(2) + '%' },
    change: { label: `% change: ${a} → ${b}`, value: (((y - x) / x) * 100).toFixed(2) + '%' },
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[['pct','X% of Y'],['of','X is ?% of Y'],['change','% Change']].map(([m,l])=>(
          <button key={m} onClick={()=>setMode(m as any)}
            style={{ flex:1, padding:'7px 4px', borderRadius:8, border:'none', cursor:'pointer', fontSize:10,
              background: mode===m ? ACCENT : 'rgba(255,255,255,.06)',
              color: mode===m ? '#000' : 'var(--text)', fontWeight: mode===m ? 700 : 400 }}>
            {l}
          </button>
        ))}
      </div>
      <Field label="First Number"  value={a} onChange={setA} />
      <Field label="Second Number" value={b} onChange={setB} />
      <div style={{ marginTop: 16 }}>
        <Result label={results[mode].label} value={results[mode].value} highlight />
        {/* Quick percentages */}
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 10, color: DIM, marginBottom: 6 }}>Quick: % of {b}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {[10,20,25,30,50,75].map(pct=>(
              <div key={pct} style={{ padding:'4px 10px', borderRadius:6, background:'var(--bg-card)', border:`1px solid ${BORDER}`, fontSize:11 }}>
                <span style={{ color: DIM }}>{pct}%: </span>
                <span style={{ color:'var(--text)' }}>{((pct/100)*y).toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Age Calculator ─────────────────────────────────────────
function AgeCalc() {
  const [dob, setDob] = useState('')
  const now  = new Date()
  const birth = dob ? new Date(dob) : null

  let years = 0, months = 0, days = 0, nextBday = ''
  if (birth && birth < now) {
    years  = now.getFullYear() - birth.getFullYear()
    months = now.getMonth()    - birth.getMonth()
    days   = now.getDate()     - birth.getDate()
    if (days   < 0) { months--; days   += new Date(now.getFullYear(), now.getMonth(), 0).getDate() }
    if (months < 0) { years--;  months += 12 }
    const nextYear = now.getMonth() > birth.getMonth() ||
      (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate())
      ? now.getFullYear() + 1 : now.getFullYear()
    const bd  = new Date(nextYear, birth.getMonth(), birth.getDate())
    const diff = Math.ceil((bd.getTime() - now.getTime()) / 86400000)
    nextBday  = diff === 0 ? '🎂 Aaj birthday hai!' : `${diff} din baad`
  }

  return (
    <div>
      <Field label="Date of Birth" value={dob} onChange={setDob} type="date" />
      {birth && birth < now && (
        <div style={{ marginTop: 16 }}>
          <div style={{ textAlign:'center', padding:'16px 0' }}>
            <div style={{ fontSize:48, fontWeight:700, color:ACCENT, fontFamily:'Space Mono,monospace' }}>{years}</div>
            <div style={{ fontSize:13, color:DIM }}>years old</div>
          </div>
          <Result label="Years"  value={`${years} saal`}   />
          <Result label="Months" value={`${months} mahine`} />
          <Result label="Days"   value={`${days} din`}      />
          <Result label="Total Days"   value={`${Math.floor((now.getTime()-birth.getTime())/86400000).toLocaleString('en-IN')} days`} />
          <Result label="Next Birthday" value={nextBday}    highlight />
        </div>
      )}
    </div>
  )
}

// ── Unit Converter ────────────────────────────────────────
const UNITS: Record<string, { label:string; units:{ id:string; label:string; toBase:(n:number)=>number; fromBase:(n:number)=>number }[] }> = {
  length: {
    label: '📏 Length',
    units: [
      { id:'m',   label:'Meter',      toBase:n=>n,          fromBase:n=>n          },
      { id:'km',  label:'Kilometer',  toBase:n=>n*1000,     fromBase:n=>n/1000     },
      { id:'cm',  label:'Centimeter', toBase:n=>n/100,      fromBase:n=>n*100      },
      { id:'mm',  label:'Millimeter', toBase:n=>n/1000,     fromBase:n=>n*1000     },
      { id:'ft',  label:'Feet',       toBase:n=>n*0.3048,   fromBase:n=>n/0.3048   },
      { id:'in',  label:'Inch',       toBase:n=>n*0.0254,   fromBase:n=>n/0.0254   },
      { id:'mi',  label:'Mile',       toBase:n=>n*1609.344, fromBase:n=>n/1609.344 },
    ]
  },
  weight: {
    label: '⚖️ Weight',
    units: [
      { id:'kg',  label:'Kilogram',  toBase:n=>n,      fromBase:n=>n       },
      { id:'g',   label:'Gram',      toBase:n=>n/1000, fromBase:n=>n*1000  },
      { id:'lb',  label:'Pound',     toBase:n=>n*0.454, fromBase:n=>n/0.454 },
      { id:'oz',  label:'Ounce',     toBase:n=>n*0.0284, fromBase:n=>n/0.0284 },
      { id:'mg',  label:'Milligram', toBase:n=>n/1e6, fromBase:n=>n*1e6   },
    ]
  },
  temp: {
    label: '🌡️ Temperature',
    units: [
      { id:'c', label:'Celsius',    toBase:n=>n,           fromBase:n=>n               },
      { id:'f', label:'Fahrenheit', toBase:n=>(n-32)*5/9,  fromBase:n=>n*9/5+32        },
      { id:'k', label:'Kelvin',     toBase:n=>n-273.15,    fromBase:n=>n+273.15        },
    ]
  },
  area: {
    label: '📐 Area',
    units: [
      { id:'sqm',  label:'Sq Meter',  toBase:n=>n,       fromBase:n=>n      },
      { id:'sqft', label:'Sq Feet',   toBase:n=>n*0.0929, fromBase:n=>n/0.0929 },
      { id:'acre', label:'Acre',      toBase:n=>n*4047,  fromBase:n=>n/4047 },
      { id:'ha',   label:'Hectare',   toBase:n=>n*10000, fromBase:n=>n/10000 },
      { id:'sqkm', label:'Sq Km',     toBase:n=>n*1e6,   fromBase:n=>n/1e6  },
      { id:'bigha',label:'Bigha (UP)',toBase:n=>n*2529,  fromBase:n=>n/2529 },
    ]
  }
}

function UnitConv() {
  const [category, setCategory]   = useState<keyof typeof UNITS>('length')
  const [value,    setValue]       = useState('1')
  const [fromUnit, setFromUnit]    = useState('m')
  const [toUnit,   setToUnit]      = useState('ft')

  const cat    = UNITS[category]
  const from   = cat.units.find(u=>u.id===fromUnit) || cat.units[0]
  const to     = cat.units.find(u=>u.id===toUnit)   || cat.units[1]
  const v      = parseFloat(value) || 0
  const result = to.fromBase(from.toBase(v))

  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:14, overflowX:'auto', paddingBottom:4 }}>
        {Object.entries(UNITS).map(([k,v])=>(
          <button key={k} onClick={()=>{ setCategory(k as any); setValue('1')
            setFromUnit(UNITS[k as keyof typeof UNITS].units[0].id)
            setToUnit(UNITS[k as keyof typeof UNITS].units[1].id) }}
            style={{ padding:'6px 12px', borderRadius:8, border:'none', cursor:'pointer',
              fontSize:11, whiteSpace:'nowrap',
              background: category===k ? ACCENT : 'rgba(255,255,255,.06)',
              color: category===k ? '#000' : 'var(--text)' }}>
            {v.label}
          </button>
        ))}
      </div>
      <Field label="Value" value={value} onChange={setValue} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
        {[['From', fromUnit, setFromUnit], ['To', toUnit, setToUnit]].map(([lbl, val, setFn])=>(
          <div key={String(lbl)}>
            <div style={{ fontSize:11, color:DIM, marginBottom:5 }}>{String(lbl)}</div>
            <select value={String(val)} onChange={e=>(setFn as any)(e.target.value)}
              style={{ width:'100%', padding:'9px 10px', borderRadius:8,
                background:'rgba(255,255,255,.06)', border:`1px solid ${BORDER}`,
                color:'var(--text)', fontSize:13, outline:'none' }}>
              {cat.units.map(u=><option key={u.id} value={u.id} style={{ background:'#0d1b2a' }}>{u.label}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div style={{ textAlign:'center', padding:'16px 0', background:'rgba(0,229,255,.06)', borderRadius:12, border:`1px solid rgba(0,229,255,.15)` }}>
        <div style={{ fontSize:13, color:DIM, marginBottom:4 }}>{value} {from.label} =</div>
        <div style={{ fontSize:32, fontWeight:700, color:ACCENT, fontFamily:'Space Mono,monospace' }}>
          {result >= 1e9 ? result.toExponential(3) : parseFloat(result.toPrecision(7)).toLocaleString('en-IN')}
        </div>
        <div style={{ fontSize:14, color:'#8ba8c8', marginTop:4 }}>{to.label}</div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════
export default function ToolsPage() {
  const [active, setActive] = useState<Tool>('sip')

  const CALC: Record<Tool, React.ReactNode> = {
    sip:         <SIPCalc />,
    emi:         <EMICalc />,
    gst:         <GSTCalc />,
    bmi:         <BMICalc />,
    electricity: <ElectricityCalc />,
    percent:     <PercentCalc />,
    age:         <AgeCalc />,
    unit:        <UnitConv />,
  }

  const current = TOOLS.find(t => t.id === active)!

  return (
    <div style={{ minHeight:'100vh', background:BG, color:'var(--text)', display:'flex', flexDirection:'column',
      fontFamily:"'Noto Sans Devanagari',system-ui,sans-serif", maxWidth:480, margin:'0 auto' }}>

      {/* Header */}
      <header style={{ padding:'14px 16px 10px', borderBottom:`1px solid ${BORDER}`, position:'sticky', top:0, zIndex:10, background:BG }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:'rgba(0,229,255,.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🔧</div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:ACCENT }}>India Tools</div>
            <div style={{ fontSize:10, color:DIM }}>Offline · Zero data · Tez</div>
          </div>
        </div>
      </header>

      {/* Tool grid */}
      <div style={{ padding:'10px 14px', borderBottom:`1px solid ${BORDER}` }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
          {TOOLS.map(t => (
            <button key={t.id} onClick={() => setActive(t.id)}
              style={{ padding:'8px 4px', borderRadius:10, border:`1px solid ${active===t.id ? 'rgba(0,229,255,.4)' : BORDER}`,
                background: active===t.id ? 'rgba(0,229,255,.1)' : CARD,
                cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
              <span style={{ fontSize:18 }}>{t.icon}</span>
              <span style={{ fontSize:8, color: active===t.id ? ACCENT : DIM, textAlign:'center', lineHeight:1.2 }}>{t.label.replace(' Calculator','').replace(' Converter','')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active tool */}
      <main style={{ flex:1, overflowY:'auto', padding:'16px 16px 90px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
          <span style={{ fontSize:22 }}>{current.icon}</span>
          <div>
            <div style={{ fontSize:15, fontWeight:700 }}>{current.label}</div>
            <div style={{ fontSize:10, color:DIM }}>{current.tag} · Offline Calculator</div>
          </div>
        </div>
        {CALC[active]}
      </main>

      <BottomNav />
    </div>
  )
}
