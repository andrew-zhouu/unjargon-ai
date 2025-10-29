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
    // Accept either a direct data URL or a fetchable image URL
    const { imageUrl, dataUrl: dataUrlIn, level } = await req.json().catch(() => ({}));
    if (!imageUrl && !dataUrlIn) {
      return NextResponse.json({ error: 'Missing imageUrl or dataUrl' }, { status: 400 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ error: 'Server missing OPENAI_API_KEY' }, { status: 500 });
    }

    // Build the final data URL we’ll send to the model
    let finalDataUrl = dataUrlIn || null;

    // If only a URL was provided, fetch and convert to data URL here
    if (!finalDataUrl && imageUrl) {
      const imgRes = await fetch(imageUrl);
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
      finalDataUrl = `data:${contentType};base64,${buf.toString('base64')}`;
    }

    // Lightweight validation if client sent a data URL
    if (finalDataUrl && !finalDataUrl.startsWith('data:')) {
      return NextResponse.json({ error: 'Invalid dataUrl format' }, { status: 400 });
    }

    const prompt = baseIntro(level);

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: `You are an assistant that describes images and outputs in EXACTLY 3 sections:
1. Summary
2. Main Points
3. Helpful Definitions

Follow the same strict formatting rules as instructed by the user.`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: finalDataUrl } },
            ],
          },
        ],
      }),
    });

    const raw = await resp.text();
    let data = null;
    try { data = JSON.parse(raw); } catch {}

    if (!resp.ok || !data) {
      console.error('analyze-image upstream error:', resp.status, raw);
      return NextResponse.json(
        { error: 'Upstream model error', detail: raw?.slice(0, 2000) },
        { status: 502 }
      );
    }

    let simplified = data?.choices?.[0]?.message?.content || '';

    // Ensure exact anchors for your OutputBox
    if (!/^\s*1\.\s*Summary\s*$/m.test(simplified)) {
      simplified = `1. Summary\n${simplified}`.trim();
    }
    if (!/^\s*2\.\s*Main Points\s*$/m.test(simplified)) {
      simplified += `\n\n2. Main Points\nN/A`;
    }
    if (!/^\s*3\.\s*Helpful Definitions\s*$/m.test(simplified)) {
      simplified += `\n\n3. Helpful Definitions\nN/A`;
    }

    return NextResponse.json({ simplified });
  } catch (err) {
    console.error('analyze-image route failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
