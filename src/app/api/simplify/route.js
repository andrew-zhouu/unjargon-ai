// app/api/simplify/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { rateLimit, getClientIp } from '@/lib/rateLimiter';

/* -------------------------- constants & helpers --------------------------- */

const MAX_CHARS = 10_000;

function jsonRes(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/* -------------------------- maintenance + rate-limit ---------------------- */

function maintenanceGuard() {
  if (process.env.MAINTENANCE_MODE === 'true') {
    const msg = process.env.MAINTENANCE_MESSAGE || 'Service temporarily unavailable.';
    return jsonRes(503, { error: 'Under maintenance', detail: msg });
  }
  return null;
}

// small in-memory limiter (per-node)
const RL_WINDOW_MS = 60_000;
const RL_MAX = 30;
const rlStore = new Map();

function rateLimitGuard(req) {
  const xf = req.headers.get('x-forwarded-for') || '';
  const ip = (xf.split(',')[0] || req.headers.get('cf-connecting-ip') || 'unknown').trim();
  const now = Date.now();
  const arr = rlStore.get(ip) || [];
  const recent = arr.filter((t) => now - t < RL_WINDOW_MS);
  recent.push(now);
  rlStore.set(ip, recent);
  if (recent.length > RL_MAX) {
    return jsonRes(429, { error: 'Rate limited', detail: 'Too many requests. Please slow down.' });
  }
  return null;
}

/* ----------------------------- level style -------------------------------- */

function levelStyle(level = 'intermediate') {
  switch ((level || '').toLowerCase()) {
    case 'beginner':
      return `Write as if you were talking to a little kid. Use short sentences, very simple words, and a friendly tone. Avoid jargon.`;
    case 'advanced':
      return `Write at an adult undergraduate college-educated level. Be concise and precise; use accurate terminology with brief clarifications.`;
    case 'professional':
      return `Write for professional/PhD readers. Be technically rigorous, retain precise terms and nuance, and avoid over-simplification. Discuss terms in-depth, include potential biases and perhaps even controversies for context.`;
    case 'intermediate':
    default:
      return `Write at ~high school grade level. Be clear and approachable, with light terminology explained.`;
  }
}

/* -------------------------------- getPrompt ------------------------------- */

function getPrompt(domain, text, level) {
  const wc = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  const isShort = wc > 0 && (wc <= 5 || String(text).trim().length < 40);

  const baseIntro = `
${levelStyle(level)}

Please rewrite the following text using EXACTLY these three sections:

1. Summary – A concise plain-English overview of what the text says, does, or changes. If there are only a few words inputted, then discuss the definitions and any related information on those words or combinations of words, just as if someone had searched it up on Google and summarized the related info. (aim for recent info./news).
2. Main Points – Bullet the major takeaways using "- " (who/what changed, actions, steps, implications). If you include an example, make it the LAST bullet and prefix it with "Example:".
3. Helpful Definitions – Define **every** important term, acronym, or cited law/section in the form "**Term**: definition". If something repeats, include it anyway for clarity. Define them just as if someone had searched it up on Google and summarized the related info. (aim for recent info./news).

Constraints:
- Output MUST contain exactly these three numbered headers (no bold, no colons).
- Do NOT add extra sections or rename sections.
- Do NOT restate/bold the section titles inside the section bodies.
- If a section is empty, write "N/A".
`.trim();

  const baseIntroShort = `
${levelStyle(level)}

The input is a very short phrase/keyword. Produce an informative mini-brief using EXACTLY these three sections. Use general background knowledge to expand.
Do **NOT** write "N/A" in any section, even if the input is only a few words.

1. Summary – A clear overview of what the term/topic is and why it matters. If relevant, mention notable recent developments at a high level.
2. Main Points – 4–8 hyphen bullets ("- ") covering key properties, uses, risks/benefits, context; if you include an example, make it the LAST bullet and prefix with "Example:".
3. Helpful Definitions – "**Term**: definition" lines for important related concepts, acronyms, or sub-terms a reader would likely encounter when researching this topic.

Constraints:
- Output MUST contain exactly these three numbered headers (no bold, no colons).
- Do NOT add extra sections or rename sections.
- Do NOT restate/bold the section titles inside the section bodies.
- Never write "N/A"; if information is minimal, expand with concise background.
`.trim();

  const intro = isShort ? baseIntroShort : baseIntro;

  switch ((domain || 'general').toLowerCase()) {
    case 'legal':
      return `You are a legal assistant helping regular people understand complex legal documents.

${intro}

Domain guidance (LEGAL):
- In Main Points: enumerate clauses, amendments, obligations, rights, penalties, and effective dates.
- If an example helps, add it as the last bullet: "- Example: …".
- In Helpful Definitions: include EVERY statute/section citation (e.g., "section 174A(b)", "56(b)(2)"), legal terms of art, and agency/authority names.

Legal text:
${text}`;
    case 'medical':
      return `You are a healthcare explainer helping patients understand medical information.

${intro}

Domain guidance (MEDICAL):
- In Main Points: include diagnosis/condition, purpose of test/procedure, key steps, risks/benefits, aftercare, and timelines.
- In Helpful Definitions: define clinical terms, abbreviations, labs, drug names/classes, and procedures.

Medical text:
${text}`;
    case 'government':
      return `You are a civic guide helping people understand government programs, policies, and rights.

${intro}

Domain guidance (GOVERNMENT):
- In Main Points: cover eligibility, benefits/obligations, responsible agency, how to apply/comply, deadlines, and penalties (if any).
- In Helpful Definitions: define agencies, program names, legal references (titles/sections/forms).

Government text:
${text}`;
    case 'financial':
      return `You are a finance explainer helping people understand financial documents, statements, and policies.

${intro}

Domain guidance (FINANCIAL):
- In Main Points: focus on fees/costs/rates, limits/caps, timelines, obligations/rights, and practical impacts/risks.
- In Helpful Definitions: define financial terms, ratios, instruments, and regulatory references (e.g., SEC, 10-K, APR).

Financial text:
${text}`;
    case 'education':
      return `You are an education explainer helping students, parents, and educators understand academic policies and resources.

${intro}

Domain guidance (EDUCATION):
- In Main Points: outline requirements, steps, timelines, grading/credit impacts, and available support/resources.
- In Helpful Definitions: define educational terms, programs, acronyms, and administrative processes.

Education text:
${text}`;
    case 'nutrition':
      return `You are a nutrition explainer helping people understand foods, labels, and dietary guidance.

${intro}

Domain guidance (NUTRITION):
- In Main Points: highlight serving size, calories per serving, macronutrients (protein, carbs, fat), added sugars, sodium, fiber, notable vitamins/minerals (%DV), and any allergens/additives. Call out high/low red flags.
- If relevant, end with "- Example: …" showing how someone would use this info in a day.
- In Helpful Definitions: define terms like "% Daily Value", "added sugars", "saturated fat", "trans fat", "fiber", "ultra-processed", "net carbs", "complete protein", and any specialized terms mentioned. For any common/important term previously mentioned, whether in the generated "main points" earlier or in the inputted text, recommend the official VERIFIED FDA/government health guideline suggestion **NUMERICAL** suggested daily value/intake if applicable, such as BUT NOT LIMITED TO "Recommended daily intake of vitamin C: adult men need ~90 mg and adult women need about ~75 mg".

Nutrition text:
${text}`;
    default:
      return `You are a plain-language explainer helping people understand complex text.

${intro}

Domain guidance (GENERAL):
- In Main Points: summarize the key actions/ideas and any steps or implications.
- In Helpful Definitions: define any uncommon terms, acronyms, or references.

Text:
${text}`;
  }
}

/* ------------------------------ POST handler ------------------------------- */

export async function POST(req) {
  // Early guards
  {
    const r = maintenanceGuard();
    if (r) return r;
  }
  {
    const r = rateLimitGuard(req);
    if (r) return r;
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return jsonRes(500, { error: 'Server missing OPENAI_API_KEY' });

  // Robust body parsing: JSON or text
  const ct = req.headers.get('content-type') || '';
  let text = '';
  let domain = 'general';
  let level = 'intermediate';

  if (ct.includes('application/json')) {
    try {
      const body = await req.json();
      if (typeof body?.text === 'string') text = body.text;
      else if (typeof body?.content === 'string') text = body.content;
      else if (typeof body?.input === 'string') text = body.input;
      if (typeof body?.domain === 'string') domain = body.domain;
      if (typeof body?.level === 'string') level = body.level;
    } catch {
      // fall through to raw text
    }
  }

  if (!text) {
    const raw = (await req.text().catch(() => '')) || '';
    const trimmed = raw.trim();
    if (trimmed) {
      // If it looks like JSON but header was wrong, try to parse
      if (/^[{\[]/.test(trimmed)) {
        try {
          const body = JSON.parse(trimmed);
          if (typeof body?.text === 'string') text = body.text;
          else if (typeof body?.content === 'string') text = body.content;
          else if (typeof body?.input === 'string') text = body.input;
          if (typeof body?.domain === 'string') domain = body.domain;
          if (typeof body?.level === 'string') level = body.level;
        } catch {
          text = trimmed; // treat as plain text
        }
      } else {
        text = trimmed; // plain text body
      }
    }
  }

  text = (text ?? '').toString().trim();
  if (!text) return jsonRes(400, { error: 'Missing "text" string.' });

  if (text.length > MAX_CHARS) {
    return jsonRes(413, {
      error: 'Input too large',
      detail: `Your input has ${text.length.toLocaleString()} characters. Limit is ${MAX_CHARS.toLocaleString()}.`,
    });
  }

  // Secondary (redis/etc.) limiter if you use it
  {
    const ip = getClientIp(req);
    const { ok, remaining, limit, resetMs } = rateLimit({
      key: `simplify:${ip}`,
      limit: 20,
      windowMs: 60_000,
    });
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again shortly.' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(Math.ceil(resetMs / 1000)),
        },
      });
    }
  }

  try {
    const prompt = getPrompt(domain, text, level);

    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,         // stable outputs for formatting
        max_tokens: 450,
        stream: true,
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that simplifies input into EXACTLY 3 numbered sections:

1. Summary
2. Main Points
3. Helpful Definitions

Hard formatting rules:
- Use the three numbered headers EXACTLY as written above (no bold, no colons, no extra punctuation).
- Start each section on its own line; content follows on subsequent lines.

Main Points:
- Under "Main Points", use ONLY hyphens "-" for each new item. If there is an example, include it as the LAST bullet prefixed with "Example:".

Helpful Definitions:
- Under "Helpful Definitions", list EVERY important term, acronym, or cited law/section in the input, Summary, or Main Points using EXACTLY: "- **Term**: definition".

Never add extra sections. If a section is empty, output "N/A".`,
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const raw = await upstream.text().catch(() => '');
      return jsonRes(502, { error: 'Upstream model error', detail: raw.slice(0, 2000) });
    }

    // Stream SSE -> plain text
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const ts = new TransformStream();
    const writer = ts.writable.getWriter();
    const reader = upstream.body.getReader();

    (async () => {
      try {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') {
              await writer.close();
              return;
            }
            try {
              const json = JSON.parse(data);
              const delta = json?.choices?.[0]?.delta?.content || '';
              if (delta) await writer.write(encoder.encode(delta));
            } catch {
              // ignore keepalives
            }
          }
        }
      } catch (e) {
        try { await writer.abort(e); } catch {}
      } finally {
        try { await writer.close(); } catch {}
      }
    })();

    return new Response(ts.readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    console.error('simplify route failed:', err);
    return jsonRes(500, { error: 'Internal error' });
  }
}

/* ------------------------------ GET fallback ------------------------------- */

export async function GET() {
  return jsonRes(405, { error: 'Method not allowed' });
}
