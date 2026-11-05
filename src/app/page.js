'use client';

import { useEffect, useRef, useState } from 'react';
import { AlignLeft, Check, ChevronDown, Columns2, Copy, FileText, Menu, Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Composer from '@/components/Composer';
import CompareView from '@/components/CompareView';
import DomainSelect, { DOMAINS } from '@/components/DomainSelect';
import LevelSelect from '@/components/LevelSelect';
import OutputBox from '@/components/OutputBox';
import HistoryPanel, { BrandMark } from '@/components/HistoryPanel';
import { EXAMPLES } from '@/lib/examples';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [text, setText] = useState('');
  const [domain, setDomain] = useState('general');
  const [level, setLevel] = useState('intermediate');
  const [simplifiedText, setSimplifiedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [showTip, setShowTip] = useState(false);
  const [serviceNotice, setServiceNotice] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);


  // NEW: hold uploaded attachments (images OR pdfs)
  const [attachments, setAttachments] = useState([]);

  // Redesign: reading-view state
  const [resultMeta, setResultMeta] = useState({ domain: 'general', level: 'intermediate' });
  const [resultSource, setResultSource] = useState({ text: '', fileName: null });
  const [sourceOpen, setSourceOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);

  const MAX_CHARS = 10_000;

  function clearErrorSoon() {
    setTimeout(() => setErrorMsg(null), 6000); // clears after ~6 seconds
  }


  useEffect(() => {
    // show once per browser
    if (typeof window !== 'undefined' && !localStorage.getItem('unjargon_tip_seen')) {
      setShowTip(true);
    }
  }, []);

  function dismissTip() {
    try { localStorage.setItem('unjargon_tip_seen', '1'); } catch {}
    setShowTip(false);
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  async function showPreview(att) {
    if (!att) return;

    // If we have the original File, preview from local bytes (reliable & instant)
    if (att.file) {
      const dataUrl = await fileToDataUrl(att.file);
      setPreviewSrc(null);
      setTimeout(() => setPreviewSrc(`${dataUrl}`), 0);
      return;
    }

    // Fallback to signed/public URL with cache-buster so repeated clicks work
    const base = att.url || att.viewUrl || att.publicUrl;
    if (!base) return;
    const bust = `${base}${base.includes('?') ? '&' : '?'}t=${Date.now()}`;
    setPreviewSrc(null);
    setTimeout(() => setPreviewSrc(bust), 0);
  }

  // UPDATED: support images AND PDFs
  function handleUploaded(meta, file) {
    const mime = meta?.mime || file?.type || '';
    const isImage = mime.startsWith('image/');
    const isPdf = mime === 'application/pdf';
    if (!isImage && !isPdf) return; // ignore others (UploadBox already alerts)

    const blobUrl = file ? URL.createObjectURL(file) : null;

    setAttachments((prev) => [
      ...prev,
      {
        key: meta.key || meta.id,
        name: file?.name || meta.id,
        mime,
        size: meta.size,
        previewUrl: blobUrl || meta.viewUrl || null, // prefer blob for preview
        viewUrl: meta.viewUrl || null,               // keep presigned GET as fallback
        file,                                        // keep for analyze (dataURL)
      },
    ]);
  }

  // Stream a fetch Response into state, returning the full accumulated text
  async function streamIntoState(res, setState) {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!res.body) return ''; // nothing to stream

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '';

    // ensure box shows up instantly
    setState('');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      full += chunk;
      // live append to the UI
      setState(prev => (prev ? prev + chunk : chunk));
    }
    return full;
  }

function fixHelpfulDefinitionsFormatting(s) {
  let text = String(s || '');

  // --- 0) Normalize headers from PDFs (bold, colons, stray numbers) ---
  // Map any variant to a token first to avoid accidental replacements.
  text = text.replace(/^\s*\**\s*(?:\d+\.\s*)?summary\**\s*:?\s*$/gim, '__H1__');
  text = text.replace(/^\s*\**\s*(?:\d+\.\s*)?main\s*points\**\s*:?\s*$/gim, '__H2__');
  text = text.replace(/^\s*\**\s*(?:\d+\.\s*)?helpful\s*definitions\**\s*:?\s*$/gim, '__H3__');

  // Keep only the first occurrence of each token; drop any later duplicates.
  const firstH1 = text.indexOf('__H1__');
  const firstH2 = text.indexOf('__H2__');
  const firstH3 = text.indexOf('__H3__');
  if (firstH1 !== -1) {
    text = text.slice(0, firstH1 + 6) + text.slice(firstH1 + 6).replace(/__H1__/g, '');
  }
  if (firstH2 !== -1) {
    text = text.slice(0, firstH2 + 6) + text.slice(firstH2 + 6).replace(/__H2__/g, '');
  }
  if (firstH3 !== -1) {
    text = text.slice(0, firstH3 + 6) + text.slice(firstH3 + 6).replace(/__H3__/g, '');
  }

  // If any token is missing, just fall back to original text (don’t over-edit).
  if (firstH1 === -1 || firstH2 === -1 || firstH3 === -1) {
    // (Still try to fix definitions if we can find the original header)
    const h3 = text.match(/^\s*3\.\s*Helpful Definitions\s*$/m);
    if (!h3) return text;
  } else {
    // Rebuild with strict headers in the correct order
    const pre = text.slice(0, firstH1);
    const afterH1 = text.slice(firstH1 + 6);
    const iH2 = afterH1.indexOf('__H2__');
    const iH3 = afterH1.indexOf('__H3__');
    if (iH2 !== -1 && iH3 !== -1) {
      const summary = afterH1.slice(0, iH2).trim();
      const afterH2 = afterH1.slice(iH2 + 6);
      const mainPoints = afterH2.slice(0, afterH2.indexOf('__H3__')).trim();
      const defs = afterH2.slice(afterH2.indexOf('__H3__') + 6).trim();

      text =
        (pre ? pre.trimEnd() + '\n\n' : '') +
        '1. Summary\n' + (summary || 'N/A') + '\n\n' +
        '2. Main Points\n' + (mainPoints || 'N/A') + '\n\n' +
        '3. Helpful Definitions\n' + (defs || 'N/A');
    } else {
      // If we can’t confidently split, just swap tokens to strict headers and proceed.
      text = text
        .replace(/__H1__/g, '1. Summary')
        .replace(/__H2__/g, '2. Main Points')
        .replace(/__H3__/g, '3. Helpful Definitions');
    }
  }

  // --- 1) Now apply your original “Helpful Definitions” bullet/colon formatter ---
  const h3Line = text.match(/^\s*3\.\s*Helpful Definitions\s*$/m);
  if (!h3Line) return text;

  const startIdx = h3Line.index + h3Line[0].length;
  const tail = text.slice(startIdx);
  const nextHeader = tail.match(/^\s*\d+\.\s/m);
  const endIdx = nextHeader ? startIdx + nextHeader.index : text.length;

  const before = text.slice(0, startIdx);
  const body = text.slice(startIdx, endIdx);
  const after = text.slice(endIdx);

  const fixed = body
    .split('\n')
    .map((line) => {
      const raw = String(line || '').trim();
      if (!raw || /^N\/A$/i.test(raw)) return line;

      // remove leading bullet/numbering if present
      const noLead = raw
        .replace(/^(\u2022|•|\*|-)\s+/, '')
        .replace(/^\(?\d+\)?[.)]\s+/, '');

      // split on first colon; if none, accept en/em dash or hyphen as separator
      let term = '';
      let defn = '';
      const mColon = noLead.indexOf(':');
      if (mColon !== -1) {
        term = noLead.slice(0, mColon).trim().replace(/^[\[\(]+/, '').replace(/[\]\)]+$/, '');
        defn = noLead.slice(mColon + 1).trimStart();
      } else {
        const mDash = noLead.match(/^(.{1,120}?)\s*[—–-]\s+(.+)$/);
        if (!mDash) return line; // give up gracefully
        term = mDash[1].trim().replace(/^[\[\(]+/, '').replace(/[\]\)]+$/, '');
        defn = mDash[2].trim();
      }

      // wrap term with **...** if missing
      if (!/^\*\*.*\*\*$/.test(term)) {
        term = `**${term.replace(/^\*\*|\*\*$/g, '')}**`;
      }

      return `- ${term}: ${defn}`;
    })
    .join('\n');

  return before + '\n' + fixed + after;
}

  
  // ✅ Side-by-side toggle
  const [showSideBySide, setShowSideBySide] = useState(false);

  // ✅ Only allow compare if we have a simplified result
  const canCompare = Boolean(simplifiedText && simplifiedText.trim().length > 0);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('unjargn_chats')) || [];
    setChats(saved);
    if (saved.length > 0) setActiveChatId(saved[0].id);
  }, []);

  useEffect(() => {
    localStorage.setItem('unjargn_chats', JSON.stringify(chats));
  }, [chats]);

  const activeChat = chats.find((chat) => chat.id === activeChatId);

  async function handleSimplify(opts = {}) {
  // Re-runs from the reading view can override domain / level without waiting for state.
  const useDomain = opts.domain ?? domain;
  const useLevel = opts.level ?? level;

  // decide: prefer latest file (pdf or image); else simplify text
  const latest = attachments.slice().reverse().find(a => a.mime);
  const img = latest && latest.mime.startsWith('image/') ? latest : null;
  const pdf = latest && latest.mime === 'application/pdf' ? latest : null;

  if (!text.trim() && !img && !pdf) return;

  setLoading(true);
  setSimplifiedText('');
  setServiceNotice(null);
  setResultMeta({ domain: useDomain, level: useLevel });
  setResultSource({ text, fileName: (pdf || img)?.name || null });
  setSourceOpen(false);

  try {
    let res, raw, data, simplified, full;

    if (pdf) {
      // ---------- NEW: client-side PDF text extraction, then send { pdfText } ----------
      try {
        // 1) Read file bytes
        const ab = await pdf.file.arrayBuffer();

        // 2) Load pdf.js UMD in the browser (avoids ESM/CJS bundling quirks)
            if (!window.pdfjsLib) {
            await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            s.async = true;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
          });
        }
        const pdfjsLib = window.pdfjsLib; // exposed by the UMD script
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        // 3) Extract text (cap pages for speed)
        const doc = await pdfjsLib.getDocument({ data: ab }).promise;
        let textOut = '';
        const cap = Math.min(doc.numPages, 12);
        for (let i = 1; i <= cap; i++) {
          const page = await doc.getPage(i);
          const content = await page.getTextContent();
          textOut += content.items.map(it => it.str || '').join(' ') + '\n\n';
        }
        const pdfText = textOut.trim();

        if (!pdfText) throw new Error('No extractable text in PDF');

        // 4) Call your API with { pdfText, level }
        res = await fetch('/api/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfText, level: useLevel }),
        });

        if (res.ok && res.body) {
          full = await streamIntoState(res, setSimplifiedText);
          simplified = fixHelpfulDefinitionsFormatting(full);
          setSimplifiedText(simplified);
        } else {
          raw = await res.text();
          try { data = JSON.parse(raw); } catch {}
        }
      } catch (e) {
        console.error('pdf text extraction failed:', e);
        setSimplifiedText(`1. Summary
Request failed: Could not extract text from the PDF.

2. Main Points
- Make sure the PDF has selectable text (not just scanned images).

3. Helpful Definitions
**Scanned PDF**: A PDF that is just images of pages without embedded text.`);
        setLoading(false);
        return;
      }
      // ---------- END PDF BRANCH ----------
    } else if (img) {
      // Prefer bytes (data URL)
      const toDataUrl = (file) =>
        new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = reject;
          r.readAsDataURL(file);
        });
      const dataUrl = img.file ? await toDataUrl(img.file) : null;

      res = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          dataUrl ? { dataUrl, level: useLevel } : { imageUrl: img.previewUrl, level: useLevel }
        ),
      });

      if (res.ok && res.body) {
        full = await streamIntoState(res, setSimplifiedText);
        simplified = fixHelpfulDefinitionsFormatting(full);
        setSimplifiedText(simplified);
      } else {
        raw = await res.text();
        try { data = JSON.parse(raw); } catch {}
      }
    } else {
      // text simplify (try streaming first)
      const cleanText = (text ?? '').toString().trim();
      if (!cleanText) {
        setSimplifiedText(`1. Summary
Missing text. Please type something to simplify.

2. Main Points
N/A

3. Helpful Definitions
N/A`);
        setLoading(false);
        return;
      }
           // Helpers
     const sendJson = (payload) =>
       fetch('/api/simplify', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(payload),
       });
     const sendPlain = (content) =>
       fetch('/api/simplify', {
         method: 'POST',
         headers: { 'Content-Type': 'text/plain; charset=utf-8' },
         body: content,
       });

     // Try #1: full JSON (common for many implementations)
     res = await sendJson({ text: cleanText, domain: useDomain, level: useLevel });
     if (!res.ok) {
       // Try #2: minimal JSON body
       res = await sendJson({ text: cleanText });
       if (!res.ok) {
         // Try #3: raw text/plain
         res = await sendPlain(cleanText);
       }
     }


      if (res.ok && res.body) {
        full = await streamIntoState(res, setSimplifiedText);
        simplified = fixHelpfulDefinitionsFormatting(full);
        setSimplifiedText(simplified);
      } else {
  // text simplify (robust multi-shape fallback)
  const cleanText = (text ?? '').toString().trim();
  if (!cleanText) {
    setSimplifiedText(`1. Summary
Missing text. Please type something to simplify.

2. Main Points
N/A

3. Helpful Definitions
N/A`);
    setLoading(false);
    return;
  }

// hard stop for long inputs (client-side)
if (cleanText.length > MAX_CHARS) {
  const over = cleanText.length.toLocaleString();
  const lim  = MAX_CHARS.toLocaleString();

  // banner (same style as your file-size notice)
    setErrorMsg(`Text too long (${over} characters). Maximum allowed is ${lim}.`);
    clearErrorSoon();


  // friendly 3-section message in the output box
  setSimplifiedText(`1. Summary
Your input is too long to simplify in one go. The limit is ${lim} characters, but your text has ${over}. Please shorten it or split it into parts.

2. Main Points
- Maximum allowed: ${lim} characters
- Your input: ${over} characters
- Tip: Split the text into sections (e.g., by headings) and simplify each one
- Example: Copy the first 8–9k characters, simplify, then continue with the next chunk

3. Helpful Definitions
**Character limit**: The maximum length of text the tool accepts in a single request.`);

  setLoading(false);
  return; // ⟵ do NOT call /api/simplify
}


  // helpers
  const j = (obj) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj),
  });
  const t = (s) => ({
    method: 'POST',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    body: s,
  });

  // try a series of bodies your API might accept
  const attempts = [
    j({ text: cleanText, domain: useDomain, level: useLevel }),   // common shape
    j({ text: cleanText }),                  // minimal JSON
    j({ content: cleanText }),               // alt key
    j({ input: cleanText }),                 // alt key
    t(cleanText),                            // raw text/plain
  ];

  let lastErrText = '';
  for (const init of attempts) {
    res = await fetch('/api/simplify', init);
    if (res.ok && res.body) break;
    lastErrText = await res.text().catch(() => '') || `HTTP ${res.status}`;
  }

  if (res.ok && res.body) {
    full = await streamIntoState(res, setSimplifiedText);
    simplified = fixHelpfulDefinitionsFormatting(full);
    setSimplifiedText(simplified);
  } else {
    setSimplifiedText(`1. Summary
Request failed: ${lastErrText || 'Bad request'}

2. Main Points
N/A

3. Helpful Definitions
N/A`);
    setLoading(false);
    return;
  }
}
    }
    if (!res.ok) {
      if (res.status === 503) {
        setSimplifiedText(`1. Summary
Service is under maintenance. Please try again shortly.

2. Main Points
N/A

3. Helpful Definitions
N/A`);
        setServiceNotice('Unjargon AI is currently under maintenance. Please try again soon.');
        return;
      }

      if (res.status === 429) {
        setSimplifiedText(`1. Summary
You’re making requests too quickly. Please wait a moment and try again.

2. Main Points
N/A

3. Helpful Definitions
N/A`);
        setServiceNotice('You’ve hit the rate limit. Please wait a bit and try again.');
        return;
      }

      // fallback for other error codes
      const errText = raw ?? (await res.text());
      setSimplifiedText(`1. Summary
Request failed: ${errText || 'Unknown error'}

2. Main Points
N/A

3. Helpful Definitions
N/A`);
      return;
    }

    if (!full) {
      // JSON shape: { simplified: "..." }
      simplified = (data && data.simplified) || 'No response';
      simplified = fixHelpfulDefinitionsFormatting(simplified);
      setSimplifiedText(simplified);
      full = simplified; // for history
    }

    // Save to history. If no chat is active yet (first visit), start one so
    // the result isn't lost.
    const timestamp = new Date().toISOString();
    const fileName = (pdf || img)?.name || null;
    const entry = {
      id: Date.now().toString(),
      text,
      domain: useDomain,
      level: useLevel,
      result: full,
      timestamp,
      ...(fileName ? { fileName } : {}),
    };
    const targetId = chats.some((c) => c.id === activeChatId) ? activeChatId : uuidv4();
    if (targetId !== activeChatId) setActiveChatId(targetId);
    setChats((prev) => {
      const base = prev.some((c) => c.id === targetId)
        ? prev
        : [{ id: targetId, title: '', history: [], createdAt: timestamp }, ...prev];
      return base.map((chat) =>
        chat.id === targetId
          ? {
              ...chat,
              history: [...chat.history, entry],
              title: chat.title || text.slice(0, 30) || fileName || '',
            }
          : chat
      );
    });
  } catch (err) {
    console.error('simplify/analyze caught exception:', err);
    setSimplifiedText(`1. Summary
Internal error

2. Main Points
N/A

3. Helpful Definitions
N/A`);
  } finally {
    setLoading(false);
  }
}




  const handleNewChat = () => {
    const newChat = { id: uuidv4(), title: '', history: [], createdAt: new Date().toISOString() };
    setChats([newChat, ...chats]);
    setActiveChatId(newChat.id);
    setText('');
    setSimplifiedText('');
    setAttachments([]);       // reset attachments for a fresh chat
    setShowSideBySide(false); // reset compare view for a fresh chat
    setPreviewSrc(null);
    setSourceOpen(false);
    setResultSource({ text: '', fileName: null });
  };

  const handleSelectChat = (id) => {
    setActiveChatId(id);
    const chat = chats.find((c) => c.id === id);
    if (chat?.history.length > 0) {
      const last = chat.history[chat.history.length - 1];
      setText(last.text);
      setDomain(last.domain);
      setLevel(last.level || 'intermediate');
      setSimplifiedText(last.result);
      setResultMeta({ domain: last.domain || 'general', level: last.level || 'intermediate' });
      setResultSource({ text: last.text || '', fileName: last.fileName || null });
    } else {
      setText('');
      setSimplifiedText('');
      setResultSource({ text: '', fileName: null });
    }
    setSourceOpen(false);
    if (!(chat?.history?.length > 0)) setShowSideBySide(false);
  };

  const handleDeleteChat = (id) => {
    const updated = chats.filter((chat) => chat.id !== id);
    setChats(updated);
    if (id === activeChatId) {
      setShowSideBySide(false);
      if (updated.length > 0) setActiveChatId(updated[0].id);
      else {
        setActiveChatId(null);
        setText('');
        setSimplifiedText('');
        setAttachments([]);
        setPreviewSrc(null);
      }
    }
  };

  const handleRenameChat = (id, newTitle = null) => {
    if (!newTitle) newTitle = prompt('Enter new chat title:');
    if (!newTitle) return;
    const updated = chats.map((chat) =>
      chat.id === id ? { ...chat, title: newTitle } : chat
    );
    setChats(updated);
  };

  const latestAtt = attachments[attachments.length - 1];

  /* ------------------------------------------------------------------------ */
  /* Redesign helpers                                                          */
  /* ------------------------------------------------------------------------ */

  const submitText =
    text ||
    (attachments.some((a) => a.mime?.startsWith('image/')) ? 'image'
      : attachments.some((a) => a.mime === 'application/pdf') ? 'pdf'
      : '');

  const hasResult = Boolean(simplifiedText) || loading;
  const compareAvailable = Boolean(text.trim());
  const compareActive = showSideBySide && compareAvailable && canCompare;
  const canRerun = Boolean(text.trim()) || attachments.length > 0;
  const dirty = text !== resultSource.text;

  function rerunWith(changes) {
    if (changes.domain) setDomain(changes.domain);
    if (changes.level) setLevel(changes.level);
    if (!canRerun || loading) return;
    handleSimplify(changes);
  }

  function setCompare(val) {
    if (!text.trim()) return;
    setShowSideBySide(val);
  }

  function applyExample(example) {
    setText(example.text);
    setDomain(example.domain);
    // After React re-renders (the example list unmounts once text is filled).
    setTimeout(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(0, 0);
      el.scrollTop = 0;
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 0);
  }

  function previewLatest() {
    const a = latestAtt;
    if (a?.file) {
      const reader = new FileReader();
      reader.onload = () => setPreviewSrc(reader.result);
      reader.readAsDataURL(a.file);
    } else {
      setPreviewSrc(a?.viewUrl || a?.publicUrl || null);
    }
  }

  function closePreview() {
    if (previewSrc?.startsWith('blob:')) {
      try { URL.revokeObjectURL(previewSrc); } catch {}
    }
    setPreviewSrc(null);
  }

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(simplifiedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setErrorMsg('Couldn’t copy to the clipboard.');
      clearErrorSoon();
    }
  }

  const composerProps = {
    textareaRef,
    text,
    onTextChange: (e) => setText(e.target.value),
    onSubmit: () => handleSimplify(),
    submitText,
    loading,
    maxChars: MAX_CHARS,
    domain,
    onDomainChange: setDomain,
    level,
    onLevelChange: setLevel,
    attachment: latestAtt,
    onUploaded: handleUploaded,
    onUploadError: (msg) => {
      setErrorMsg(msg);
      clearErrorSoon();
    },
    onPreview: previewLatest,
    onRemoveAttachment: () => {
      setAttachments([]);
      setPreviewSrc(null);
    },
    previewSrc,
    onClosePreview: closePreview,
  };

  const wordCount = (resultSource.text || '').trim().split(/\s+/).filter(Boolean).length;
  const sourceMeta = resultSource.fileName
    ? resultSource.fileName
    : wordCount > 0
      ? `${wordCount.toLocaleString()} ${wordCount === 1 ? 'word' : 'words'}`
      : '';

  const banners = (
    <>
      {/* Service notice banner (429/503, etc.) */}
      {serviceNotice && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-medium text-amber-100"
        >
          {serviceNotice}
        </div>
      )}

      {/* Inline error banner */}
      {errorMsg && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200"
        >
          {errorMsg}
        </div>
      )}
    </>
  );

  /* ------------------------------------------------------------------------ */
  /* Render                                                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="flex min-h-dvh w-full lg:h-dvh lg:overflow-hidden">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink-900"
      >
        Skip to content
      </a>

      <HistoryPanel
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col lg:overflow-y-auto">
        {/* Mobile / tablet top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-ink-900/90 px-2 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu and chat history"
            className="grid size-11 place-items-center rounded-lg text-text-soft hover:bg-white/[0.06]"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <BrandMark className="text-[1.15rem]" />
          <button
            type="button"
            onClick={handleNewChat}
            aria-label="Start new chat"
            className="grid size-11 place-items-center rounded-lg text-brand-cyan hover:bg-white/[0.06]"
          >
            <Plus className="size-5" aria-hidden="true" />
          </button>
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1120px] flex-1 px-4 pb-20 focus:outline-none sm:px-6 lg:px-10">
          {!hasResult ? (
            /* ------------------------------ Home ------------------------------ */
            <div className="mx-auto max-w-[880px] pt-8 sm:pt-16 lg:pt-20">
              <h1 className="font-display text-[2.75rem] font-bold leading-[1.04] tracking-[-0.035em] sm:text-center sm:text-6xl lg:text-[4.5rem]">
                <span className="text-text">Understand.</span>{' '}
                <br className="sm:hidden" />
                <span className="text-gradient-brand">Unjargon.</span>
              </h1>
              <p className="mt-3 text-[1.0625rem] text-text-soft sm:mt-4 sm:text-center sm:text-lg">
                Where clarity meets understanding.
              </p>

              <div className="mt-8 sm:mt-10">
                {banners}
                <Composer
                  {...composerProps}
                  showCompare
                  compare={showSideBySide && compareAvailable}
                  onCompareChange={setCompare}
                  compareDisabled={!compareAvailable}
                  showTip={showTip}
                  onDismissTip={dismissTip}
                />
              </div>

              {!text.trim() && attachments.length === 0 && (
                <section aria-labelledby="examples-heading" className="mt-12 sm:mt-16">
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 id="examples-heading" className="font-display text-lg font-semibold text-text">
                      New here? Start with an example.
                    </h2>
                    <p className="hidden text-sm text-text-muted sm:block">Each one sets the domain for you</p>
                  </div>
                  <ul className="scrollbar-none -mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
                    {EXAMPLES.map((ex) => {
                      const d = DOMAINS.find((x) => x.value === ex.domain) || DOMAINS[0];
                      const Icon = d.icon;
                      return (
                        <li key={ex.id} className="w-[78%] shrink-0 snap-start sm:w-auto">
                          <button
                            type="button"
                            onClick={() => applyExample(ex)}
                            aria-label={`Use example: ${ex.title} (${d.label})`}
                            className="flex h-full w-full flex-col rounded-xl border border-line bg-ink-850 p-4 text-left transition-colors hover:border-line-strong hover:bg-ink-800"
                          >
                            <span className="flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-text-soft">
                              <Icon className="size-3.5 text-brand-cyan" aria-hidden="true" />
                              {d.label}
                            </span>
                            <span className="mt-2 block font-display text-[1.0625rem] font-semibold text-text">
                              {ex.title}
                            </span>
                            <span className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-text-muted">
                              {ex.text}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </div>
          ) : (
            /* ---------------------------- Results ----------------------------- */
            <div className="pt-4 sm:pt-6 lg:pt-8">
              {banners}

              {/* Toolbar */}
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="order-2 flex flex-wrap items-center gap-2 md:order-1">
                  <DomainSelect
                    value={domain}
                    onChange={(v) => rerunWith({ domain: v })}
                    disabled={loading}
                  />
                  <LevelSelect
                    value={level}
                    onChange={(v) => rerunWith({ level: v })}
                    disabled={loading}
                  />
                </div>

                <div className="order-1 flex items-center gap-2 md:order-2">
                  <div
                    role="group"
                    aria-label="View"
                    className="grid flex-1 grid-cols-2 rounded-xl border border-line bg-ink-850 p-1 md:flex-none"
                  >
                    <button
                      type="button"
                      aria-pressed={!compareActive}
                      onClick={() => setShowSideBySide(false)}
                      className={cn(
                        'inline-flex h-8 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors',
                        !compareActive ? 'bg-ink-700 text-text' : 'text-text-muted hover:text-text'
                      )}
                    >
                      <AlignLeft className="size-4" aria-hidden="true" />
                      Reading
                    </button>
                    <button
                      type="button"
                      aria-pressed={compareActive}
                      onClick={() => setCompare(true)}
                      disabled={!compareAvailable || !canCompare}
                      title={!compareAvailable ? 'Side-by-side needs pasted text' : undefined}
                      className={cn(
                        'inline-flex h-8 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors',
                        compareActive ? 'bg-ink-700 text-text' : 'text-text-muted hover:text-text',
                        'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-text-muted'
                      )}
                    >
                      <Columns2 className="size-4" aria-hidden="true" />
                      Side by side
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={copyResult}
                    disabled={!simplifiedText || loading}
                    aria-label={copied ? 'Copied' : 'Copy explanation'}
                    title="Copy explanation"
                    className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-ink-850 text-text-soft hover:bg-ink-800 hover:text-text disabled:opacity-40"
                  >
                    {copied ? (
                      <Check className="size-4 text-brand-cyan" aria-hidden="true" />
                    ) : (
                      <Copy className="size-4" aria-hidden="true" />
                    )}
                  </button>
                  <span className="sr-only" role="status" aria-live="polite">
                    {copied ? 'Explanation copied' : ''}
                  </span>
                </div>
              </div>

              {/* Your text */}
              {!compareActive && (
                <div className="mt-4 rounded-xl border border-line bg-ink-850">
                  <button
                    type="button"
                    aria-expanded={sourceOpen}
                    aria-controls="source-panel"
                    onClick={() => setSourceOpen((v) => !v)}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left hover:bg-white/[0.02]"
                  >
                    <FileText className="size-4 shrink-0 text-brand-cyan" aria-hidden="true" />
                    <span className="text-sm font-semibold text-text">Your text</span>
                    {sourceMeta && <span className="min-w-0 truncate text-sm text-text-muted">{sourceMeta}</span>}
                    <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-sm text-text-soft">
                      {sourceOpen ? 'Hide' : 'Show'}
                      <ChevronDown
                        className={cn('size-4 transition-transform', sourceOpen && 'rotate-180')}
                        aria-hidden="true"
                      />
                    </span>
                  </button>
                  <div id="source-panel" hidden={!sourceOpen} className="border-t border-line p-3 sm:p-4">
                    {sourceOpen && (
                      <Composer
                        {...composerProps}
                        showSelects={false}
                        submitLabel="Unjargon again"
                        rows={6}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Reading surface */}
              <div className="mt-5">
                {compareActive ? (
                  <CompareView
                    text={text}
                    onTextChange={(e) => setText(e.target.value)}
                    resultText={simplifiedText}
                    meta={resultMeta}
                    loading={loading}
                    dirty={dirty && Boolean(text.trim())}
                    onRerun={() => handleSimplify()}
                    onChangeLevel={(v) => rerunWith({ level: v })}
                    canChangeLevel={canRerun}
                  />
                ) : (
                  <OutputBox
                    text={simplifiedText}
                    meta={resultMeta}
                    loading={loading}
                    onChangeLevel={(v) => rerunWith({ level: v })}
                    canChangeLevel={canRerun}
                  />
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
