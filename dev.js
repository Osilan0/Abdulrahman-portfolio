// Local preview with no installs: `node dev.js`, then open http://localhost:3000
// Reads your keys from .env (copy .env.example). Without a key, the chat uses quick answers.
const http = require('http');
const fs = require('fs');
const path = require('path');
process.chdir(__dirname);

try {
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
} catch (e) { /* no .env yet */ }

const handler = require('./api/chat.js');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const PORT = Number(process.env.PORT || 3000);

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/chat') {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 100000) req.destroy(); });
    req.on('end', () => {
      try { req.body = data ? JSON.parse(data) : {}; } catch (e) { req.body = {}; }
      res.status = code => { res.statusCode = code; return res; };
      res.json = obj => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(obj)); };
      Promise.resolve(handler(req, res)).catch(e => { console.error(e); res.statusCode = 500; res.end('{}'); });
    });
    return;
  }
  const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if (rel.split('/').some(seg => seg.startsWith('.') || seg === 'api') || rel === 'dev.js') { res.statusCode = 404; return res.end('Not found'); }
  fs.readFile(path.join(__dirname, rel), (err, buf) => {
    if (err) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('content-type', TYPES[path.extname(rel)] || 'application/octet-stream');
    res.end(buf);
  });
}).listen(PORT, () => {
  console.log(`Portfolio running at http://localhost:${PORT}`);
  if (!process.env.LLM_API_KEY) console.log('No LLM_API_KEY in .env yet, so the chat will use quick answers.');
});
