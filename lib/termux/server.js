const http = require('http')
const { execSync } = require('child_process')

http.createServer((req, res) => {
  // CORS - JARVIS se connect ho sake
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Content-Type', 'application/json')

  // OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  if (req.url === '/ping') {
    res.end(JSON.stringify({ ok: true, msg: 'JARVIS Bridge ready!' }))
    return
  }

  if (req.url === '/run' && req.method === 'POST') {
    let body = ''
    req.on('data', d => body += d)
    req.on('end', () => {
      try {
        const { cmd } = JSON.parse(body)
        // Safety: only termux-* and safe commands
        const safe = cmd.startsWith('termux-') || cmd.startsWith('am ') || 
                     cmd.startsWith('getprop') || cmd.startsWith('df ') ||
                     cmd.startsWith('free ') || cmd.startsWith('echo ')
        if (!safe) {
          res.end(JSON.stringify({ ok: false, output: 'Command not allowed: ' + cmd }))
          return
        }
        const output = execSync(cmd, { timeout: 8000 }).toString().trim()
        res.end(JSON.stringify({ ok: true, output: output || 'Done! ✓' }))
      } catch (e) {
        res.end(JSON.stringify({ ok: false, output: e.message }))
      }
    })
  } else {
    res.writeHead(404)
    res.end(JSON.stringify({ ok: false, output: 'Not found' }))
  }
}).listen(1234, '127.0.0.1', () => {
  console.log('╔══════════════════════════════╗')
  console.log('║  JARVIS Bridge :1234  ✓      ║')
  console.log('║  Phone control ready!        ║')
  console.log('╚══════════════════════════════╝')
})
