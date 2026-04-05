'use client'
// app/crypto/page.tsx — JARVIS Crypto Dashboard
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initTheme } from '../../lib/theme'

interface Coin { id:string; symbol:string; name:string; price:number; change24h:number; cap:string; img:string; high:number; low:number }
interface Portfolio { id:string; symbol:string; amount:number; buyPrice:number }

export default function CryptoPage() {
  const router = useRouter()
  const [coins, setCoins] = useState<Coin[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'market'|'portfolio'|'trending'>('market')
  const [portfolio, setPortfolio] = useState<Portfolio[]>([])
  const [search, setSearch] = useState('')
  const [addCoin, setAddCoin] = useState('')
  const [addAmt, setAddAmt] = useState('')
  const [addPrice, setAddPrice] = useState('')
  const [currency, setCurrency] = useState<'usd'|'inr'>('inr')

  useEffect(() => {
    initTheme()
    try { setPortfolio(JSON.parse(localStorage.getItem('jarvis_portfolio')||'[]')) } catch {}
    loadCoins()
    const int = setInterval(loadCoins, 60000)
    return () => clearInterval(int)
  }, [])

  const loadCoins = async () => {
    try {
      const r = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=inr&order=market_cap_desc&per_page=30&page=1&sparkline=false&price_change_percentage=24h')
      if (r.ok) {
        const d = await r.json()
        setCoins(d.map((c:any) => ({
          id:c.id, symbol:c.symbol.toUpperCase(), name:c.name,
          price:c.current_price, change24h:c.price_change_percentage_24h||0,
          cap:c.market_cap>1e12?`₹${(c.market_cap/1e12).toFixed(1)}T`:c.market_cap>1e9?`₹${(c.market_cap/1e9).toFixed(0)}B`:`₹${(c.market_cap/1e6).toFixed(0)}M`,
          img:c.image, high:c.high_24h, low:c.low_24h
        })))
        setLoading(false)
      }
    } catch { setLoading(false) }
  }

  const fmt = (n:number) => n>1000?`₹${n.toLocaleString('en-IN',{maximumFractionDigits:0})}`:n>1?`₹${n.toFixed(2)}`:`₹${n.toFixed(6)}`
  const fmtUSD = (n:number) => n>1?`$${n.toFixed(2)}`:`$${n.toFixed(6)}`

  const savePortfolio = (p:Portfolio[]) => { setPortfolio(p); localStorage.setItem('jarvis_portfolio',JSON.stringify(p)) }

  const addToPortfolio = () => {
    const coin = coins.find(c=>c.symbol===addCoin.toUpperCase()||c.id===addCoin.toLowerCase())
    if(!coin||!addAmt) return
    const p:Portfolio = { id:coin.id, symbol:coin.symbol, amount:Number(addAmt), buyPrice:Number(addPrice)||coin.price }
    savePortfolio([...portfolio,p]); setAddCoin(''); setAddAmt(''); setAddPrice('')
  }

  const portfolioValue = portfolio.reduce((sum,p) => {
    const coin = coins.find(c=>c.id===p.id); return sum + (coin?.price||0)*p.amount
  },0)
  const portfolioCost = portfolio.reduce((sum,p) => sum + p.buyPrice*p.amount,0)
  const portfolioPnL = portfolioValue - portfolioCost

  const visible = coins.filter(c => !search || c.symbol.includes(search.toUpperCase()) || c.name.toLowerCase().includes(search.toLowerCase()))
  const trending = [...coins].sort((a,b) => Math.abs(b.change24h)-Math.abs(a.change24h)).slice(0,10)

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg)',color:'var(--text)',fontFamily:"'Inter',sans-serif"}}>
      <div className="bg-grid"/>
      {/* Header */}
      <div style={{position:'sticky',top:0,zIndex:50,background:'var(--header)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--border)',padding:'10px 16px',display:'flex',alignItems:'center',gap:8}}>
        <button onClick={()=>router.push('/')} style={{background:'var(--accent-bg)',border:'1px solid var(--border-a)',borderRadius:8,color:'var(--accent)',fontSize:14,fontWeight:800,width:28,height:28,fontFamily:'monospace'}}>J</button>
        <div style={{flex:1}}><div style={{fontSize:15,fontWeight:700}}>₿ Crypto Market</div><div style={{fontSize:10,color:'var(--text-3)'}}>Live · CoinGecko</div></div>
        <button onClick={()=>setCurrency(c=>c==='inr'?'usd':'inr')} style={{fontSize:11,padding:'4px 10px',borderRadius:8,background:'var(--accent-bg)',border:'1px solid var(--border-a)',color:'var(--accent)',cursor:'pointer'}}>{currency.toUpperCase()}</button>
        <button onClick={loadCoins} style={{fontSize:14,background:'none',border:'none',color:'var(--text-3)',cursor:'pointer'}}>🔄</button>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',borderBottom:'1px solid var(--border)'}}>
        {(['market','portfolio','trending'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'10px',background:tab===t?'var(--accent-bg)':'transparent',border:'none',borderBottom:`2px solid ${tab===t?'var(--accent)':'transparent'}`,color:tab===t?'var(--accent)':'var(--text-3)',fontSize:11,fontWeight:600,cursor:'pointer',textTransform:'capitalize'}}>
            {t==='market'?'📊':t==='portfolio'?'💼':'🔥'} {t}
          </button>
        ))}
      </div>

      {/* MARKET */}
      {tab==='market'&&(
        <div style={{padding:'10px 14px 80px'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 BTC, ETH, DOGE..." style={{width:'100%',marginBottom:10,background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:10,padding:'9px 12px',color:'var(--text)',fontSize:13}}/>
          {loading&&<div style={{textAlign:'center',padding:30,color:'var(--text-3)'}}>Loading...</div>}
          {visible.map((c,i)=>(
            <div key={c.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
              <div style={{fontSize:11,color:'var(--text-4)',width:20,textAlign:'center',flexShrink:0}}>{i+1}</div>
              <img src={c.img} alt="" width={32} height={32} style={{borderRadius:'50%',flexShrink:0}} onError={e=>(e.currentTarget.style.display='none')}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700}}>{c.symbol}</div>
                <div style={{fontSize:10,color:'var(--text-3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name} · {c.cap}</div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontSize:13,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{currency==='inr'?fmt(c.price):fmtUSD(c.price/83.5)}</div>
                <div style={{fontSize:11,fontWeight:600,color:c.change24h>=0?'#22c55e':'#ef4444'}}>{c.change24h>=0?'▲':'▼'}{Math.abs(c.change24h).toFixed(2)}%</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PORTFOLIO */}
      {tab==='portfolio'&&(
        <div style={{padding:'10px 14px 80px'}}>
          {portfolio.length>0&&(
            <div style={{background:portfolioPnL>=0?'rgba(34,197,94,.08)':'rgba(239,68,68,.08)',border:`1px solid ${portfolioPnL>=0?'rgba(34,197,94,.2)':'rgba(239,68,68,.2)'}`,borderRadius:14,padding:'14px',marginBottom:12}}>
              <div style={{fontSize:11,color:'var(--text-3)',marginBottom:4}}>💼 Portfolio Value</div>
              <div style={{fontSize:28,fontWeight:900,color:'var(--accent)',fontFamily:"'JetBrains Mono',monospace"}}>{fmt(portfolioValue)}</div>
              <div style={{fontSize:12,marginTop:4,color:portfolioPnL>=0?'#22c55e':'#ef4444',fontWeight:600}}>
                {portfolioPnL>=0?'▲':'▼'} {fmt(Math.abs(portfolioPnL))} ({((portfolioPnL/portfolioCost)*100).toFixed(2)}%)
              </div>
            </div>
          )}
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,padding:12,marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>+ Add Holding</div>
            <div style={{display:'flex',gap:6,marginBottom:6}}>
              <input value={addCoin} onChange={e=>setAddCoin(e.target.value)} placeholder="BTC" style={{flex:1,background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:8,padding:'8px',color:'var(--text)',fontSize:12}}/>
              <input value={addAmt} onChange={e=>setAddAmt(e.target.value)} type="number" placeholder="Amount" style={{flex:1,background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:8,padding:'8px',color:'var(--text)',fontSize:12}}/>
            </div>
            <div style={{display:'flex',gap:6}}>
              <input value={addPrice} onChange={e=>setAddPrice(e.target.value)} type="number" placeholder="Buy price (₹)" style={{flex:1,background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:8,padding:'8px',color:'var(--text)',fontSize:12}}/>
              <button onClick={addToPortfolio} style={{padding:'8px 16px',background:'var(--accent)',color:'#000',border:'none',borderRadius:8,fontWeight:700,fontSize:12,cursor:'pointer'}}>Add</button>
            </div>
          </div>
          {portfolio.map((p,i)=>{
            const coin=coins.find(c=>c.id===p.id)
            const val=(coin?.price||0)*p.amount
            const pnl=val-p.buyPrice*p.amount
            return (
              <div key={i} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,padding:12,marginBottom:8,display:'flex',alignItems:'center',gap:10}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700}}>{p.symbol} · {p.amount}</div>
                  <div style={{fontSize:10,color:'var(--text-3)'}}>Buy: {fmt(p.buyPrice)}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:13,fontWeight:700}}>{fmt(val)}</div>
                  <div style={{fontSize:11,color:pnl>=0?'#22c55e':'#ef4444'}}>{pnl>=0?'+':''}{fmt(pnl)}</div>
                </div>
                <button onClick={()=>savePortfolio(portfolio.filter((_,j)=>j!==i))} style={{background:'none',border:'none',color:'var(--text-4)',cursor:'pointer'}}>✕</button>
              </div>
            )
          })}
          {portfolio.length===0&&<div style={{textAlign:'center',padding:'40px 0',color:'var(--text-3)'}}><div style={{fontSize:40,marginBottom:10}}>₿</div><div>Koi holding nahi. Upar se add karo.</div></div>}
        </div>
      )}

      {/* TRENDING */}
      {tab==='trending'&&(
        <div style={{padding:'10px 14px 80px'}}>
          <div style={{fontSize:11,color:'var(--text-3)',marginBottom:10}}>🔥 24h mein sabse zyada move</div>
          {trending.map((c,i)=>(
            <div key={c.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:i%2===0?'var(--bg-card)':'transparent',borderRadius:10,marginBottom:4}}>
              <img src={c.img} alt="" width={28} height={28} style={{borderRadius:'50%'}} onError={e=>(e.currentTarget.style.display='none')}/>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{c.symbol}</div><div style={{fontSize:10,color:'var(--text-3)'}}>{c.name}</div></div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:12,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(c.price)}</div>
                <div style={{fontSize:13,fontWeight:700,color:c.change24h>=0?'#22c55e':'#ef4444'}}>{c.change24h>=0?'▲':'▼'}{Math.abs(c.change24h).toFixed(2)}%</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
