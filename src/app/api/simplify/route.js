// app/api/simplify/route.js
export const runtime = 'nodejs';         // optional: avoids Edge quirks
export const dynamic = 'force-dynamic';  // optional: no caching

/* ----------------------------- level style (NEW) ---------------------------- */
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

/* -------------------------------- getPrompt -------------------------------- */
function getPrompt(domain, text, level) {
  // Heuristic: treat very short inputs as "keyword lookups"
  const wc = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  const isShort = wc > 0 && (wc <= 5 || String(text).trim().length < 40);

  // Original baseIntro (unchanged semantics)
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

  // Short-input mode: small, surgical override that forbids "N/A"
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

  switch ((domain || "general").toLowerCase()) {
    case "legal":
      return `You are a legal assistant helping regular people understand complex legal documents.

${intro}

Domain guidance (LEGAL):
- In Main Points: enumerate clauses, amendments, obligations, rights, penalties, and effective dates.
- If an example helps, add it as the last bullet: "- Example: …".
- In Helpful Definitions: include EVERY statute/section citation (e.g., "section 174A(b)", "56(b)(2)"), legal terms of art, and agency/authority names.

Legal text:
${text}`;

    case "medical":
      return `You are a healthcare explainer helping patients understand medical information.

${intro}

Domain guidance (MEDICAL):
- In Main Points: include diagnosis/condition, purpose of test/procedure, key steps, risks/benefits, aftercare, and timelines.
- In Helpful Definitions: define clinical terms, abbreviations, labs, drug names/classes, and procedures.

Medical text:
${text}`;

    case "government":
      return `You are a civic guide helping people understand government programs, policies, and rights.

${intro}

Domain guidance (GOVERNMENT):
- In Main Points: cover eligibility, benefits/obligations, responsible agency, how to apply/comply, deadlines, and penalties (if any).
- In Helpful Definitions: define agencies, program names, legal references (titles/sections/forms).

Government text:
${text}`;

    case "financial":
      return `You are a finance explainer helping people understand financial documents, statements, and policies.

${intro}

Domain guidance (FINANCIAL):
- In Main Points: focus on fees/costs/rates, limits/caps, timelines, obligations/rights, and practical impacts/risks.
- In Helpful Definitions: define financial terms, ratios, instruments, and regulatory references (e.g., SEC, 10-K, APR).

Financial text:
${text}`;

    case "education":
      return `You are an education explainer helping students, parents, and educators understand academic policies and resources.

${intro}

Domain guidance (EDUCATION):
- In Main Points: outline requirements, steps, timelines, grading/credit impacts, and available support/resources.
- In Helpful Definitions: define educational terms, programs, acronyms, and administrative processes.

Education text:
${text}`;

    case "nutrition":
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

/* --------------------------------- helpers --------------------------------- */
function safeJsonParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

function normalizeHeaders(s) {
  let out = String(s || '');

  // helper: normalize one header while preserving content
  const normHeader = (input, labelRe, cleanLabel) =>
    input.replace(labelRe, (m) => {
      // strip the header label + optional colon/dash/emdash, keep the rest
      const after = m
        .replace(/^\s*/, '')
        .replace(new RegExp(`^${cleanLabel}\\s*[:–—-]?\\s*`, 'i'), '');
      return `${cleanLabel}${after ? `\n${after}` : ''}`;
    });

  // 1) Make headers canonical (and keep any same-line content)
  out = normHeader(out, /^\s*1\.\s*Summary[^\n]*$/im, '1. Summary');
  out = normHeader(out, /^\s*2\.\s*Main\s*Points[^\n]*$/im, '2. Main Points');
  out = normHeader(out, /^\s*3\.\s*Helpful\s*Definitions[^\n]*$/im, '3. Helpful Definitions');

  // 2) If any header is missing entirely, create it with N/A
  if (!/^\s*1\.\s*Summary\s*$/m.test(out)) out = `1. Summary\n${out}`.trim();
  if (!/^\s*2\.\s*Main Points\s*$/m.test(out)) out += `\n\n2. Main Points\nN/A`;
  if (!/^\s*3\.\s*Helpful Definitions\s*$/m.test(out)) out += `\n\n3. Helpful Definitions\nN/A`;

  return out;
}

function fixMainPointsBullets(text) {
  // 1) Find the "2. Main Points" section
  const reHeader = /^\s*2\.\s*Main\s*Points\s*$/m;
  const m = text.match(reHeader);
  if (!m) return text;

  const start = m.index + m[0].length;
  const tail  = text.slice(start);
  // stop at next numbered header ("3. ...") ONLY if it starts a line
  const nextHeader = tail.match(/^\s*\d+\.\s/m);
  const end = nextHeader ? start + nextHeader.index : text.length;

  const before = text.slice(0, start);
  let   body   = text.slice(start, end);
  const after  = text.slice(end);

  // 2) Normalize line breaks & whitespace
  body = body.replace(/\r\n/g, '\n');         // CRLF -> LF
  body = body.replace(/\u00A0/g, ' ');        // nbsp -> space
  body = body.replace(/^\s+|\s+$/g, '');      // trim

  // If it's empty or explicitly N/A, keep as is
  if (!body || /^N\/A$/i.test(body)) return before + '\nN/A' + after;

  // 3) Break the body into tentative lines
  let lines = body.split(/\n+/).map(s => s.trim()).filter(Boolean);

  // If there's only one “line” (the model gave a paragraph), sentence-split it
  if (lines.length <= 1) {
    const para = lines[0] || body;
    // Split on sentence enders followed by space + capital or number/paren
    lines = para
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+(?=[A-Z0-9(])/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  // 4) Normalize any existing bullets/numbering → "- "
  const bulletized = lines.map((l) => {
    // remove common list markers first
    l = l.replace(/^\s*(?:[-*•–—]\s+|\d+\)|\d+\.\s+)/, '');
    // if it already starts with "- " after prior runs, don't double it
    return l.startsWith('- ') ? l : `- ${l}`;
  });

  // 5) Reassemble with a guaranteed leading newline so your splitter sees bullets
  return before + '\n' + bulletized.join('\n') + '\n' + after;
}


/* ----------------------------------- POST ---------------------------------- */
export async function POST(req) {
  try {
    const { text, domain, level } = await req.json().catch(() => ({}));
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing "text" string.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const prompt = getPrompt(domain, text, level);

    // 🔹 Ask OpenAI for a *stream*
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 1,
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
- Start each section on its own line; content follows immediately on subsequent lines.

Main Points formatting:
- Under "Main Points", use ONLY hyphens "-" for each new item. If there is an example, include it as the LAST bullet prefixed with "Example:".

Helpful Definitions formatting:
- Under "Helpful Definitions", list EVERY important and potentially confusing term, acronym, or cited law/section in the inputted text, Summary, or Main points using the exact pattern: "**Term**: definition".

Never add extra sections. If a section is empty, output "N/A".`,
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const raw = await upstream.text().catch(() => '');
      console.error('OpenAI stream error:', upstream.status, raw);
      return new Response(JSON.stringify({ error: 'Upstream model error', detail: raw.slice(0, 2000) }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 🔹 Convert OpenAI SSE into a plain text stream of content deltas
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

          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // keep partial

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
              if (delta) {
                await writer.write(encoder.encode(delta));
              }
            } catch {
              // ignore JSON parse errors for non-JSON heartbeats
            }
          }
        }
      } catch (e) {
        try { await writer.abort(e); } catch {}
      } finally {
        try { await writer.close(); } catch {}
      }
    })();

    // 🔹 Send as plain text so the client can read() chunks easily
    return new Response(ts.readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('API route failed:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
