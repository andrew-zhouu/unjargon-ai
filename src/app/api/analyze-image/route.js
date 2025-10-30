// app/api/analyze-image/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { rateLimit, getClientIp } from '@/lib/rateLimiter';
import { NextResponse } from 'next/server';

/** ~3 MB cap for both images and PDFs (base64 decoded) */
const MAX_BYTES = 3_000_000;

/** Allowed MIME types */
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

function isAllowedMime(m) {
  return ALLOWED_MIME.has((m || '').toLowerCase());
}

function jsonRes(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/** Best-effort estimator for data:...;base64,.... sizes */
function estimateDataUrlBytes(dataUrl) {
  const b64 = (dataUrl || '').split(',')[1] || '';
  if (!b64) return 0;
  let bytes = Math.floor(b64.length * 0.75);
  if (b64.endsWith('==')) bytes -= 2;
  else if (b64.endsWith('=')) bytes -= 1;
  return bytes;
}

/* -------------------------- maintenance + rate-limit ------------------------- */

function maintenanceGuard() {
  if (process.env.MAINTENANCE_MODE === 'true') {
    const msg = process.env.MAINTENANCE_MESSAGE || 'Service temporarily unavailable.';
    return jsonRes(503, { error: 'Under maintenance', detail: msg });
  }
  return null;
}

// tiny in-memory limiter (per-node)
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

/* ------------------------------- prompting ---------------------------------- */

function levelStyle(level = 'intermediate') {
  switch ((level || '').toLowerCase()) {
    case 'beginner':
      return 'Write for a beginner. Use short sentences, simple words, and a friendly tone.';
    case 'advanced':
      return 'Write at an adult college-educated level. Be concise and precise, explain terms briefly.';
    case 'professional':
      return 'Write for professional/PhD readers. Be technically rigorous and precise.';
    case 'intermediate':
    default:
      return 'Write at a clear high-school level. Be approachable and explain key terms briefly.';
  }
}

function imageIntro(level) {
  return `
${levelStyle(level)}

Please describe what you can infer from the image using EXACTLY these three sections:

1. Summary – A concise plain-English overview of what the image shows.
2. Main Points – Bullet the major takeaways using "- " (facts, counts, notable elements, implications). If you include an example, make it the LAST bullet and prefix it with "Example:".
3. Helpful Definitions – Define **every** important term or concept in the form "**Term**: definition".

Constraints:
- Output MUST contain exactly these three numbered headers (no bolding the headers, no colons on the header line).
- Do NOT add extra sections or rename sections.
- If a section is empty, write "N/A".
`.trim();
}

function pdfIntro(level) {
  return `
${levelStyle(level)}

Please simplify the following PDF content using EXACTLY these three sections:

1. Summary – Concise overview of the document.
2. Main Points – Bullet major takeaways using "- ".
3. Helpful Definitions – "**Term**: definition".

Constraints:
- Use exactly those three headers as written (no colons on the header line).
- If a section is empty, write "N/A".
`.trim();
}

/* --------------------------------- route ------------------------------------ */

export async function POST(req) {
  {
    const resp = maintenanceGuard();
    if (resp) return resp;
  }
  {
    const resp = rateLimitGuard(req);
    if (resp) return resp;
  }

  try {
    // Single parse of JSON body (fixes duplicate/invalid destructures)
    const body = await req.json().catch(() => ({}));
    let { imageUrl, dataUrl, pdfText, level } = body || {};

    // Accept common PDF aliases your client might send
    const pdfDataUrl = body.pdfDataUrl ?? null;
    const pdfUrl     = body.pdfUrl ?? null;
    const fallbackUrl = body.url ?? body.fileUrl ?? null;

    // Normalize into the two canonical fields used below
    dataUrl  = dataUrl  || pdfDataUrl || null;
    imageUrl = imageUrl || pdfUrl || fallbackUrl || null;


    if (!imageUrl && !dataUrl && !pdfText) {
      return jsonRes(400, { error: 'Missing imageUrl or dataUrl or pdfText' });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return jsonRes(500, { error: 'Server missing OPENAI_API_KEY' });
    }

    // Prefer dataUrl (client-provided bytes) for reliability
    let dataUrlStr = dataUrl || null;
    let mimeFromDataUrl = null;

    // If we got a data URL, validate type & size immediately
    if (dataUrlStr) {
      // extract mime, e.g., data:application/pdf;base64,...
      mimeFromDataUrl = (dataUrlStr.match(/^data:([^;]+);base64,/) || [])[1] || '';
      if (!isAllowedMime(mimeFromDataUrl)) {
        return jsonRes(415, { error: 'Unsupported file type', detail: 'Allowed: JPG, JPEG, PNG, WEBP, PDF.' });
      }
      const approxBytes = estimateDataUrlBytes(dataUrlStr);
      if (approxBytes > MAX_BYTES) {
        return jsonRes(413, {
          error: 'File too large',
          detail: `Max ${(MAX_BYTES / 1024 / 1024).toFixed(1)} MB. Received ~${(approxBytes / 1024 / 1024).toFixed(2)} MB.`,
        });
      }
    }

    // If only imageUrl is provided, fetch & convert to data URL
    if (!dataUrlStr && imageUrl) {
      try {
        const imgRes = await fetch(imageUrl, { cache: 'no-store' });

        if (!imgRes.ok) {
          const t = await imgRes.text().catch(() => '');
          return jsonRes(400, {
            error: `Failed to download file (${imgRes.status})`,
            detail: t.slice(0, 500),
          });
        }

        const lenHeader = imgRes.headers.get('content-length');
        if (lenHeader && Number(lenHeader) > MAX_BYTES) {
          return jsonRes(413, {
            error: 'File too large',
            detail: `Max ${(MAX_BYTES / 1024 / 1024).toFixed(1)} MB.`,
          });
        }

        const contentType = imgRes.headers.get('content-type') || 'application/octet-stream';
        if (!isAllowedMime(contentType)) {
          return jsonRes(415, { error: 'Unsupported file type', detail: 'Allowed: JPG, JPEG, PNG, WEBP, PDF.' });
        }

        const ab = await imgRes.arrayBuffer();
        const buf = Buffer.from(ab);

        if (buf.length > MAX_BYTES) {
          return jsonRes(413, {
            error: 'File too large',
            detail: `Max ${(MAX_BYTES / 1024 / 1024).toFixed(1)} MB. Received ~${(buf.length / 1024 / 1024).toFixed(2)} MB.`,
          });
        }

        dataUrlStr = `data:${contentType};base64,${buf.toString('base64')}`;
        mimeFromDataUrl = contentType;
      } catch (e) {
        return jsonRes(400, { error: 'Failed to fetch file URL', detail: String(e).slice(0, 300) });
      }
    }

    // At this point we have a validated dataUrlStr + mimeFromDataUrl.
    const isPdf = (mimeFromDataUrl || '').toLowerCase() === 'application/pdf';

    // Secondary per-IP limiter (your existing util)
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

// If client already sent extracted PDF text, stream a TEXT completion directly.
if (pdfText && typeof pdfText === 'string' && pdfText.trim()) {
  const prompt = pdfIntro(level);
  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      stream: true,
      messages: [
        { role: 'system', content: 'You output exactly 3 sections: 1. Summary 2. Main Points 3. Helpful Definitions.' },
        { role: 'user', content: `${prompt}\n\n---\n\n${pdfText.slice(0, 15000)}` },
      ],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const raw = await upstream.text().catch(() => '');
    console.error('OpenAI stream error (pdfText):', upstream.status, raw);
    return jsonRes(502, { error: 'Upstream model error', detail: raw.slice(0, 2000) });
  }

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
          } catch {}
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
}


    // If PDF: extract text and stream a TEXT completion
      // If PDF: extract text and stream a TEXT completion
// If PDF: expect client to send extracted text (pdfText) to avoid server bundling issues
if (isPdf) {
  const pdfText = (body.pdfText || '').trim();
  if (!pdfText) {
    return jsonRes(422, {
      error: 'Missing pdfText',
      detail: 'Send { pdfText } with the request body for application/pdf.',
    });
  }

  const prompt = pdfIntro(level);
  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      stream: true,
      messages: [
        { role: 'system', content: 'You output exactly 3 sections: 1. Summary 2. Main Points 3. Helpful Definitions.' },
        { role: 'user', content: `${prompt}\n\n---\n\n${pdfText.slice(0, 15000)}` },
      ],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const raw = await upstream.text().catch(() => '');
    console.error('OpenAI stream error (pdf):', upstream.status, raw);
    return jsonRes(502, { error: 'Upstream model error', detail: raw.slice(0, 2000) });
  }

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
          } catch {}
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
}



    // Else: IMAGE flow (vision)
    const prompt = imageIntro(level);
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        stream: true,
        messages: [
          {
            role: 'system',
            content:
              'You are an assistant that describes images and outputs in EXACTLY 3 sections: 1. Summary 2. Main Points 3. Helpful Definitions.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrlStr } },
            ],
          },
        ],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const raw = await upstream.text().catch(() => '');
      console.error('OpenAI stream error (image):', upstream.status, raw);
      return jsonRes(502, { error: 'Upstream model error', detail: raw.slice(0, 2000) });
    }

    // Stream SSE → plain text to client
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
              if (delta) {
                await writer.write(encoder.encode(delta));
              }
            } catch {
              // ignore heartbeats
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
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('analyze-image route failed:', err);
    return jsonRes(500, { error: 'Internal error' });
  }
}

export async function GET() {
  return jsonRes(405, { error: 'Method not allowed' });
}
