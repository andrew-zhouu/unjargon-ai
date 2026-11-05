// Parses Unjargon's three-section plain-text output into a reading structure.
//
// The model is prompted to return:
//   1. Summary
//   2. Main Points        ("- " bullets; an optional last bullet prefixed "Example:")
//   3. Helpful Definitions ("- **Term**: definition")
//
// Parsing is tolerant of partial (streaming) output and of small format drift.
// If the headers can't be found, `structured` is false and callers should render
// the raw text as-is.

const HEADER_RE =
  /^[ \t]*(?:#{1,6}[ \t]*)?\**[ \t]*(?:\d+[.)][ \t]*)?\**[ \t]*(summary|main[ \t]*points|(?:helpful|key)[ \t]*definitions)[ \t]*\**[ \t]*:?[ \t]*\**[ \t]*$/gim;

const BULLET_RE = /^\s*(?:[-•*–—]|\d+[.)])\s+/;
const EXAMPLE_RE = /^\*{0,2}\s*(?:for\s+)?example\s*\*{0,2}\s*[:\-–—]\s*\*{0,2}\s*/i;

export function isNA(s) {
  return /^\s*(?:n\/a|none\.?)?\s*$/i.test(String(s || ''));
}

function keyFor(label) {
  const l = label.toLowerCase();
  if (l.startsWith('summary')) return 'summary';
  if (l.startsWith('main')) return 'points';
  return 'definitions';
}

function splitSections(raw) {
  const matches = [...raw.matchAll(HEADER_RE)];
  if (matches.length === 0) return null;

  const bodies = { summary: '', points: '', definitions: '' };
  const seen = new Set();
  const preamble = raw.slice(0, matches[0].index).trim();

  matches.forEach((m, i) => {
    const key = keyFor(m[1]);
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : raw.length;
    const body = raw.slice(start, end).trim();
    bodies[key] = seen.has(key) ? `${bodies[key]}\n${body}`.trim() : body;
    seen.add(key);
  });

  return { preamble, bodies, seen };
}

function parsePoints(body) {
  const lines = String(body || '').split(/\r?\n/);
  const hasBullets = lines.some((l) => BULLET_RE.test(l));
  const items = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t || isNA(t)) continue;
    if (hasBullets) {
      if (BULLET_RE.test(t) || items.length === 0) {
        items.push(t.replace(BULLET_RE, '').trim());
      } else {
        // continuation of the previous bullet
        items[items.length - 1] += ` ${t}`;
      }
    } else {
      items.push(t);
    }
  }

  const points = [];
  const examples = [];
  for (const item of items) {
    if (EXAMPLE_RE.test(item)) {
      const ex = item.replace(EXAMPLE_RE, '').trim();
      if (ex) examples.push(ex);
    } else {
      points.push(item);
    }
  }
  return { points, examples };
}

function cleanTerm(t) {
  let s = String(t || '').replace(/^\*+|\*+$/g, '').trim();
  // Strip wrapping brackets only when they enclose the whole term.
  if (/^\[[^\]]*\]$/.test(s) || /^\([^)]*\)$/.test(s)) s = s.slice(1, -1).trim();
  return s;
}

function parseDefinitions(body) {
  const defs = [];
  const notes = [];
  for (const line of String(body || '').split(/\r?\n/)) {
    const raw = line.trim();
    if (!raw || isNA(raw)) continue;
    const t = raw.replace(BULLET_RE, '').trim();

    let m =
      t.match(/^\*\*(.+?)\*\*\s*[:：]\s*(.*)$/) || // **Term**: def
      t.match(/^\*\*(.+?)[:：]\*\*\s*(.*)$/); // **Term:** def
    if (!m) {
      const colon = t.indexOf(':');
      if (colon > 0 && colon <= 80) m = [t, t.slice(0, colon), t.slice(colon + 1)];
    }
    if (!m) {
      const dash = t.match(/^(.{1,80}?)\s+[—–-]\s+(.+)$/);
      if (dash) m = dash;
    }

    if (m) {
      const term = cleanTerm(m[1]);
      const definition = String(m[2] || '').trim();
      if (term) {
        defs.push({ term, definition });
        continue;
      }
    }

    // Unparseable line: treat as a continuation of the previous definition.
    if (defs.length > 0 && !BULLET_RE.test(raw)) {
      defs[defs.length - 1].definition += ` ${t}`;
    } else {
      notes.push(t);
    }
  }
  return { definitions: defs, notes };
}

export function parseOutput(text) {
  const raw = String(text || '');
  const split = splitSections(raw);

  if (!split) {
    return { structured: false, raw };
  }

  const { preamble, bodies, seen } = split;
  const { points, examples } = parsePoints(bodies.points);
  const { definitions, notes } = parseDefinitions(bodies.definitions);

  return {
    structured: true,
    raw,
    preamble,
    summary: isNA(bodies.summary) ? '' : bodies.summary,
    points,
    examples,
    definitions: definitions.map((d, i) => ({ ...d, id: i })),
    definitionNotes: notes,
    seen: {
      summary: seen.has('summary'),
      points: seen.has('points'),
      definitions: seen.has('definitions'),
    },
  };
}

/* ---------------------------------------------------------------------------
   Inline formatting: **bold** and `code`. Single *asterisks* are dropped
   (no decorative italics on the reading surface).
--------------------------------------------------------------------------- */

export function tokenizeInline(text) {
  const out = [];
  const re = /\*\*([^*]+?)\*\*|__([^_]+?)__|`([^`]+?)`/g;
  let last = 0;
  let m;
  const s = String(text || '');
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ type: 'text', text: s.slice(last, m.index) });
    if (m[3] != null) out.push({ type: 'code', text: m[3] });
    else out.push({ type: 'strong', text: m[1] ?? m[2] });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ type: 'text', text: s.slice(last) });
  return out.map((t) =>
    t.type === 'text' ? { ...t, text: t.text.replace(/(^|[^\w*])\*(?!\s)([^*\n]+?)\*(?!\w)/g, '$1$2') } : t
  );
}

/* ---------------------------------------------------------------------------
   Term ↔ main point linking.

   A definition is linked to a main point ONLY when the defined term (or its
   base form / parenthetical acronym) literally appears in that point's text.
   Nothing is inferred: unmatched definitions simply live in the glossary.
--------------------------------------------------------------------------- */

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function termCandidates(term) {
  const cands = new Set();
  const t = term.replace(/\s+/g, ' ').trim();
  if (t) cands.add(t);
  const paren = t.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (paren) {
    if (paren[1].trim()) cands.add(paren[1].trim());
    if (paren[2].trim()) cands.add(paren[2].trim());
  }
  return [...cands].filter((c) => c.length >= 2).sort((a, b) => b.length - a.length);
}

function termRegex(candidate) {
  const isAcronym = /^[A-Z0-9&.\-]{2,6}$/.test(candidate);
  const body = escapeRe(candidate).replace(/\\? /g, '\\s+');
  const plural = isAcronym ? 's?' : '(?:e?s)?';
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}${plural}(?![\\p{L}\\p{N}])`, isAcronym ? 'u' : 'iu');
}

/**
 * Returns:
 *   pointTokens: Array<Array<token>> where a token may be { type:'term', defId, note, text }
 *   notesByPoint: Array<Array<{ defId, note }>>
 *   noteFor: Map<defId, note number>
 */
export function linkTerms(points, definitions) {
  const matchers = definitions.map((d) => ({
    defId: d.id,
    res: termCandidates(d.term).map(termRegex),
  }));

  const noteFor = new Map();
  const notesByPoint = points.map(() => []);
  let counter = 0;

  const pointTokens = points.map((point, pi) => {
    let tokens = tokenizeInline(point);

    for (const { defId, res } of matchers) {
      if (noteFor.has(defId)) continue;

      let done = false;
      const next = [];
      for (const tok of tokens) {
        if (done || (tok.type !== 'text' && tok.type !== 'strong')) {
          next.push(tok);
          continue;
        }
        let hit = null;
        for (const re of res) {
          const m = re.exec(tok.text);
          if (m && (!hit || m.index < hit.index)) hit = { index: m.index, len: m[0].length };
        }
        if (!hit) {
          next.push(tok);
          continue;
        }
        counter += 1;
        noteFor.set(defId, counter);
        notesByPoint[pi].push({ defId, note: counter });
        const before = tok.text.slice(0, hit.index);
        const word = tok.text.slice(hit.index, hit.index + hit.len);
        const after = tok.text.slice(hit.index + hit.len);
        if (before) next.push({ type: tok.type, text: before });
        next.push({ type: 'term', defId, note: counter, text: word, strong: tok.type === 'strong' });
        if (after) next.push({ type: tok.type, text: after });
        done = true;
      }
      tokens = next;
    }
    return tokens;
  });

  // Renumber notes in reading order (matching ran in definition order).
  let n = 0;
  noteFor.clear();
  pointTokens.forEach((tokens, pi) => {
    notesByPoint[pi] = [];
    for (const tok of tokens) {
      if (tok.type !== 'term') continue;
      n += 1;
      tok.note = n;
      noteFor.set(tok.defId, n);
      notesByPoint[pi].push({ defId: tok.defId, note: n });
    }
  });

  return { pointTokens, notesByPoint, noteFor };
}
