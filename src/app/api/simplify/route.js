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
      return `Write for professional/PhD readers. Be technically rigorous, retain precise terms and nuance, and avoid over-simplification.`;
    case 'intermediate':
    default:
      return `Write at ~high school grade level. Be clear and approachable, with light terminology explained.`;
  }
}

/* -------------------------------- getPrompt -------------------------------- */
function getPrompt(domain, text, level) {
  const baseIntro = `
${levelStyle(level)}

Please rewrite the following text using EXACTLY these three sections:

1. Summary – A concise plain-English overview of what the text says, does, or changes.
2. Main Points – Bullet the major takeaways using "- " (who/what changed, actions, steps, implications). If you include an example, make it the LAST bullet and prefix it with "Example:".
3. Helpful Definitions – Define **every** important term, acronym, or cited law/section in the form "**Term**: definition". If something repeats, include it anyway for clarity.

Constraints:
- Output MUST contain exactly these three numbered headers (no bold, no colons).
- Do NOT add extra sections or rename sections.
- Do NOT restate/bold the section titles inside the section bodies.
- If a section is empty, write "N/A".
`;

  switch ((domain || "general").toLowerCase()) {
    case "legal":
      return `You are a legal assistant helping regular people understand complex legal documents.

${baseIntro}

Domain guidance (LEGAL):
- In Main Points: enumerate clauses, amendments, obligations, rights, penalties, and effective dates.
- If an example helps, add it as the last bullet: "- Example: …".
- In Helpful Definitions: include EVERY statute/section citation (e.g., "section 174A(b)", "56(b)(2)"), legal terms of art, and agency/authority names.

Legal text:
${text}`;

    case "medical":
      return `You are a healthcare explainer helping patients understand medical information.

${baseIntro}

Domain guidance (MEDICAL):
- In Main Points: include diagnosis/condition, purpose of test/procedure, key steps, risks/benefits, aftercare, and timelines.
- In Helpful Definitions: define clinical terms, abbreviations, labs, drug names/classes, and procedures.

Medical text:
${text}`;

    case "government":
      return `You are a civic guide helping people understand government programs, policies, and rights.

${baseIntro}

Domain guidance (GOVERNMENT):
- In Main Points: cover eligibility, benefits/obligations, responsible agency, how to apply/comply, deadlines, and penalties (if any).
- In Helpful Definitions: define agencies, program names, legal references (titles/sections/forms).

Government text:
${text}`;

    case "financial":
      return `You are a finance explainer helping people understand financial documents, statements, and policies.

${baseIntro}

Domain guidance (FINANCIAL):
- In Main Points: focus on fees/costs/rates, limits/caps, timelines, obligations/rights, and practical impacts/risks.
- In Helpful Definitions: define financial terms, ratios, instruments, and regulatory references (e.g., SEC, 10-K, APR).

Financial text:
${text}`;

    case "education":
      return `You are an education explainer helping students, parents, and educators understand academic policies and resources.

${baseIntro}

Domain guidance (EDUCATION):
- In Main Points: outline requirements, steps, timelines, grading/credit impacts, and available support/resources.
- In Helpful Definitions: define educational terms, programs, acronyms, and administrative processes.

Education text:
${text}`;

    /* ------------------------------- NEW: nutrition ------------------------------ */
    case "nutrition":
      return `You are a nutrition explainer helping people understand foods, labels, and dietary guidance.

${baseIntro}

Domain guidance (NUTRITION):
- In Main Points: highlight serving size, calories per serving, macronutrients (protein, carbs, fat), added sugars, sodium, fiber, notable vitamins/minerals (%DV), and any allergens/additives. Call out high/low red flags.
- If relevant, end with "- Example: …" showing how someone would use this info in a day.
- In Helpful Definitions: define terms like "% Daily Value", "added sugars", "saturated fat", "trans fat", "fiber", "ultra-processed", "net carbs", "complete protein", and any specialized terms mentioned. For any common/important term previously mentioned, whether in the generated "main points" earlier or in the inputted text, recommend the official VERIFIED FDA/government health guideline suggestion **NUMERICAL** suggested daily value/intake if applicable, such as BUT NOT LIMITED TO "Recommended daily intake of vitamin C: adult men need ~90 mg and adult women need about ~75 mg".

Nutrition text:
${text}`;

    default: // general
      return `You are a plain-language explainer helping people understand complex text.

${baseIntro}

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

// Normalize header lines to clean anchors (no trailing punctuation/colons/etc.)
function normalizeHeaders(s) {
  let out = String(s || '');

  // Force exact header lines if variants exist
  out = out.replace(/^\s*1\.\s*Summary.*$/m, '1. Summary');
  out = out.replace(/^\s*2\.\s*Main\s*Points.*$/m, '2. Main Points');
  out = out.replace(/^\s*3\.\s*Helpful\s*Definitions.*$/m, '3. Helpful Definitions');

  // If still missing, append with N/A to ensure anchors exist
  if (!/^\s*1\.\s*Summary\s*$/m.test(out)) out = `1. Summary\n${out}`.trim();
  if (!/^\s*2\.\s*Main Points\s*$/m.test(out)) out += `\n\n2. Main Points\nN/A`;
  if (!/^\s*3\.\s*Helpful Definitions\s*$/m.test(out)) out += `\n\n3. Helpful Definitions\nN/A`;

  return out;
}

// Ensure "2. Main Points" body uses hyphen bullets
function ensureBulletsInMainPoints(text) {
  const src = String(text || '');

  const sec2Header = src.match(/^\s*2\.\s*Main Points\s*$/m);
  if (!sec2Header) return src;

  const startIdx = sec2Header.index + sec2Header[0].length;
  const afterSec2 = src.slice(startIdx);
  const nextHeader = afterSec2.match(/^\s*3\.\s*Helpful Definitions\s*$/m);
  const sec2BodyEnd = nextHeader ? startIdx + nextHeader.index : src.length;

  const before = src.slice(0, startIdx);
  const body   = src.slice(startIdx, sec2BodyEnd);
  const after  = src.slice(sec2BodyEnd);

  const raw = body.replace(/\r\n/g, '\n').trim();
  if (!raw || /^N\/A$/i.test(raw)) return src;

  // Already bullets?
  if (/^\s*-\s+\S/m.test(raw)) return src;

  // Normalize weird bullet symbols to hyphens first
  let norm = raw
    .replace(/^\s*[•–—]\s+/gm, '- ')
    .replace(/\s+•\s+/g, '\n- ')
    .replace(/\s+[–—]\s+/g, '\n- ');

  // Try line split; if only one long line, split by sentences
  let items = norm
    .split(/\n+/)
    .map(s => s.trim())
    .filter(Boolean);

  if (items.length <= 1) {
    items = norm
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+(?=[A-Z(])/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  if (items.length === 0) return src;

  // Prefix each with "- "
  const bulletized = '\n' + items.map(l => (l.startsWith('- ') ? l : `- ${l}`)).join('\n') + '\n';
  return before + bulletized + after;
}

/* ----------------------------------- POST ---------------------------------- */
export async function POST(req) {
  try {
    // ACCEPT level (NEW)
    const { text, domain, level } = await req.json().catch(() => ({}));
    if (!text || typeof text !== 'string') {
      return Response.json({ error: 'Missing "text" string.' }, { status: 400 });
    }

    // PASS level to prompt builder (NEW)
    const prompt = getPrompt(domain, text, level);

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        temperature: 0,
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

Never add extra sections (e.g., "Key Definitions", "Example" as a standalone section). Never repeat or bold the section titles inside the bodies. If a section is empty, output "N/A".`,
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    const raw = await openaiRes.text();
    const data = safeJsonParse(raw);
    if (!openaiRes.ok || !data) {
      console.error('OpenAI error:', openaiRes.status, raw);
      return Response.json(
        { error: 'Upstream model error', detail: raw?.slice(0, 2000) },
        { status: 502 }
      );
    }

    // 1) Model output
    let simplified = data?.choices?.[0]?.message?.content || '';

    // 2) Normalize headers to guaranteed clean anchors
    simplified = normalizeHeaders(simplified);

    // 3) Enforce hyphen bullets in "2. Main Points"
    simplified = ensureBulletsInMainPoints(simplified);

    return Response.json({ simplified });
  } catch (err) {
    console.error('API route failed:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
