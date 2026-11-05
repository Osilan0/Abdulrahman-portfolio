// POST /api/chat on Vercel and in the local preview (node dev.js). The chat logic lives in _answer.js,
// which Cloudflare uses too. Your API key stays on the server; the browser never sees it.
const fs = require('fs');
const path = require('path');
const { answer } = require('./_answer.js');

let profile;
module.exports = async function handler(req, res) {
  if (!profile) profile = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'profile.json'), 'utf8'));
  const r = await answer({
    method: req.method,
    origin: req.headers.origin,
    ip: String(req.headers['x-forwarded-for'] || '').split(',')[0].trim(),
    body: req.body,
    env: process.env,
    profile
  });
  for (const [k, v] of Object.entries(r.headers || {})) res.setHeader(k, v);
  return res.status(r.status).json(r.json);
};
