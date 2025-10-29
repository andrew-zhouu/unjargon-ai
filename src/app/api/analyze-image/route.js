// app/api/analyze-image/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

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

function baseIntro(level) {
  return `
${levelStyle(level)}

Please rewrite what you can infer from the image using EXACTLY these three sections:

1. Summary – A concise plain-English overview of what the image shows.
2. Main Points – Bullet the major takeaways using "- " (facts, counts, notable elements, implications). If you include an example, make it the LAST bullet and prefix it with "Example:".
3. Helpful Definitions – Define **every** important term or concept in the form "**Term**: definition".

Constraints:
- Output MUST contain exactly these three numbered headers (no bolding the headers, no colons on the header line).
- Do NOT add extra sections or rename sections.
- If a section is empty, write "N/A".
`.trim();
}

export async function POST(req) {
  try {
    const { imageUrl, dataUrl, level } = await req.json().catch(() => ({}));
    if (!imageUrl && !dataUrl) {
      return NextResponse.json({ error: 'Missing imageUrl or dataUrl' }, { status: 400 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ error: 'Server missing OPENAI_API_KEY' }, { status: 500 });
    }

    // Prefer client-provided data URL (fastest, no S3 auth issues)
    let imgDataUrl = dataUrl || null;

    // If only imageUrl is provided, try to fetch & convert to data URL
    if (!imgDataUrl && imageUrl) {
      try {
        const imgRes = await fetch(imageUrl, { cache: 'no-store' });
        if (!imgRes.ok) {
          const t = await imgRes.text().catch(() => '');
          return NextResponse.json(
            { error: `Failed to download image (${imgRes.status})`, detail: t.slice(0, 500) },
            { status: 400 }
          );
        }
        const contentType = imgRes.headers.get('content-type') || 'application/octet-stream';
        const ab = await imgRes.arrayBuffer();
        const buf = Buffer.from(ab);
        if (buf.length > 20 * 1024 * 1024) {
          return NextResponse.json({ error: 'Image too large (>20MB)' }, { status: 400 });
        }
        imgDataUrl = `data:${contentType};base64,${buf.toString('base64')}`;
      } catch (e) {
        return NextResponse.json(
          { error: 'Failed to fetch image URL', detail: String(e).slice(0, 300) },
          { status: 400 }
        );
      }
    }

    const prompt = baseIntro(level);

    // 🔹 Request a STREAM from OpenAI
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
            content: `You are an assistant that describes images and outputs in EXACTLY 3 sections:
1. Summary
2. Main Points
3. Helpful Definitions

Follow the strict formatting rules in the user's message.`,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              // send the image as a data URL (most reliable)
              { type: 'image_url', image_url: { url: imgDataUrl } },
            ],
          },
        ],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const raw = await upstream.text().catch(() => '');
      console.error('OpenAI stream error (image):', upstream.status, raw);
      return NextResponse.json({ error: 'Upstream model error', detail: raw.slice(0, 2000) }, { status: 502 });
    }

    // 🔹 Convert SSE to plain text streaming (same pattern as /simplify)
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
              // ignore non-JSON heartbeats
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
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
