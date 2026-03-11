'use client'
// app/learn/page.tsx — JARVIS AI Course Creator v25
// Jo bhi topic do — structured course ban jaata hai
// Jaise koi bhi assistant nahi karta: adaptive, progress-tracked, Hinglish

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ── Types ──────────────────────────────────────────────────
interface Lesson {
  id: string
  title: string
  content: string
  quiz?: { q: string; opts: string[]; ans: number }[]
  done: boolean
  notes: string
}

interface Course {
  id: string
  topic: string
  level: 'beginner' | 'intermediate' | 'advanced'
  language: 'hindi' | 'english' | 'hinglish'
  lessons: Lesson[]
  createdAt: number
  currentLesson: number
  icon: string
}

const COURSE_KEY = 'jarvis_courses_v1'
const loadCourses = (): Course[] => { try { return JSON.parse(localStorage.getItem(COURSE_KEY) || '[]') } catch { return [] } }
const saveCourses = (c: Course[]) => { try { localStorage.setItem(COURSE_KEY, JSON.stringify(c)) } catch {} }

const TOPIC_ICONS: [RegExp, string][] = [
  [/python|javascript|react|coding|programming|typescript/, '💻'],
  [/math|algebra|calculus|geometry/, '📐'],
  [/physics/, '⚡'], [/chemistry/, '🧪'], [/biology/, '🧬'],
  [/history/, '📜'], [/geography|earth/, '🌍'],
  [/english|grammar|writing/, '📝'], [/hindi/, '🇮🇳'],
  [/music|guitar|piano/, '🎵'], [/drawing|art|design/, '🎨'],
  [/economics|finance|stock/, '💹'], [/science/, '🔬'],
  [/anime|manga/, '🌸'], [/fitness|workout|yoga/, '💪'],
  [/cooking|recipe/, '🍳'], [/photography/, '📷'],
]

function getTopicIcon(topic: string): string {
  const l = topic.toLowerCase()
  for (const [r, icon] of TOPIC_ICONS) { if (r.test(l)) return icon }
  return '📚'
}

// ── AI Course Generator ─────────────────────────────────────
async function generateCourse(topic: string, level: string, language: string): Promise<Lesson[]> {
  const langInstr = language === 'hindi' ? 'Hindi mein' : language === 'hinglish' ? 'Hinglish (Hindi+English mix) mein — jaise dost bolta hai' : 'in simple English'
  const levelInstr = level === 'beginner' ? 'bilkul beginner ke liye, no jargon' : level === 'intermediate' ? 'intermediate level, concepts ke saath' : 'advanced depth, with nuance'

  const prompt = `You are JARVIS, a sharp witty AI tutor. Create a structured 6-lesson mini-course on: "${topic}"
Level: ${levelInstr}
Language: ${langInstr}

Return ONLY valid JSON array (no markdown, no explanation):
[
  {
    "title": "Lesson title",
    "content": "2-3 paragraph explanation with examples. Make it engaging, practical, real-world examples.",
    "quiz": [
      {"q": "Question?", "opts": ["A","B","C","D"], "ans": 0}
    ]
  }
]

Rules:
- Exactly 6 lessons
- Each lesson: 150-200 words content
- Each lesson: exactly 2 quiz questions
- Progressive difficulty: lesson 1 = basics, lesson 6 = practical application
- Use relatable Indian examples where possible
- Make it interesting, not boring textbook style`

  try {
    // Try Gemini first (if key set)
    const gemKey = typeof window !== 'undefined' ? localStorage.getItem('jarvis_key_GEMINI_API_KEY') : null
    let text = ''

    if (gemKey) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gemKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.8, maxOutputTokens: 3000 } }),
        signal: AbortSignal.timeout(30000),
      })
      const d = await res.json()
      text = d.candidates?.[0]?.content?.parts?.[0]?.text || ''
    }

    // Fallback: Puter (window.puter.ai SDK)
    if (!text && typeof window !== 'undefined' && (window as any).puter?.ai) {
      const resp = await (window as any).puter.ai.chat(prompt, { model: 'gpt-4o-mini' })
      text = resp?.message?.content || resp?.text || ''
    }

    if (!text) throw new Error('No AI response')
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return parsed.map((l: any, i: number) => ({
      id: `l_${Date.now()}_${i}`,
      title: l.title || `Lesson ${i + 1}`,
      content: l.content || '',
      quiz: l.quiz || [],
      done: false,
      notes: '',
    }))
  } catch {
    // Fallback: basic structure
    return Array.from({ length: 6 }, (_, i) => ({
      id: `l_${Date.now()}_${i}`,
      title: `Lesson ${i + 1}: ${['Introduction', 'Core Concepts', 'Deep Dive', 'Practice', 'Advanced Topics', 'Real World Application'][i]}`,
      content: `${topic} ka lesson ${i + 1}. AI se generate karne mein error aaya — apna API key settings mein add karo ya fir dobara try karo.`,
      quiz: [],
      done: false,
      notes: '',
    }))
  }
}

// ── Lesson Viewer ──────────────────────────────────────────
function LessonView({ lesson, onDone, onNext, isLast }: {
  lesson: Lesson
  onDone: (notes: string) => void
  onNext: () => void
  isLast: boolean
}) {
  const [quizIdx, setQuizIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [quizDone, setQuizDone] = useState(false)
  const [notes, setNotes] = useState(lesson.notes)
  const [showQuiz, setShowQuiz] = useState(false)
  const [allCorrect, setAllCorrect] = useState(0)

  const quiz = lesson.quiz || []
  const currentQ = quiz[quizIdx]

  function answerQ(idx: number) {
    if (selected !== null) return
    setSelected(idx)
    if (idx === currentQ.ans) setAllCorrect(c => c + 1)
    setTimeout(() => {
      if (quizIdx + 1 < quiz.length) {
        setQuizIdx(q => q + 1)
        setSelected(null)
      } else {
        setQuizDone(true)
      }
    }, 800)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14, padding: '14px 0' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px' }}>
        <div style={{ fontSize: 9, color: 'var(--text-faint)', letterSpacing: 2, marginBottom: 6 }}>LESSON CONTENT</div>
        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' as const }}>{lesson.content}</div>
      </div>

      {/* Notes */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
        <div style={{ fontSize: 9, color: 'var(--text-faint)', letterSpacing: 2, marginBottom: 6 }}>✏️ NOTES</div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Yahan apne notes likho..."
          style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 12, resize: 'none', outline: 'none', minHeight: 60, lineHeight: 1.6 }} />
      </div>

      {/* Quiz */}
      {quiz.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-acc)', borderRadius: 12, padding: '12px 14px' }}>
          {!showQuiz ? (
            <button onClick={() => setShowQuiz(true)} style={{ width: '100%', padding: '10px', borderRadius: 10, background: 'var(--accent-bg)', border: '1px solid var(--border-acc)', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              🧠 Quiz Attempt Karo ({quiz.length} questions)
            </button>
          ) : quizDone ? (
            <div style={{ textAlign: 'center' as const }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{allCorrect === quiz.length ? '🎉' : allCorrect >= quiz.length / 2 ? '👍' : '📖'}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{allCorrect}/{quiz.length} Sahi!</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{allCorrect === quiz.length ? 'Perfect! Aage badho!' : 'Thoda aur padho, next baar better!'}</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-faint)', marginBottom: 8 }}>Q{quizIdx + 1}/{quiz.length}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>{currentQ?.q}</div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                {currentQ?.opts.map((opt, i) => {
                  const isSelected = selected === i
                  const isCorrect = currentQ.ans === i
                  const showResult = selected !== null
                  return (
                    <button key={i} onClick={() => answerQ(i)}
                      style={{ padding: '9px 12px', borderRadius: 9, textAlign: 'left' as const, cursor: selected !== null ? 'default' : 'pointer', fontSize: 12, fontWeight: 500, transition: 'all .2s', border: `1px solid ${showResult && isCorrect ? '#34d399' : showResult && isSelected && !isCorrect ? '#f87171' : 'var(--border)'}`, background: showResult && isCorrect ? 'rgba(52,211,153,.15)' : showResult && isSelected && !isCorrect ? 'rgba(248,113,113,.15)' : isSelected ? 'var(--accent-bg)' : 'var(--bg-surface)', color: showResult && isCorrect ? '#34d399' : showResult && isSelected && !isCorrect ? '#f87171' : 'var(--text)' }}>
                      {['A','B','C','D'][i]}. {opt}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Done button */}
      <button onClick={() => onDone(notes)}
        style={{ padding: '13px', borderRadius: 12, background: 'var(--accent-bg)', border: '1px solid var(--border-acc)', color: 'var(--accent)', fontSize: 14, cursor: 'pointer', fontWeight: 700 }}>
        {lesson.done ? '✓ Completed' : isLast ? '🎓 Course Complete!' : '✓ Mark Done & Next →'}
      </button>
    </div>
  )
}

// ── Course Creator ─────────────────────────────────────────
function CreateCourse({ onCreate }: { onCreate: (c: Course) => void }) {
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
  const [lang, setLang] = useState<'hinglish' | 'hindi' | 'english'>('hinglish')
  const [loading, setLoading] = useState(false)

  const SUGGESTIONS = ['Python Basics', 'React JS', 'Data Science', 'Stock Market', 'Guitar', 'Cooking', 'Fitness', 'Anime Drawing', 'Public Speaking', 'Investing']

  async function create() {
    if (!topic.trim()) return
    setLoading(true)
    const lessons = await generateCourse(topic, level, lang)
    const course: Course = {
      id: 'c_' + Date.now(), topic: topic.trim(), level, language: lang,
      lessons, createdAt: Date.now(), currentLesson: 0, icon: getTopicIcon(topic),
    }
    onCreate(course)
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14, padding: '14px 0' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px' }}>
        <div style={{ fontSize: 22, textAlign: 'center' as const, marginBottom: 8 }}>🧠</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', textAlign: 'center' as const, marginBottom: 4 }}>AI Course Generator</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' as const, marginBottom: 16 }}>Koi bhi topic likho — JARVIS 6-lesson course bana deta hai</div>

        <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && create()}
          placeholder="Topic likho (e.g. Python, Guitar, Finance...)"
          style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 10, padding: '11px 14px', fontSize: 14, marginBottom: 12 }} />

        {/* Suggestions */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 14 }}>
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => setTopic(s)}
              style={{ padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)', background: topic === s ? 'var(--accent-bg)' : 'transparent', color: topic === s ? 'var(--accent)' : 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}>
              {s}
            </button>
          ))}
        </div>

        {/* Level */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>Level</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['beginner', 'intermediate', 'advanced'] as const).map(l => (
              <button key={l} onClick={() => setLevel(l)}
                style={{ flex: 1, padding: '8px', borderRadius: 9, border: `1px solid ${level === l ? 'var(--border-acc)' : 'var(--border)'}`, background: level === l ? 'var(--accent-bg)' : 'transparent', color: level === l ? 'var(--accent)' : 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontWeight: level === l ? 700 : 400, textTransform: 'capitalize' as const }}>
                {l === 'beginner' ? '🌱' : l === 'intermediate' ? '🔥' : '🚀'} {l}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>Language</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {([['hinglish', '🇮🇳 Hinglish'], ['hindi', '🇮🇳 Hindi'], ['english', '🇬🇧 English']] as const).map(([l, label]) => (
              <button key={l} onClick={() => setLang(l)}
                style={{ flex: 1, padding: '8px', borderRadius: 9, border: `1px solid ${lang === l ? 'var(--border-acc)' : 'var(--border)'}`, background: lang === l ? 'var(--accent-bg)' : 'transparent', color: lang === l ? 'var(--accent)' : 'var(--text-muted)', fontSize: 10, cursor: 'pointer', fontWeight: lang === l ? 700 : 400 }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={create} disabled={loading || !topic.trim()}
          style={{ width: '100%', padding: '13px', borderRadius: 12, background: loading ? 'var(--bg-surface)' : 'var(--accent-bg)', border: '1px solid var(--border-acc)', color: loading ? 'var(--text-muted)' : 'var(--accent)', fontSize: 14, cursor: loading ? 'default' : 'pointer', fontWeight: 700 }}>
          {loading ? '⏳ Course ban raha hai...' : '🚀 Course Banao'}
        </button>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────
export default function LearnPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [activeCourse, setActiveCourse] = useState<Course | null>(null)
  const [activeLesson, setActiveLesson] = useState<number>(0)
  const [view, setView] = useState<'list' | 'create' | 'lesson'>('list')

  useEffect(() => { setCourses(loadCourses()) }, [])

  function addCourse(c: Course) {
    const updated = [c, ...courses]
    setCourses(updated); saveCourses(updated)
    setActiveCourse(c); setActiveLesson(0); setView('lesson')
  }

  function markLessonDone(courseId: string, lessonIdx: number, notes: string) {
    const updated = courses.map(c => {
      if (c.id !== courseId) return c
      const lessons = c.lessons.map((l, i) => i === lessonIdx ? { ...l, done: true, notes } : l)
      const next = Math.min(lessonIdx + 1, c.lessons.length - 1)
      return { ...c, lessons, currentLesson: next }
    })
    setCourses(updated); saveCourses(updated)
    const course = updated.find(c => c.id === courseId)!
    setActiveCourse(course)
    if (lessonIdx + 1 < course.lessons.length) {
      setActiveLesson(lessonIdx + 1)
    }
  }

  function deleteCourse(id: string) {
    const updated = courses.filter(c => c.id !== id)
    setCourses(updated); saveCourses(updated)
    if (activeCourse?.id === id) { setActiveCourse(null); setView('list') }
  }

  const completedCount = activeCourse?.lessons.filter(l => l.done).length || 0
  const totalLessons = activeCourse?.lessons.length || 0
  const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column', color: 'var(--text)' }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--header-bg)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={() => { if (view === 'lesson' || view === 'create') setView('list'); else router.push('/') }}
          style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 18, cursor: 'pointer' }}>←</button>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: 'var(--text)', fontFamily: "'Space Mono',monospace" }}>
          {view === 'lesson' && activeCourse ? activeCourse.icon + ' ' + activeCourse.topic.toUpperCase() : 'LEARN HUB'}
        </div>
        <div style={{ flex: 1 }} />
        {view === 'lesson' && activeCourse && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{completedCount}/{totalLessons} done</span>
        )}
        {view === 'list' && (
          <button onClick={() => setView('create')}
            style={{ padding: '6px 12px', borderRadius: 10, background: 'var(--accent-bg)', border: '1px solid var(--border-acc)', color: 'var(--accent)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            + New Course
          </button>
        )}
      </div>

      {/* Progress bar (active course) */}
      {view === 'lesson' && activeCourse && (
        <div style={{ height: 3, background: 'var(--bg-surface)', flexShrink: 0 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', transition: 'width .4s' }} />
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px' }}>

        {/* LIST VIEW */}
        {view === 'list' && (
          <div style={{ paddingTop: 12 }}>
            {courses.length === 0 ? (
              <div style={{ textAlign: 'center' as const, padding: '60px 20px' }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>🧠</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Koi course nahi hai</div>
                <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 20 }}>Koi bhi topic likho — AI poora course bana deta hai!</div>
                <button onClick={() => setView('create')}
                  style={{ padding: '11px 24px', borderRadius: 12, background: 'var(--accent-bg)', border: '1px solid var(--border-acc)', color: 'var(--accent)', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
                  🚀 Pehla Course Banao
                </button>
              </div>
            ) : (
              courses.map(c => {
                const done = c.lessons.filter(l => l.done).length
                const total = c.lessons.length
                const p = Math.round((done / Math.max(total, 1)) * 100)
                return (
                  <div key={c.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 24 }}>{c.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{c.topic}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                          {c.level} · {c.language} · {total} lessons
                        </div>
                      </div>
                      <button onClick={() => deleteCourse(c.id)} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 14, cursor: 'pointer' }}>✕</button>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-surface)', marginBottom: 8 }}>
                      <div style={{ height: '100%', width: `${p}%`, background: p === 100 ? '#34d399' : 'var(--accent)', borderRadius: 2 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{done}/{total} lessons · {p}%</span>
                      <button onClick={() => { setActiveCourse(c); setActiveLesson(c.currentLesson); setView('lesson') }}
                        style={{ padding: '6px 14px', borderRadius: 9, background: 'var(--accent-bg)', border: '1px solid var(--border-acc)', color: 'var(--accent)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                        {p === 0 ? '▶ Start' : p === 100 ? '↺ Review' : '▶ Continue'}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* CREATE VIEW */}
        {view === 'create' && <CreateCourse onCreate={addCourse} />}

        {/* LESSON VIEW */}
        {view === 'lesson' && activeCourse && (
          <div>
            {/* Lesson tabs */}
            <div style={{ display: 'flex', gap: 4, padding: '10px 0', overflowX: 'auto', scrollbarWidth: 'none' as const }}>
              {activeCourse.lessons.map((l, i) => (
                <button key={l.id} onClick={() => setActiveLesson(i)}
                  style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${activeLesson === i ? 'var(--border-acc)' : 'var(--border)'}`, background: activeLesson === i ? 'var(--accent-bg)' : l.done ? 'rgba(52,211,153,.08)' : 'transparent', color: activeLesson === i ? 'var(--accent)' : l.done ? '#34d399' : 'var(--text-muted)', fontSize: 10, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' as const }}>
                  {l.done ? '✓' : i + 1} L{i + 1}
                </button>
              ))}
            </div>

            {/* Current lesson title */}
            <div style={{ marginBottom: 2 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                {activeCourse.lessons[activeLesson]?.title}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>Lesson {activeLesson + 1} of {activeCourse.lessons.length}</div>
            </div>

            <LessonView
              lesson={activeCourse.lessons[activeLesson]}
              isLast={activeLesson === activeCourse.lessons.length - 1}
              onDone={(notes) => markLessonDone(activeCourse.id, activeLesson, notes)}
              onNext={() => setActiveLesson(l => Math.min(l + 1, activeCourse.lessons.length - 1))}
            />
          </div>
        )}
      </div>
    </div>
  )
}
