# Ask-Me Portfolio

A chat-first portfolio. Visitors ask an AI about you, and it answers **only** from your own profile. The same profile also fills the sections: Startups, Projects, Experience, Campus & volunteering, Certifications, About and Contact.

It runs on a free LLM, and you can host it for free on Cloudflare or Vercel.

## How it works

```
Visitor's browser ──question──▶ /api/chat (your server) ──▶ free LLM (Groq by default)
        ▲                            │
        └──── answer + sources ◀─────┘  rules + profile.json are added here
```

- **No training needed.** The AI reads `profile.json` with every question. To "train" it, you edit that file. You don't fine-tune anything.
- **It doesn't make things up.** Strict rules tell the model to use only your profile and to say "that's not in my portfolio" otherwise. It runs at low temperature, and every answer shows which entries it came from as clickable chips. This makes made-up answers rare, not impossible, so the page says to check the sections.
- **It stays on topic.** It politely declines homework, general questions and attempts to change its rules.
- **It replies in the visitor's language.**
- **It never breaks.** If there's no API key, or the free model is down or rate-limited, the chat still gives a "quick answer" built straight from your profile.
- **Your key stays secret.** It lives in a server environment variable and never reaches the browser.

## Files

| File | What it is |
|---|---|
| `profile.json` | **Everything about you.** The sections and the chatbot both read from it. |
| `api/_answer.js` | The chat logic: calls the LLM (with a backup model) and falls back to answers built from the profile. Every host uses it. |
| `api/chat.js` | The chat endpoint on Vercel and in the local preview. |
| `worker.js`, `wrangler.jsonc`, `.assetsignore` | The Cloudflare Workers version (`.assetsignore` keeps code and notes off the site). |
| `functions/api/chat.js` | The Cloudflare Pages version. |
| `core.js` | Shared logic: the AI rules (`buildPrompt`), source tags, offline answers. |
| `index.html`, `styles.css`, `app.js`, `chat.js` | The website. |
| `dev.js` | A local preview server with nothing to install. |
| `.env.example` | The settings you'll need (API key, model). |

## 1. Add your information

Edit `profile.json`. Every section uses the same fields:

```json
{ "title": "Startup One", "role": "Co-founder & CEO", "period": "Feb 2024 – now",
  "summary": "One sentence.", "details": ["Bullet", "Bullet"], "tags": ["Skill"], "link": "https://…" }
```

- Write `period` like `Jun 2024 – Aug 2024` or `Sep 2023 – now`. The "My journey" timeline is drawn from these dates.
- `faq` is where you teach the bot your own answers, for example "Why should we hire you?", "Are you open to relocating?" or "What's your work style?". When a visitor asks something similar, the bot uses your words.
- `assistant.voice`: use `"first-person"` for "I founded…" or `"third-person"` for "Sara founded…".
- `booking`: your Calendly link, for example `https://calendly.com/your-name/30min`. The Contact page then shows your calendar so visitors can book without leaving the site. The top button becomes "Book a meeting", and the assistant offers the link when someone asks to meet. A free Calendly account works.
- **Everything in `profile.json` is public.** The website loads it, and the bot can repeat any of it. Don't put anything private there, like your phone number, grades you don't want shared, or salary expectations.

## 2. Get a free AI key

Recommended: **Groq**. It's fast and free, and it uses the standard OpenAI-style API.

1. Sign up at https://console.groq.com and create an API key.
2. That's the only setting you need. The site uses `openai/gpt-oss-120b`, with `openai/gpt-oss-20b` as a backup on the same key. On Groq each model has its own free limits, so the backup roughly doubles how many questions the site can answer.

On Groq's free plan in November 2026, each model allowed 1,000 requests a day and 8,000 tokens a minute. A question uses about 2,500 tokens (about 3,500 in Arabic), so that's roughly 3 questions a minute per model. Limits change, so check the Limits page in Groq's console.

Groq retires models from time to time (`llama-3.3-70b-versatile` is already gone). If answers start saying they were compiled directly from the portfolio, check that your models are still listed in Groq's console, then update `LLM_MODEL` and `FALLBACK_MODEL`.

Any OpenAI-compatible provider works. Change three variables:

| Provider | `LLM_BASE_URL` | Example `LLM_MODEL` |
|---|---|---|
| Groq | `https://api.groq.com/openai/v1` | `openai/gpt-oss-120b` |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | a current Flash or Flash-Lite model from Google AI Studio |
| OpenRouter | `https://openrouter.ai/api/v1` | any model ending in `:free` |

To use a different provider as the backup, set `FALLBACK_BASE_URL`, `FALLBACK_API_KEY` and `FALLBACK_MODEL`. Your main key is never sent to a different provider.

## 3. Try it on your computer

You need Node.js 20 or newer.

```bash
cp .env.example .env
```

Put your key in `.env`, then run:

```bash
node dev.js
```

Open http://localhost:3000. Without a key, the chat still works with quick answers.

## 4. Put it online for free

First push this folder to a GitHub repository. `.env` (your key) and `PUBLIC_FACTS_REVIEW.md` (private notes) are ignored, so neither is uploaded. Then pick a host. Both are free and run the same code. If your domain is on Cloudflare, Cloudflare is simpler, because it sets up the domain for you.

### Option A: Cloudflare Workers

1. In the Cloudflare dashboard, go to **Workers & Pages → Create** and import the repository. Keep the name `abdulrahman-portfolio`: it must match `name` in `wrangler.jsonc`. There's nothing to build, because `wrangler.jsonc` holds the settings.
2. Open the Worker, then **Settings → Variables and Secrets → Add**. Choose **Secret**, name it `LLM_API_KEY`, paste your Groq key, and deploy.
3. Open the site's `workers.dev` address. The sidebar should say "Assistant online".

Prefer Cloudflare Pages? Create a Pages project from the repository with no build command and `/` as the build output directory. `functions/api/chat.js` runs the chat, and `LLM_API_KEY` goes under **Settings → Variables and Secrets**.

### Option B: Vercel

1. Go to https://vercel.com, sign in with GitHub, choose **Add New → Project**, and import the repository. You don't need any build settings.
2. In **Settings → Environment Variables**, add `LLM_API_KEY` (and `LLM_MODEL` or `LLM_BASE_URL` if you changed them).
3. Deploy. The sidebar should say "Assistant online".

Optional, on either host: once your domain works, set `ALLOWED_ORIGIN` to your site's addresses, separated by commas (for example `https://yourdomain.com,https://www.yourdomain.com`), so other sites can't use your chat endpoint.

## 5. Use your own domain

**Hosted on Cloudflare:** open the Worker, then **Settings → Domains & Routes → Add → Custom domain** (on Pages: **Custom domains → Set up a custom domain**). Add `yourdomain.com`, then `www.yourdomain.com`. Cloudflare creates the DNS records and the HTTPS certificate. To send `www` visitors to the main address, add the **Redirect from WWW to root** rule under **Rules** for the domain.

**Hosted on Vercel, domain on Cloudflare:**

1. In Vercel, open the project, then **Settings → Domains**. Add `yourdomain.com`, then add `www.yourdomain.com` and set it to redirect to `yourdomain.com`.
2. Vercel shows the DNS records each domain needs (usually an A record for the bare domain and a CNAME for `www`).
3. In Cloudflare, open the domain, then **DNS → Records → Add record**, and copy each record exactly. Set **Proxy status** to **DNS only** (grey cloud): Vercel issues the HTTPS certificate itself, and Cloudflare's proxy can get in the way.
4. Back in Vercel, wait until both domains show **Valid Configuration**. This usually takes a few minutes.
5. Set `ALLOWED_ORIGIN` (see above), then redeploy.

## Limits worth knowing

- The free tiers allow a limited number of requests per minute and per day. A personal portfolio rarely hits them, and when it does, visitors get quick answers instead of errors.
- The built-in rate limit (20 questions per visitor every 10 minutes) is best-effort. For stronger protection, add Vercel's firewall rules.
- Each question sends about 2,000–3,500 tokens: the rules, your basics, an index of every entry, and the most relevant entries in full (see below). That's well within free limits.

## How answers are grounded (retrieval)

Every question first runs through `retrieve()` in `core.js`:
- Entries named in the question rank highest.
- Section intent comes next, for example "internships" pulls in the Experience section.
- Then word overlap, with rare words weighted more (IDF).

The model receives the rules, your basics, a one-line index of every entry, and full details only for the most relevant ones. That keeps each request to about 2,000–3,500 tokens, which leaves more room on free tiers, and the website shows visitors exactly which entries were searched and used.

The model also ends each answer with `[[sources: …]]` and `[[followups: … | …]]` lines. The site turns these into numbered source cards and "Related" question chips.

## Interface features

- **Command palette:** press Ctrl or ⌘ + K to jump to sections, open entries, search by skill, or ask a question.
- **Slash commands:** type `/` in the question box for `/startups`, `/timeline`, `/resume`, `/new` and more.
- **Timeline** and **Résumé** views, with "Copy as text" on the résumé for recruiters.
- **Knowledge sphere:** every entry is a node on the welcome screen. Drag to rotate, click to open.
- **Case studies:** add a `case` object (`problem`, `approach`, `evidence`, `next`) to any entry in `profile.json`.
- **Booking:** with a `booking` link, the Contact page embeds your Calendly calendar. `/book`, Ctrl or ⌘ + K → "Book a meeting", and a button under booking answers all open it. When someone books, the site shows a confirmation.
