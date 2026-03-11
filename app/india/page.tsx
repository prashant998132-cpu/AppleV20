'use client'
// app/india/page.tsx — JARVIS India Hub v20
// PNR Status · IFSC Code · Pincode · Fuel Price · Holidays · IP Lookup
// ALL FREE — no API key needed

import { useState } from 'react'
import BottomNav from '../../components/shared/BottomNav'
import { useRouter } from 'next/navigation'

type Tool = 'pnr'|'ifsc'|'pincode'|'fuel'|'holidays'|'ip'|'rto'

const TOOLS: { id: Tool; icon: string; label: string; desc: string }[] = [
  { id:'pnr',      icon:'🚆', label:'PNR Status',   desc:'Train booking status check' },
  { id:'ifsc',     icon:'🏦', label:'IFSC Code',    desc:'Bank branch details' },
  { id:'pincode',  icon:'📍', label:'Pincode',      desc:'City/State from PIN' },
  { id:'fuel',     icon:'⛽', label:'Fuel Price',   desc:'Petrol/Diesel rates' },
  { id:'holidays', icon:'🗓️', label:'Holidays',     desc:'India public holidays 2025' },
  { id:'ip',       icon:'🌐', label:'IP Lookup',    desc:'Your IP + location' },
  { id:'rto',      icon:'🚗', label:'Vehicle Info', desc:'Registration lookup' },
]

const S = {
  page: { background:'#090d18', minHeight:'100dvh', display:'flex', flexDirection:'column' as const, fontFamily:'Space Mono, monospace' },
  header: { padding:'16px 16px 12px', borderBottom:'1px solid rgba(0,229,255,.08)', display:'flex', alignItems:'center', gap:12 },
  grid: { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10, padding:'16px', paddingBottom:90 },
  card: (active:boolean) => ({ background: active?'rgba(0,229,255,.08)':'rgba(255,255,255,.02)', border:`1px solid ${active?'rgba(0,229,255,.3)':'rgba(255,255,255,.06)'}`, borderRadius:14, padding:'14px 10px', textAlign:'center' as const, cursor:'pointer', transition:'all .2s' }),
  panel: { padding:'0 16px 16px' },
  input: { width:'100%', background:'rgba(255,255,255,.03)', border:'1px solid rgba(0,229,255,.15)', borderRadius:10, padding:'10px 12px', color:'var(--text)', fontSize:13, fontFamily:'Space Mono, monospace', outline:'none', boxSizing:'border-box' as const },
  btn: { width:'100%', marginTop:10, padding:'11px', borderRadius:10, background:'rgba(0,229,255,.1)', border:'1px solid rgba(0,229,255,.25)', color:'#00e5ff', fontSize:13, cursor:'pointer', fontFamily:'Space Mono, monospace' },
  result: { marginTop:12, padding:'14px', background:'rgba(0,229,255,.04)', border:'1px solid rgba(0,229,255,.1)', borderRadius:12, color:'var(--text)', fontSize:12, lineHeight:1.7 },
  label: { fontSize:10, color:'var(--text-faint)', marginBottom:5, display:'block' },
  row: { display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid rgba(0,229,255,.04)' },
  key: { color:'var(--text-faint)', fontSize:11 },
  val: { color:'var(--text)', fontSize:11, fontWeight:'bold' as const },
}

function Spinner() {
  return <div style={{display:'flex',justifyContent:'center',padding:'20px 0'}}><div style={{width:20,height:20,border:'2px solid rgba(0,229,255,.2)',borderTop:'2px solid #00e5ff',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
}

function Row({k,v}:{k:string;v:string}) {
  return <div style={S.row}><span style={S.key}>{k}</span><span style={S.val}>{v}</span></div>
}

// ── INDIA HOLIDAYS 2025 ───────────────────────────────────────
const HOLIDAYS_2025 = [
  {date:'Jan 26',name:'Republic Day',day:'Sun'},
  {date:'Mar 14',name:'Holi',day:'Fri'},
  {date:'Apr 14',name:'Dr. Ambedkar Jayanti',day:'Mon'},
  {date:'Apr 18',name:'Good Friday',day:'Fri'},
  {date:'May 1', name:'Maharashtra Day',day:'Thu'},
  {date:'Aug 15',name:'Independence Day',day:'Fri'},
  {date:'Aug 27',name:'Janmashtami',day:'Wed'},
  {date:'Oct 2', name:'Gandhi Jayanti',day:'Thu'},
  {date:'Oct 2', name:'Dussehra',day:'Thu'},
  {date:'Oct 20',name:'Diwali',day:'Mon'},
  {date:'Oct 23',name:'Bhai Dooj',day:'Thu'},
  {date:'Nov 5', name:'Guru Nanak Jayanti',day:'Wed'},
  {date:'Dec 25',name:'Christmas',day:'Thu'},
]

// ── FUEL PRICES (MP — updated regularly) ─────────────────────
const FUEL_PRICES: Record<string, {petrol:number;diesel:number}> = {
  'Madhya Pradesh': { petrol:104.04, diesel:89.86 },
  'Delhi':          { petrol:94.77,  diesel:87.67 },
  'Mumbai':         { petrol:103.44, diesel:89.97 },
  'Rajasthan':      { petrol:107.05, diesel:92.28 },
  'UP':             { petrol:94.86,  diesel:88.03 },
}

export default function IndiaHub() {
  const router = useRouter()
  const [active, setActive] = useState<Tool>('pnr')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [input, setInput] = useState('')
  const [input2, setInput2] = useState('')

  function reset() { setResult(null); setError(''); setInput(''); setInput2('') }

  async function fetchPNR() {
    if (!input.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      // Open IRCTC PNR page in new tab
      window.open(`https://www.indianrail.gov.in/enquiry/PNR/PnrEnquiry.html?locale=en#PNR`, '_blank')
      setResult({ type:'redirect', msg:`PNR ${input} ke liye IRCTC pe redirect kar diya. Browser mein check karo.` })
    } catch { setError('Network error') }
    setLoading(false)
  }

  async function fetchIFSC() {
    if (!input.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${input.toUpperCase().trim()}`)
      if (!res.ok) throw new Error('Invalid IFSC code')
      const d = await res.json()
      setResult({ type:'ifsc', data: d })
    } catch(e: any) { setError(e.message || 'Invalid IFSC code. Format: SBIN0001234') }
    setLoading(false)
  }

  async function fetchPincode() {
    if (!input.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${input.trim()}`)
      const d = await res.json()
      if (d[0].Status !== 'Success') throw new Error('Invalid pincode')
      setResult({ type:'pincode', data: d[0].PostOffice })
    } catch(e: any) { setError(e.message || 'Invalid pincode') }
    setLoading(false)
  }

  async function fetchIP() {
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('https://ipapi.co/json/')
      const d = await res.json()
      setResult({ type:'ip', data: d })
    } catch { setError('IP lookup failed') }
    setLoading(false)
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <button onClick={()=>router.push('/')} style={{background:'none',border:'none',color:'var(--text-faint)',cursor:'pointer',fontSize:18}}>←</button>
        <div>
          <div style={{fontSize:16,color:'#00e5ff',letterSpacing:1}}>🇮🇳 INDIA HUB</div>
          <div style={{fontSize:9,color:'var(--text-faint)'}}>JARVIS India Services — Free, No Key</div>
        </div>
      </div>

      {/* Tool Grid */}
      <div style={S.grid}>
        {TOOLS.map(t => (
          <button key={t.id} onClick={()=>{setActive(t.id);reset()}} style={S.card(active===t.id)}>
            <div style={{fontSize:24,marginBottom:4}}>{t.icon}</div>
            <div style={{fontSize:10,color: active===t.id?'#00e5ff':'var(--text)',fontWeight:'bold'}}>{t.label}</div>
            <div style={{fontSize:9,color:'var(--text-faint)',marginTop:2}}>{t.desc}</div>
          </button>
        ))}
      </div>

      {/* Tool Panels */}
      <div style={S.panel}>

        {/* PNR */}
        {active === 'pnr' && (
          <div>
            <div style={{fontSize:12,color:'#2a6080',marginBottom:12}}>🚆 PNR Status — Train booking check karo</div>
            <span style={S.label}>10-digit PNR Number</span>
            <input style={S.input} placeholder="2345678901" value={input} onChange={e=>setInput(e.target.value)} maxLength={10}/>
            <button style={S.btn} onClick={fetchPNR}>IRCTC pe Check Karo →</button>
            <div style={{marginTop:8,fontSize:10,color:'var(--text-faint)'}}>Note: PNR status IRCTC official site pe redirect hoga</div>
            {result?.type==='redirect' && <div style={S.result}>{result.msg}</div>}

            <div style={{marginTop:16,padding:'12px',background:'rgba(255,255,255,.02)',borderRadius:12,border:'1px solid rgba(255,255,255,.05)'}}>
              <div style={{fontSize:11,color:'var(--border)',marginBottom:8}}>🔗 Quick Links</div>
              {[
                ['IRCTC PNR','https://www.indianrail.gov.in/enquiry/PNR/PnrEnquiry.html'],
                ['Train Running Status','https://etrain.info/'],
                ['IRCTC Book Ticket','https://www.irctc.co.in/'],
                ['NTES Live','https://enquiry.indianrail.gov.in/'],
              ].map(([l,u])=>(
                <a key={l} href={u} target="_blank" rel="noopener"
                  style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,.03)',color:'#2a7090',textDecoration:'none',fontSize:11}}>
                  <span>{l}</span><span>→</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* IFSC */}
        {active === 'ifsc' && (
          <div>
            <div style={{fontSize:12,color:'#2a6080',marginBottom:12}}>🏦 IFSC Code — Bank branch details</div>
            <span style={S.label}>IFSC Code (e.g. SBIN0001234)</span>
            <input style={S.input} placeholder="SBIN0001234" value={input} onChange={e=>setInput(e.target.value.toUpperCase())} maxLength={11}/>
            <button style={S.btn} onClick={fetchIFSC}>Search</button>
            {loading && <Spinner/>}
            {error && <div style={{...S.result, borderColor:'rgba(255,100,100,.2)', color:'#ff9090'}}>{error}</div>}
            {result?.type==='ifsc' && (
              <div style={S.result}>
                <Row k="Bank" v={result.data.BANK}/>
                <Row k="Branch" v={result.data.BRANCH}/>
                <Row k="City" v={result.data.CITY}/>
                <Row k="State" v={result.data.STATE}/>
                <Row k="Address" v={result.data.ADDRESS}/>
                <Row k="MICR" v={result.data.MICR || '—'}/>
                <Row k="Contact" v={result.data.CONTACT || '—'}/>
                <Row k="UPI" v={result.data.UPI ? '✅ Supported' : '❌ Not supported'}/>
                <Row k="IMPS" v={result.data.IMPS ? '✅' : '❌'}/>
                <Row k="NEFT" v={result.data.NEFT ? '✅' : '❌'}/>
                <Row k="RTGS" v={result.data.RTGS ? '✅' : '❌'}/>
              </div>
            )}
          </div>
        )}

        {/* Pincode */}
        {active === 'pincode' && (
          <div>
            <div style={{fontSize:12,color:'#2a6080',marginBottom:12}}>📍 Pincode Lookup — City aur State pata karo</div>
            <span style={S.label}>6-digit Pincode</span>
            <input style={S.input} placeholder="485775" value={input} onChange={e=>setInput(e.target.value)} maxLength={6}/>
            <button style={S.btn} onClick={fetchPincode}>Search</button>
            {loading && <Spinner/>}
            {error && <div style={{...S.result, borderColor:'rgba(255,100,100,.2)', color:'#ff9090'}}>{error}</div>}
            {result?.type==='pincode' && (
              <div style={S.result}>
                <div style={{fontSize:12,color:'#00e5ff',marginBottom:8}}>📍 {result.data.length} post office(s) found</div>
                {result.data.slice(0,5).map((po: any, i: number) => (
                  <div key={i} style={{marginBottom:10,paddingBottom:8,borderBottom:'1px solid rgba(0,229,255,.06)'}}>
                    <Row k="Post Office" v={po.Name}/>
                    <Row k="District" v={po.District}/>
                    <Row k="State" v={po.State}/>
                    <Row k="Region" v={po.Region}/>
                    <Row k="Division" v={po.Division}/>
                    <Row k="Type" v={po.BranchType}/>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Fuel */}
        {active === 'fuel' && (
          <div>
            <div style={{fontSize:12,color:'#2a6080',marginBottom:12}}>⛽ Fuel Prices — Today's rates (approx)</div>
            <div style={{...S.result, marginTop:0}}>
              <div style={{fontSize:11,color:'#00e5ff',marginBottom:10,fontWeight:'bold'}}>State-wise Rates (₹/litre)</div>
              {Object.entries(FUEL_PRICES).map(([state, prices]) => (
                <div key={state} style={{marginBottom:8,paddingBottom:6,borderBottom:'1px solid rgba(0,229,255,.05)'}}>
                  <div style={{fontSize:11,color:'#2a8090',marginBottom:4}}>{state}</div>
                  <div style={{display:'flex',gap:16}}>
                    <span style={{fontSize:12,color:'#00e5ff'}}>⛽ Petrol: ₹{prices.petrol}</span>
                    <span style={{fontSize:12,color:'#80d0ff'}}>🛢️ Diesel: ₹{prices.diesel}</span>
                  </div>
                </div>
              ))}
              <div style={{fontSize:9,color:'var(--text-faint)',marginTop:8}}>Rates approximate — check IOCL/BPCL app for exact today's price</div>
            </div>
            <div style={{marginTop:10,display:'flex',flexDirection:'column',gap:8}}>
              {[['IOCL Price','https://iocl.com/retail-selling-price'],['BPCL Price','https://mbp.bharatpetroleum.in/']].map(([l,u])=>(
                <a key={l} href={u} target="_blank" rel="noopener"
                  style={{padding:'10px 14px',background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,color:'#2a7090',textDecoration:'none',fontSize:11,display:'block'}}>
                  🔗 {l} →
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Holidays */}
        {active === 'holidays' && (
          <div>
            <div style={{fontSize:12,color:'#2a6080',marginBottom:12}}>🗓️ India National Holidays 2025</div>
            <div style={S.result}>
              {HOLIDAYS_2025.map((h,i) => (
                <div key={i} style={S.row}>
                  <span style={{...S.key,width:60}}>{h.date}</span>
                  <span style={{...S.val,flex:1}}>{h.name}</span>
                  <span style={{fontSize:9,color:'var(--text-faint)'}}>{h.day}</span>
                </div>
              ))}
            </div>
            <div style={{marginTop:8,fontSize:9,color:'var(--text-faint)'}}>State holidays alag ho sakte hain</div>
          </div>
        )}

        {/* IP Lookup */}
        {active === 'ip' && (
          <div>
            <div style={{fontSize:12,color:'#2a6080',marginBottom:12}}>🌐 IP Lookup — Apna IP aur location dekho</div>
            <button style={S.btn} onClick={fetchIP}>My IP Check Karo</button>
            {loading && <Spinner/>}
            {error && <div style={{...S.result, borderColor:'rgba(255,100,100,.2)', color:'#ff9090'}}>{error}</div>}
            {result?.type==='ip' && (
              <div style={S.result}>
                <Row k="IP Address" v={result.data.ip}/>
                <Row k="City" v={result.data.city}/>
                <Row k="Region" v={result.data.region}/>
                <Row k="Country" v={result.data.country_name}/>
                <Row k="ISP" v={result.data.org}/>
                <Row k="Timezone" v={result.data.timezone}/>
                <Row k="Latitude" v={String(result.data.latitude)}/>
                <Row k="Longitude" v={String(result.data.longitude)}/>
              </div>
            )}
          </div>
        )}

        {/* RTO */}
        {active === 'rto' && (
          <div>
            <div style={{fontSize:12,color:'#2a6080',marginBottom:12}}>🚗 Vehicle Registration Lookup</div>
            <span style={S.label}>Registration Number (e.g. MP20CA1234)</span>
            <input style={S.input} placeholder="MP20CA1234" value={input} onChange={e=>setInput(e.target.value.toUpperCase())}/>
            <button style={S.btn} onClick={()=>window.open(`https://vahan.parivahan.gov.in/vahanservice/vahan/ui/statevalidation/homepage.xhtml`,'_blank')}>
              Parivahan pe Check Karo →
            </button>
            <div style={{marginTop:8,fontSize:10,color:'var(--text-faint)'}}>VAHAN official portal pe redirect hoga</div>

            <div style={{marginTop:16,padding:'12px',background:'rgba(255,255,255,.02)',borderRadius:12,border:'1px solid rgba(255,255,255,.05)'}}>
              <div style={{fontSize:11,color:'var(--border)',marginBottom:8}}>🔗 Parivahan Services</div>
              {[
                ['Vehicle RC Status','https://vahan.parivahan.gov.in/'],
                ['Driving Licence','https://sarathi.parivahan.gov.in/'],
                ['Challan Check','https://echallan.parivahan.gov.in/'],
                ['FASTag','https://www.npci.org.in/what-we-do/netc-fastag'],
              ].map(([l,u])=>(
                <a key={l} href={u} target="_blank" rel="noopener"
                  style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,.03)',color:'#2a7090',textDecoration:'none',fontSize:11}}>
                  <span>{l}</span><span>→</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav/>
    </div>
  )
}
