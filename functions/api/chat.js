// Cloudflare Pages entry: Pages turns this file into the /api/chat endpoint.
// It runs the same chat logic as Vercel and Cloudflare Workers (api/_answer.js).
import { handleFetch } from '../../api/_answer.js';
import profile from '../../profile.json';

export const onRequest = ({ request, env }) => handleFetch(request, env, profile);
