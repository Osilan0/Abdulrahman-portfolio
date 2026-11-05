// Cloudflare Workers entry (settings in wrangler.jsonc): /api/chat runs the shared chat logic,
// and every other address is a file from the site (index.html, styles.css, profile.json, ...).
import { handleFetch } from './api/_answer.js';
import profile from './profile.json';

export default {
  fetch(request, env) {
    if (new URL(request.url).pathname === '/api/chat') return handleFetch(request, env, profile);
    return env.ASSETS.fetch(request);
  }
};
