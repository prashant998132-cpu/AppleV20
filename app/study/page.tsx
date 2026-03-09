'use client'
// app/study/page.tsx — JARVIS Study Hub v20
// NEET MCQ Quiz · Formula Sheet · Spaced Repetition · KaTeX Math

import { useState, useEffect } from 'react'
import BottomNav from '../../components/shared/BottomNav'
import { useRouter } from 'next/navigation'

type Tab = 'quiz'|'formulas'|'progress'
type Subject = 'physics'|'chemistry'|'biology'

const SUBJECTS: {id:Subject;icon:string;label:string;color:string}[] = [
  {id:'physics',  icon:'⚡', label:'Physics',   color:'#00e5ff'},
  {id:'chemistry',icon:'🧪', label:'Chemistry',  color:'#80ff80'},
  {id:'biology',  icon:'🧬', label:'Biology',    color:'#ff80c0'},
]

// Built-in MCQ questions (no API needed, always works)
type MCQ = { q:string; opts:string[]; ans:number; exp:string; formula?:string }

const QUESTIONS: Record<Subject, MCQ[]> = {
  physics: [
    { q:"A body falls freely from height h. Time to reach ground is:", opts:["√(2h/g)","√(h/g)","√(h/2g)","2√(h/g)"], ans:0, exp:"Using h = ½gt², so t = √(2h/g)", formula:"$t = \\sqrt{\\frac{2h}{g}}$" },
    { q:"SI unit of electric charge:", opts:["Ampere","Coulomb","Volt","Watt"], ans:1, exp:"Coulomb (C) is the SI unit of charge. 1C = 6.24×10¹⁸ electrons", formula:"$Q = It$" },
    { q:"Dimensional formula of velocity:", opts:["[MLT⁻¹]","[LT⁻¹]","[ML⁻¹T]","[L²T⁻¹]"], ans:1, exp:"Velocity = displacement/time = L/T = [LT⁻¹]", formula:"$v = \\frac{d}{t}$" },
    { q:"Newton's second law: Force is proportional to:", opts:["Velocity","Displacement","Rate of change of momentum","Mass only"], ans:2, exp:"F = dp/dt = d(mv)/dt = ma for constant mass", formula:"$F = \\frac{dp}{dt} = ma$" },
    { q:"Escape velocity from Earth's surface:", opts:["7.9 km/s","11.2 km/s","16 km/s","3 km/s"], ans:1, exp:"ve = √(2GM/R) ≈ 11.2 km/s for Earth", formula:"$v_e = \\sqrt{\\frac{2GM}{R}}$" },
    { q:"Work done by force F in displacement d:", opts:["F/d","F×d×cosθ","F×d×sinθ","F²×d"], ans:1, exp:"W = F·d·cosθ where θ is angle between force and displacement", formula:"$W = Fd\\cos\\theta$" },
    { q:"Ohm's law states V = IR. Unit of resistance:", opts:["Ampere","Volt","Ohm (Ω)","Watt"], ans:2, exp:"Resistance is measured in Ohms (Ω). 1Ω = 1V/1A", formula:"$R = \\frac{V}{I}$" },
    { q:"Wavelength of visible light range:", opts:["100-400 nm","400-700 nm","700-1000 nm","1-100 nm"], ans:1, exp:"Visible light: 400nm (violet) to 700nm (red)", formula:"$c = \\nu\\lambda$" },
  ],
  chemistry: [
    { q:"Atomic number of Carbon:", opts:["5","6","7","8"], ans:1, exp:"Carbon (C) has atomic number 6, means 6 protons", formula:"" },
    { q:"pH of pure water at 25°C:", opts:["0","7","14","6"], ans:1, exp:"Pure water pH = 7 (neutral). [H⁺] = [OH⁻] = 10⁻⁷ mol/L", formula:"$pH = -\\log[H^+]$" },
    { q:"Avogadro's number:", opts:["6.022×10²³","6.022×10²²","6.022×10²⁴","3.011×10²³"], ans:0, exp:"NA = 6.022×10²³ mol⁻¹. One mole of any substance contains this many particles", formula:"$N_A = 6.022 \\times 10^{23}$" },
    { q:"Electronic configuration of Na (Z=11):", opts:["2,8,1","2,9","3,8","2,7,2"], ans:0, exp:"Na: 1s²2s²2p⁶3s¹ = 2,8,1. Has 1 valence electron", formula:"" },
    { q:"In photosynthesis, CO₂ is:", opts:["Oxidised","Reduced","Unchanged","Acts as catalyst"], ans:1, exp:"CO₂ is reduced to glucose (C₆H₁₂O₆) during photosynthesis", formula:"$6CO_2 + 6H_2O \\rightarrow C_6H_{12}O_6 + 6O_2$" },
    { q:"Bond angle in water (H₂O):", opts:["180°","120°","109.5°","104.5°"], ans:3, exp:"H₂O has 2 lone pairs, causing distortion. Bond angle = 104.5°", formula:"" },
    { q:"Molar mass of H₂SO₄:", opts:["49 g/mol","98 g/mol","128 g/mol","80 g/mol"], ans:1, exp:"H₂SO₄: 2(1)+32+4(16) = 2+32+64 = 98 g/mol", formula:"$M = 2(1) + 32 + 4(16) = 98$" },
    { q:"Hybridisation of carbon in methane (CH₄):", opts:["sp","sp²","sp³","dsp²"], ans:2, exp:"In CH₄, C forms 4 sigma bonds → sp³ hybridisation, tetrahedral shape", formula:"" },
  ],
  biology: [
    { q:"DNA double helix was proposed by:", opts:["Mendel & Darwin","Watson & Crick","Lamarck & Weismann","Huxley & Morgan"], ans:1, exp:"Watson and Crick (1953) proposed the double helix model. Nobel Prize 1962", formula:"" },
    { q:"Powerhouse of the cell:", opts:["Nucleus","Ribosome","Mitochondria","Golgi body"], ans:2, exp:"Mitochondria produce ATP via cellular respiration — hence 'powerhouse'", formula:"$C_6H_{12}O_6 + 6O_2 \\rightarrow 6CO_2 + 6H_2O + ATP$" },
    { q:"Number of chromosomes in human somatic cells:", opts:["23","46","48","44"], ans:1, exp:"Humans have 46 chromosomes (23 pairs) in somatic cells. Gametes have 23.", formula:"" },
    { q:"Photosynthesis takes place in:", opts:["Mitochondria","Ribosome","Chloroplast","Nucleus"], ans:2, exp:"Chloroplasts contain chlorophyll — site of photosynthesis in plant cells", formula:"" },
    { q:"Full form of DNA:", opts:["Deoxyribose Nucleic Acid","Deoxyribonucleic Acid","Dinitrogen Acid","Diribose Nucleic Acid"], ans:1, exp:"DNA = Deoxyribonucleic Acid. Contains deoxyribose sugar, phosphate, bases (ATGC)", formula:"" },
    { q:"Blood group system discovered by:", opts:["Louis Pasteur","Karl Landsteiner","Alexander Fleming","Robert Koch"], ans:1, exp:"Karl Landsteiner discovered ABO blood group system in 1901. Nobel Prize 1930", formula:"" },
    { q:"Vaccine for tuberculosis:", opts:["MMR","DPT","BCG","OPV"], ans:2, exp:"BCG (Bacillus Calmette-Guérin) vaccine prevents tuberculosis. Given at birth in India", formula:"" },
    { q:"First organ of human body to develop:", opts:["Brain","Heart","Liver","Kidney"], ans:1, exp:"Heart is the first organ to develop, starts beating ~22 days after fertilization", formula:"" },
  ],
}

const FORMULA_SHEETS: Record<Subject, {topic:string;formulas:{name:string;f:string;note:string}[]}[]> = {
  physics: [
    { topic:'Kinematics', formulas:[
      {name:'1st eq of motion',f:'$v = u + at$',note:'v=final, u=initial, a=accel, t=time'},
      {name:'2nd eq of motion',f:'$s = ut + \\frac{1}{2}at^2$',note:'s=displacement'},
      {name:'3rd eq of motion',f:'$v^2 = u^2 + 2as$',note:'time-independent'},
      {name:'Free fall',f:'$h = \\frac{1}{2}gt^2$',note:'g=9.8 m/s²'},
    ]},
    { topic:'Laws of Motion', formulas:[
      {name:"Newton's 2nd Law",f:'$F = ma$',note:'F in Newtons'},
      {name:'Momentum',f:'$p = mv$',note:'p=momentum'},
      {name:'Impulse',f:'$J = F \\cdot \\Delta t = \\Delta p$',note:''},
    ]},
    { topic:'Work, Energy, Power', formulas:[
      {name:'Work',f:'$W = Fd\\cos\\theta$',note:'θ=angle'},
      {name:'KE',f:'$KE = \\frac{1}{2}mv^2$',note:''},
      {name:'PE (gravity)',f:'$PE = mgh$',note:''},
      {name:'Power',f:'$P = \\frac{W}{t} = Fv$',note:''},
    ]},
    { topic:'Electricity', formulas:[
      {name:"Ohm's Law",f:'$V = IR$',note:''},
      {name:'Power',f:'$P = VI = I^2R = \\frac{V^2}{R}$',note:''},
      {name:'Series R',f:'$R_s = R_1+R_2+R_3$',note:''},
      {name:'Parallel R',f:'$\\frac{1}{R_p} = \\frac{1}{R_1}+\\frac{1}{R_2}$',note:''},
    ]},
    { topic:'Waves & Optics', formulas:[
      {name:'Wave speed',f:'$v = f\\lambda$',note:'f=frequency'},
      {name:'Snell\'s Law',f:'$n_1\\sin\\theta_1 = n_2\\sin\\theta_2$',note:''},
      {name:'Mirror formula',f:'$\\frac{1}{v}+\\frac{1}{u}=\\frac{1}{f}$',note:''},
      {name:'Lens formula',f:'$\\frac{1}{v}-\\frac{1}{u}=\\frac{1}{f}$',note:''},
    ]},
  ],
  chemistry: [
    { topic:'Mole Concept', formulas:[
      {name:'Moles',f:'$n = \\frac{m}{M}$',note:'m=mass, M=molar mass'},
      {name:'Avogadro',f:'$N = n \\times N_A$',note:'NA=6.022×10²³'},
      {name:'Molarity',f:'$M = \\frac{n}{V(L)}$',note:'V in litres'},
      {name:'% Composition',f:'$\\%E = \\frac{mass_E}{M_r} \\times 100$',note:''},
    ]},
    { topic:'Thermodynamics', formulas:[
      {name:'1st Law',f:'$\\Delta U = q + w$',note:'q=heat, w=work'},
      {name:'Enthalpy',f:'$\\Delta H = \\Delta U + \\Delta(pV)$',note:''},
      {name:'Gibbs Energy',f:'$\\Delta G = \\Delta H - T\\Delta S$',note:''},
      {name:'Spontaneous',f:'$\\Delta G < 0$',note:'reaction is spontaneous'},
    ]},
    { topic:'Equilibrium', formulas:[
      {name:'Keq',f:'$K_{eq} = \\frac{[C]^c[D]^d}{[A]^a[B]^b}$',note:'for aA+bB⇌cC+dD'},
      {name:'pH',f:'$pH = -\\log[H^+]$',note:''},
      {name:'pOH',f:'$pOH = -\\log[OH^-]$',note:''},
      {name:'pH+pOH',f:'$pH + pOH = 14$',note:'at 25°C'},
    ]},
  ],
  biology: [
    { topic:'Cell Biology', formulas:[
      {name:'Cell Theory',f:'All living things made of cells',note:'Schleiden, Schwann, Virchow'},
      {name:'Mitosis stages',f:'PMAT: Prophase→Metaphase→Anaphase→Telophase',note:''},
      {name:'Meiosis',f:'2n → n (haploid)',note:'For gamete formation'},
      {name:'Cell cycle',f:'G₁ → S (DNA synthesis) → G₂ → M',note:'Interphase + Mitosis'},
    ]},
    { topic:'Genetics', formulas:[
      {name:"Mendel's ratio",f:'Monohybrid: 3:1',note:'Dominant:Recessive'},
      {name:'Dihybrid',f:'9:3:3:1',note:'Two traits'},
      {name:'Hardy-Weinberg',f:'$p^2 + 2pq + q^2 = 1$',note:'p+q=1'},
      {name:'DNA bases',f:'A=T, G≡C',note:'Chargaff\'s rule'},
    ]},
    { topic:'Photosynthesis', formulas:[
      {name:'Overall reaction',f:'$6CO_2 + 6H_2O \\xrightarrow{light} C_6H_{12}O_6 + 6O_2$',note:''},
      {name:'Light reaction',f:'$H_2O \\rightarrow O_2 + H^+ + e^-$',note:'in thylakoid'},
      {name:'Dark reaction',f:'Calvin Cycle: CO₂ + RuBP → 3-PGA',note:'in stroma'},
      {name:'Compensation point',f:'Photosynthesis = Respiration',note:'net gas exchange = 0'},
    ]},
  ],
}

function renderFormula(text: string) {
  if (!text || typeof window === 'undefined') return text
  try {
    const katex = (window as any).katex
    if (!katex) return text
    return text.replace(/\$\$(.+?)\$\$/g, (_: string, f: string) => {
      try { return katex.renderToString(f, { displayMode: true, throwOnError: false }) }
      catch { return f }
    }).replace(/\$(.+?)\$/g, (_: string, f: string) => {
      try { return katex.renderToString(f, { displayMode: false, throwOnError: false }) }
      catch { return f }
    })
  } catch { return text }
}

function Formula({ text }: { text: string }) {
  const [html, setHtml] = useState(text)
  useEffect(() => {
    const timer = setTimeout(() => setHtml(renderFormula(text)), 100)
    return () => clearTimeout(timer)
  }, [text])
  return <span dangerouslySetInnerHTML={{ __html: html }}/>
}

const SCORE_KEY = 'jarvis_quiz_scores'
function loadScores(): Record<string, {right:number;total:number}> {
  try { return JSON.parse(localStorage.getItem(SCORE_KEY)||'{}') } catch { return {} }
}
function saveScore(subject: string, right: boolean) {
  const s = loadScores()
  if (!s[subject]) s[subject] = {right:0,total:0}
  s[subject].total++
  if (right) s[subject].right++
  try { localStorage.setItem(SCORE_KEY, JSON.stringify(s)) } catch {}
}

export default function StudyHub() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('quiz')
  const [subject, setSubject] = useState<Subject>('physics')
  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState<number|null>(null)
  const [showExp, setShowExp] = useState(false)
  const [scores, setScores] = useState(loadScores())
  const [streak, setStreak] = useState(0)

  const qs = QUESTIONS[subject]
  const q = qs[qIdx % qs.length]
  const sub = SUBJECTS.find(s => s.id === subject)!

  function selectOpt(i: number) {
    if (selected !== null) return
    setSelected(i)
    setShowExp(true)
    const right = i === q.ans
    saveScore(subject, right)
    setScores(loadScores())
    if (right) setStreak(p => p + 1)
    else setStreak(0)
  }

  function nextQ() {
    setSelected(null)
    setShowExp(false)
    setQIdx(p => (p + 1) % qs.length)
  }

  const sc = scores[subject]
  const pct = sc ? Math.round((sc.right/sc.total)*100) : 0

  return (
    <div style={{background:'#090d18',minHeight:'100dvh',display:'flex',flexDirection:'column',fontFamily:'Space Mono, monospace'}}>
      {/* Header */}
      <div style={{padding:'14px 16px 10px',borderBottom:'1px solid rgba(0,229,255,.08)',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>router.push('/')} style={{background:'none',border:'none',color:'#1e3858',cursor:'pointer',fontSize:18}}>←</button>
        <div style={{flex:1}}>
          <div style={{fontSize:16,color:'#00e5ff',letterSpacing:1}}>📚 STUDY HUB</div>
          <div style={{fontSize:9,color:'#1e3858'}}>NEET/JEE Prep · MCQ · Formulas</div>
        </div>
        {streak > 0 && <div style={{fontSize:11,color:'#ffa500'}}>🔥 {streak} streak</div>}
      </div>

      {/* Subject selector */}
      <div style={{display:'flex',gap:8,padding:'12px 16px 8px'}}>
        {SUBJECTS.map(s => (
          <button key={s.id} onClick={()=>{setSubject(s.id);setQIdx(0);setSelected(null);setShowExp(false)}}
            style={{flex:1,padding:'8px 4px',borderRadius:10,border:`1px solid ${subject===s.id?s.color:'rgba(255,255,255,.06)'}`,background:subject===s.id?`rgba(${s.id==='physics'?'0,229,255':s.id==='chemistry'?'128,255,128':'255,128,192'},.08)`:'transparent',color:subject===s.id?s.color:'#1e3858',cursor:'pointer',fontSize:10}}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{display:'flex',gap:2,padding:'0 16px 12px'}}>
        {(['quiz','formulas','progress'] as Tab[]).map(t => (
          <button key={t} onClick={()=>setTab(t)}
            style={{flex:1,padding:'7px',borderRadius:8,border:`1px solid ${tab===t?'rgba(0,229,255,.25)':'rgba(255,255,255,.05)'}`,background:tab===t?'rgba(0,229,255,.08)':'transparent',color:tab===t?'#00e5ff':'#1e3858',cursor:'pointer',fontSize:10,textTransform:'capitalize'}}>
            {t==='quiz'?'🎯 Quiz':t==='formulas'?'📐 Formulas':'📊 Progress'}
          </button>
        ))}
      </div>

      {/* QUIZ TAB */}
      {tab === 'quiz' && (
        <div style={{padding:'0 16px',paddingBottom:90,flex:1}}>
          {/* Score bar */}
          {sc && (
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:12,padding:'8px 12px',background:'rgba(0,229,255,.03)',borderRadius:10,border:'1px solid rgba(0,229,255,.08)'}}>
              <span style={{fontSize:11,color:'#1e3858'}}>{subject}: {sc.right}/{sc.total} correct</span>
              <span style={{fontSize:11,color:pct>=60?'#80ff80':'#ff8080'}}>{pct}%</span>
            </div>
          )}

          {/* Question card */}
          <div style={{background:'rgba(255,255,255,.02)',border:'1px solid rgba(0,229,255,.1)',borderRadius:14,padding:'16px',marginBottom:12}}>
            <div style={{fontSize:9,color:'#1e3858',marginBottom:8}}>Q{(qIdx%qs.length)+1}/{qs.length} · {sub.label}</div>
            <div style={{fontSize:13,color:'#ddeeff',lineHeight:1.6,marginBottom:q.formula?8:0}}>{q.q}</div>
            {q.formula && (
              <div style={{padding:'6px 10px',background:'rgba(0,229,255,.04)',borderRadius:8,marginTop:6}}>
                <Formula text={q.formula}/>
              </div>
            )}
          </div>

          {/* Options */}
          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:12}}>
            {q.opts.map((opt,i) => {
              let bg = 'rgba(255,255,255,.02)', border = 'rgba(255,255,255,.06)', color = '#ddeeff'
              if (selected !== null) {
                if (i === q.ans) { bg='rgba(0,255,128,.06)'; border='rgba(0,255,128,.25)'; color='#80ffb0' }
                else if (i === selected && selected !== q.ans) { bg='rgba(255,80,80,.06)'; border='rgba(255,80,80,.2)'; color='#ff9090' }
              }
              return (
                <button key={i} onClick={()=>selectOpt(i)}
                  style={{padding:'12px 14px',borderRadius:11,border:`1px solid ${border}`,background:bg,color,textAlign:'left',cursor:selected===null?'pointer':'default',fontSize:12,lineHeight:1.5}}>
                  <span style={{color:'#1e4060',marginRight:8}}>{String.fromCharCode(65+i)}.</span>{opt}
                </button>
              )
            })}
          </div>

          {/* Explanation */}
          {showExp && (
            <div style={{padding:'12px',background:selected===q.ans?'rgba(0,255,128,.04)':'rgba(255,80,80,.04)',border:`1px solid ${selected===q.ans?'rgba(0,255,128,.15)':'rgba(255,80,80,.15)'}`,borderRadius:12,marginBottom:12}}>
              <div style={{fontSize:12,color:selected===q.ans?'#80ffb0':'#ff9090',marginBottom:4,fontWeight:'bold'}}>
                {selected===q.ans?'✅ Bilkul sahi!':'❌ Galat — sahi answer: '+String.fromCharCode(65+q.ans)}
              </div>
              <div style={{fontSize:11,color:'#2a8090',lineHeight:1.6}}>{q.exp}</div>
            </div>
          )}

          {/* Next button */}
          {selected !== null && (
            <button onClick={nextQ}
              style={{width:'100%',padding:'12px',borderRadius:11,background:'rgba(0,229,255,.1)',border:'1px solid rgba(0,229,255,.25)',color:'#00e5ff',cursor:'pointer',fontSize:13}}>
              Next Question →
            </button>
          )}
        </div>
      )}

      {/* FORMULAS TAB */}
      {tab === 'formulas' && (
        <div style={{padding:'0 16px',paddingBottom:90,overflow:'auto',flex:1}}>
          {FORMULA_SHEETS[subject].map((section,si) => (
            <div key={si} style={{marginBottom:16}}>
              <div style={{fontSize:11,color:sub.color,fontWeight:'bold',marginBottom:8,padding:'6px 10px',background:`rgba(${sub.id==='physics'?'0,229,255':sub.id==='chemistry'?'128,255,128':'255,128,192'},.06)`,borderRadius:8}}>
                {section.topic}
              </div>
              {section.formulas.map((f,fi) => (
                <div key={fi} style={{padding:'10px 12px',marginBottom:6,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.05)',borderRadius:10}}>
                  <div style={{fontSize:10,color:'#1e3858',marginBottom:4}}>{f.name}</div>
                  <div style={{fontSize:14,color:'#ddeeff',marginBottom: f.note?4:0}}>
                    <Formula text={f.f}/>
                  </div>
                  {f.note && <div style={{fontSize:9,color:'#1e4060'}}>{f.note}</div>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* PROGRESS TAB */}
      {tab === 'progress' && (
        <div style={{padding:'0 16px',paddingBottom:90}}>
          <div style={{marginBottom:12,fontSize:12,color:'#2a6080'}}>Tumhara performance 📊</div>
          {SUBJECTS.map(s => {
            const sc2 = scores[s.id]
            const p = sc2 ? Math.round((sc2.right/sc2.total)*100) : 0
            return (
              <div key={s.id} style={{marginBottom:12,padding:'14px',background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)',borderRadius:12}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <span style={{fontSize:12,color:'#ddeeff'}}>{s.icon} {s.label}</span>
                  <span style={{fontSize:11,color:p>=60?'#80ff80':'#ff8080'}}>{sc2?`${sc2.right}/${sc2.total}`:'0/0'} ({p}%)</span>
                </div>
                <div style={{height:6,background:'rgba(255,255,255,.05)',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${p}%`,background:p>=60?'#80ff80':p>=40?'#ffa500':'#ff6060',borderRadius:3,transition:'width .5s'}}/>
                </div>
                <div style={{marginTop:6,fontSize:9,color:'#1e3858'}}>
                  {p>=80?'🌟 Excellent!':p>=60?'👍 Accha hai, aur practice karo':p>=40?'📖 Thoda aur padhna padega':'🔴 Start karo abhi se'}
                </div>
              </div>
            )
          })}

          <button onClick={()=>{localStorage.removeItem(SCORE_KEY);setScores({})}}
            style={{width:'100%',padding:'10px',borderRadius:10,background:'rgba(255,80,80,.06)',border:'1px solid rgba(255,80,80,.2)',color:'#ff9090',cursor:'pointer',fontSize:11,marginTop:8}}>
            Reset Progress
          </button>

          <div style={{marginTop:16,padding:'12px',background:'rgba(255,255,255,.02)',borderRadius:12,border:'1px solid rgba(255,255,255,.05)'}}>
            <div style={{fontSize:11,color:'#2a5070',marginBottom:8}}>🔗 NEET Resources</div>
            {[
              ['NTA NEET Official','https://nta.ac.in/neet'],
              ['Physics Wallah','https://www.pw.live/'],
              ['Unacademy NEET','https://unacademy.com/goal/neet-ug'],
              ['PYQ Papers','https://allen.ac.in/question-paper/neet-papers.aspx'],
              ['NCERT PDFs','https://ncert.nic.in/textbook.php'],
            ].map(([l,u])=>(
              <a key={l} href={u} target="_blank" rel="noopener"
                style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,.03)',color:'#2a7090',textDecoration:'none',fontSize:11}}>
                <span>{l}</span><span>→</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <BottomNav/>
    </div>
  )
}
