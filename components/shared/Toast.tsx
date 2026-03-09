'use client'
// components/shared/Toast.tsx
export default function Toast({ msg, message, type = 'info' }: { msg?: string; message?: string; type?: 'info'|'success'|'error' }) {
  const text = msg || message || ''
  const c = { info: '#00e5ff', success: '#00e676', error: '#ff4444' }[type]
  return (
    <div style={{
      position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
      background: '#0a1628', border: `1px solid ${c}`, color: c,
      padding: '10px 20px', borderRadius: 20, fontSize: 13, zIndex: 200,
      whiteSpace: 'nowrap', boxShadow: `0 0 20px ${c}40`,
      animation: 'fadeIn .2s ease', maxWidth: '85vw', overflow: 'hidden', textOverflow: 'ellipsis'
    }}>
      {text}
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </div>
  )
}
