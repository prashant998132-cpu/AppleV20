'use client'
// app/budget/page.tsx — JARVIS Budget & Expense Tracker
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initTheme } from '../../lib/theme'

interface Expense { id:string; amount:number; category:string; note:string; date:string; type:'expense'|'income' }

const CATS = [
  {id:'food',icon:'🍔',label:'Food',color:'#f97316'},
  {id:'transport',icon:'🚗',label:'Transport',color:'#3b82f6'},
  {id:'shopping',icon:'🛍️',label:'Shopping',color:'#a855f7'},
  {id:'health',icon:'💊',label:'Health',color:'#22c55e'},
  {id:'entertainment',icon:'🎬',label:'Entertainment',color:'#f43f5e'},
  {id:'education',icon:'📚',label:'Education',color:'#f59e0b'},
  {id:'bills',icon:'💡',label:'Bills',color:'#94a3b8'},
  {id:'other',icon:'📦',label:'Other',color:'#6b7280'},
]

const thisMonth = () => new Date().toISOString().slice(0,7)

export default function BudgetPage() {
  const router = useRouter()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [tab, setTab] = useState<'add'|'list'|'stats'>('add')
  const [amount, setAmount] = useState('')
  const [cat, setCat] = useState('food')
  const [note, setNote] = useState('')
  const [type, setType] = useState<'expense'|'income'>('expense')
  const [budget, setBudget] = useState(5000)
  const [showBudgetEdit, setShowBudgetEdit] = useState(false)
  const [month, setMonth] = useState(thisMonth())

  useEffect(() => {
    initTheme()
    try {
      setExpenses(JSON.parse(localStorage.getItem('jarvis_budget')||'[]'))
      setBudget(Number(localStorage.getItem('jarvis_budget_limit')||'5000'))
    } catch {}
  }, [])

  const save = (e: Expense[]) => { setExpenses(e); localStorage.setItem('jarvis_budget', JSON.stringify(e)) }

  const add = () => {
    if (!amount || isNaN(Number(amount))) return
    const e: Expense = { id:Date.now().toString(), amount:Math.abs(Number(amount)), category:cat, note:note.trim()||CATS.find(c=>c.id===cat)?.label||cat, date:new Date().toISOString().split('T')[0], type }
    save([e,...expenses]); setAmount(''); setNote('')
  }

  const del = (id:string) => save(expenses.filter(e=>e.id!==id))

  const monthly = expenses.filter(e => e.date.startsWith(month))
  const totalExpense = monthly.filter(e=>e.type==='expense').reduce((s,e)=>s+e.amount,0)
  const totalIncome = monthly.filter(e=>e.type==='income').reduce((s,e)=>s+e.amount,0)
  const net = totalIncome - totalExpense
  const budgetUsed = totalExpense / budget * 100

  const catTotals = CATS.map(c => ({
    ...c,
    total: monthly.filter(e=>e.category===c.id&&e.type==='expense').reduce((s,e)=>s+e.amount,0)
  })).filter(c=>c.total>0).sort((a,b)=>b.total-a.total)

  const fmt = (n:number) => `₹${n.toLocaleString('en-IN')}`

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg)',color:'var(--text)',fontFamily:"'Inter',sans-serif"}}>
      <div className="bg-grid"/>
      <div style={{position:'sticky',top:0,zIndex:50,background:'var(--header)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--border)',padding:'10px 16px',display:'flex',alignItems:'center',gap:8}}>
        <button onClick={()=>router.push('/')} style={{background:'var(--accent-bg)',border:'1px solid var(--border-a)',borderRadius:8,color:'var(--accent)',fontSize:14,fontWeight:800,width:28,height:28,fontFamily:'monospace'}}>J</button>
        <div style={{flex:1}}><div style={{fontSize:15,fontWeight:700}}>💰 Budget Tracker</div><div style={{fontSize:10,color:'var(--text-3)'}}>{month}</div></div>
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{fontSize:10,background:'transparent',border:'none',color:'var(--text-3)',cursor:'pointer',outline:'none'}}/>
      </div>

      {/* Summary bar */}
      <div style={{padding:'10px 14px',background:'var(--bg-card)',borderBottom:'1px solid var(--border)'}}>
        <div style={{display:'flex',gap:8,marginBottom:8}}>
          <div style={{flex:1,textAlign:'center'}}>
            <div style={{fontSize:9,color:'var(--text-3)'}}>INCOME</div>
            <div style={{fontSize:16,fontWeight:800,color:'#22c55e',fontFamily:"'JetBrains Mono',monospace"}}>{fmt(totalIncome)}</div>
          </div>
          <div style={{flex:1,textAlign:'center'}}>
            <div style={{fontSize:9,color:'var(--text-3)'}}>SPENT</div>
            <div style={{fontSize:16,fontWeight:800,color:'#ef4444',fontFamily:"'JetBrains Mono',monospace"}}>{fmt(totalExpense)}</div>
          </div>
          <div style={{flex:1,textAlign:'center'}}>
            <div style={{fontSize:9,color:'var(--text-3)'}}>NET</div>
            <div style={{fontSize:16,fontWeight:800,color:net>=0?'#22c55e':'#ef4444',fontFamily:"'JetBrains Mono',monospace"}}>{fmt(Math.abs(net))}</div>
          </div>
        </div>
        {/* Budget progress */}
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
          <span style={{fontSize:10,color:'var(--text-3)'}}>Budget: {fmt(budget)}</span>
          <span style={{fontSize:10,color:budgetUsed>100?'#ef4444':budgetUsed>75?'#f59e0b':'#22c55e',fontWeight:600}}>{budgetUsed.toFixed(0)}% used</span>
        </div>
        <div style={{height:6,background:'var(--border)',borderRadius:3,overflow:'hidden'}}>
          <div style={{height:'100%',background:budgetUsed>100?'#ef4444':budgetUsed>75?'#f59e0b':'#22c55e',width:`${Math.min(budgetUsed,100)}%`,borderRadius:3,transition:'width .3s'}}/>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',borderBottom:'1px solid var(--border)'}}>
        {(['add','list','stats'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'9px',background:tab===t?'var(--accent-bg)':'transparent',border:'none',borderBottom:`2px solid ${tab===t?'var(--accent)':'transparent'}`,color:tab===t?'var(--accent)':'var(--text-3)',fontSize:11,fontWeight:600,cursor:'pointer',textTransform:'capitalize'}}>
            {t==='add'?'➕':t==='list'?'📋':'📊'} {t}
          </button>
        ))}
      </div>

      {/* ADD */}
      {tab==='add'&&(
        <div style={{padding:'14px 14px 80px'}}>
          {/* Type toggle */}
          <div style={{display:'flex',gap:6,marginBottom:12}}>
            <button onClick={()=>setType('expense')} style={{flex:1,padding:'10px',borderRadius:10,background:type==='expense'?'rgba(239,68,68,.15)':'transparent',border:`1px solid ${type==='expense'?'rgba(239,68,68,.3)':'var(--border)'}`,color:type==='expense'?'#ef4444':'var(--text-3)',fontWeight:600,fontSize:13,cursor:'pointer'}}>💸 Expense</button>
            <button onClick={()=>setType('income')} style={{flex:1,padding:'10px',borderRadius:10,background:type==='income'?'rgba(34,197,94,.15)':'transparent',border:`1px solid ${type==='income'?'rgba(34,197,94,.3)':'var(--border)'}`,color:type==='income'?'#22c55e':'var(--text-3)',fontWeight:600,fontSize:13,cursor:'pointer'}}>💰 Income</button>
          </div>

          {/* Amount */}
          <div style={{position:'relative',marginBottom:10}}>
            <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:20,color:'var(--text-3)'}}>₹</span>
            <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" style={{width:'100%',background:'var(--bg-input)',border:`1px solid ${type==='expense'?'rgba(239,68,68,.3)':'rgba(34,197,94,.3)'}`,borderRadius:12,padding:'14px 12px 14px 36px',color:'var(--text)',fontSize:24,fontFamily:"'JetBrains Mono',monospace",outline:'none'}}/>
          </div>

          {/* Categories */}
          {type==='expense'&&(
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:10}}>
              {CATS.map(c=>(
                <button key={c.id} onClick={()=>setCat(c.id)} style={{padding:'10px 4px',borderRadius:10,background:cat===c.id?`${c.color}22`:'rgba(255,255,255,.03)',border:`1px solid ${cat===c.id?c.color:'var(--border)'}`,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                  <span style={{fontSize:20}}>{c.icon}</span>
                  <span style={{fontSize:9,color:cat===c.id?c.color:'var(--text-3)',fontWeight:cat===c.id?700:400}}>{c.label}</span>
                </button>
              ))}
            </div>
          )}

          <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Note (optional)..." style={{width:'100%',background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 12px',color:'var(--text)',fontSize:13,marginBottom:12}}/>
          <button onClick={add} disabled={!amount} style={{width:'100%',padding:'13px',background:amount?'var(--accent)':'rgba(255,255,255,.04)',color:amount?'#000':'var(--text-3)',border:'none',borderRadius:12,fontWeight:700,fontSize:14,cursor:amount?'pointer':'not-allowed'}}>
            + Add {type==='expense'?'Expense':'Income'}
          </button>

          {/* Budget setting */}
          <div style={{marginTop:12,padding:'10px 12px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:11,color:'var(--text-3)',flex:1}}>Monthly Budget: {fmt(budget)}</span>
            <button onClick={()=>setShowBudgetEdit(p=>!p)} style={{fontSize:11,color:'var(--accent)',background:'none',border:'none',cursor:'pointer'}}>Edit</button>
          </div>
          {showBudgetEdit&&(
            <div style={{display:'flex',gap:6,marginTop:6}}>
              <input type="number" defaultValue={budget} onChange={e=>setBudget(Number(e.target.value))} style={{flex:1,background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:8,padding:'8px',color:'var(--text)',fontSize:13}}/>
              <button onClick={()=>{localStorage.setItem('jarvis_budget_limit',String(budget));setShowBudgetEdit(false)}} style={{padding:'8px 14px',background:'var(--accent)',color:'#000',border:'none',borderRadius:8,fontWeight:700,cursor:'pointer'}}>Save</button>
            </div>
          )}
        </div>
      )}

      {/* LIST */}
      {tab==='list'&&(
        <div style={{padding:'10px 14px 80px'}}>
          {monthly.length===0&&<div style={{textAlign:'center',padding:'40px 0',color:'var(--text-3)'}}>Koi entry nahi is mahine.</div>}
          {monthly.map(e=>{
            const c=CATS.find(x=>x.id===e.category)||CATS[7]
            return (
              <div key={e.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,marginBottom:7}}>
                <div style={{width:36,height:36,borderRadius:10,background:`${c.color}22`,border:`1px solid ${c.color}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{c.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.note}</div>
                  <div style={{fontSize:10,color:'var(--text-3)'}}>{e.date} · {c.label}</div>
                </div>
                <div style={{fontSize:15,fontWeight:800,color:e.type==='income'?'#22c55e':'#ef4444',fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>
                  {e.type==='income'?'+':'-'}{fmt(e.amount)}
                </div>
                <button onClick={()=>del(e.id)} style={{background:'none',border:'none',color:'var(--text-4)',cursor:'pointer',fontSize:14}}>✕</button>
              </div>
            )
          })}
        </div>
      )}

      {/* STATS */}
      {tab==='stats'&&(
        <div style={{padding:'14px 14px 80px'}}>
          {catTotals.length===0?<div style={{textAlign:'center',padding:'40px 0',color:'var(--text-3)'}}>Koi data nahi.</div>:(
            <>
              {catTotals.map(c=>(
                <div key={c.id} style={{marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:12,color:'var(--text)'}}>{c.icon} {c.label}</span>
                    <span style={{fontSize:12,fontWeight:700,color:c.color,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(c.total)}</span>
                  </div>
                  <div style={{height:8,background:'var(--border)',borderRadius:4,overflow:'hidden'}}>
                    <div style={{height:'100%',background:c.color,width:`${totalExpense?c.total/totalExpense*100:0}%`,borderRadius:4,transition:'width .5s'}}/>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
