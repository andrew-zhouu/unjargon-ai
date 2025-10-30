'use client';

import { useEffect, useState } from 'react';
import { Switch } from '@headlessui/react';
import TextInput from '@/components/TextInput';
import DomainSelect from '@/components/DomainSelect';
import LevelSelect from '@/components/LevelSelect';
import SimplifyButton from '@/components/SimplifyButton';
import OutputBox from '@/components/OutputBox';
import HistoryPanel from '@/components/HistoryPanel';
import UploadBox from '@/components/UploadBox';
import { v4 as uuidv4 } from 'uuid';

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

  async function handleSimplify() {
  // decide: prefer latest file (pdf or image); else simplify text
  const latest = attachments.slice().reverse().find(a => a.mime);
  const img = latest && latest.mime.startsWith('image/') ? latest : null;
  const pdf = latest && latest.mime === 'application/pdf' ? latest : null;

  if (!text.trim() && !img && !pdf) return;

  setLoading(true);
  setSimplifiedText('');
  setServiceNotice(null);

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
          body: JSON.stringify({ pdfText, level }),
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
          dataUrl ? { dataUrl, level } : { imageUrl: img.previewUrl, level }
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
     res = await sendJson({ text: cleanText, domain, level });
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
    j({ text: cleanText, domain, level }),   // common shape
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

    // Save to history (unchanged logic)
    const timestamp = new Date().toISOString();
    const updatedChats = chats.map((chat) =>
      chat.id === activeChatId
        ? {
            ...chat,
            history: [
              ...chat.history,
              {
                id: Date.now().toString(),
                text,
                domain,
                level,
                result: full,
                timestamp,
              },
            ],
            title: chat.title || text.slice(0, 30),
          }
        : chat
    );
    setChats(updatedChats);
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
    const newChat = { id: uuidv4(), title: '', history: [] };
    setChats([newChat, ...chats]);
    setActiveChatId(newChat.id);
    setText('');
    setSimplifiedText('');
    setAttachments([]);       // reset attachments for a fresh chat
    setShowSideBySide(false); // reset compare view for a fresh chat
    setPreviewSrc(null);
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
    } else {
      setText('');
      setSimplifiedText('');
    }
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

  return (
    <div className="flex h-screen">
      <HistoryPanel
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
      />

      <main className="flex-1 overflow-y-auto pt-9 px-14 pb-14 font-inter text-base text-blue-500 max-w-[1100px] mx-auto">
        <div className="mb-8">
          <h1 className="font-geist text-4xl font-extrabold text-center tracking-tight mb-1">
            <span className="bg-gradient-to-r from-blue-500 to-cyan-300 bg-clip-text text-transparent">
              Understand.
            </span>{' '}
            <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
              Unjargon.
            </span>
          </h1>

          <p className="text-center italic text-lg font-semibold
            bg-gradient-to-r from-cyan-100 via-blue-300 to-indigo-600 bg-clip-text text-transparent">
            Where clarity meets understanding.
          </p>
        </div>

        {/* 🔔 Service notice banner (429/503, etc.) */}
        {serviceNotice && (
          <div
            role="status"
            aria-live="polite"
            className="mb-4 rounded-lg border border-yellow-400 bg-yellow-50/70 p-3 text-yellow-900 font-medium text-center"
          >
            {serviceNotice}
          </div>
        )}

        {/* Inline error banner */}
        {errorMsg && (
          <div className="mb-9 rounded-md border-2 border-red-400 bg-red-50/80 px-3 py-4 text-red-800 text-medium font-semibold">
            {errorMsg}
          </div>
        )}


        {/* Control Row */}
        <div className="flex flex-wrap items-stretch gap-6 mb-4">
          <div className="flex flex-col justify-end h-[84px]">
            <DomainSelect value={domain} onChange={setDomain} />
          </div>

          <div className="flex flex-col justify-end h-[84px]">
            <LevelSelect value={level} onChange={setLevel} />
          </div>

          <div className="flex flex-col justify-end h-[73px]">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-300">Side-by-Side</span>
              <Switch
                checked={showSideBySide}
                onChange={(val) => {
                  if (!text.trim() || !canCompare) return;
                  setShowSideBySide(val);
                }}
                disabled={!text.trim() || !canCompare || loading}
                className={`${showSideBySide ? 'bg-green-500' : 'bg-gray-600'} ${
                  (!text.trim() || !canCompare) ? 'opacity-40 cursor-not-allowed' : ''
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
              >
                <span
                  className={`${showSideBySide ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition`}
                />
              </Switch>
            </div>
            <p className="text-xs font-semibold text-gray-400 mt-1">Toggle side-by-side comparison</p>
          </div>
        </div>

        {/* Upload row */}
        <div className="mt-2 mb-3">
          <UploadBox onUploaded={handleUploaded} disabled={loading} />
        </div>

        {attachments.length > 0 && (
          <div className="mt-3 flex items-center justify-between max-w-md p-2 pl-3 rounded-lg bg-gray-100/10 border border-gray-700 backdrop-blur-sm">
            <div className="flex items-center gap-3 overflow-hidden">
              <span className="text-sm text-gray-300 truncate">
                {latestAtt.file?.name || latestAtt.name || 'Uploaded file'}{' '}
                • {latestAtt.mime?.split('/')[1]?.toUpperCase() || 'FILE'}
                • {Math.round(((latestAtt.file?.size || latestAtt.size) / 102.4)) / 10} KB
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Preview button */}
              <button
                type="button"
                onClick={() => {
                  const a = latestAtt;
                  if (a?.file) {
                    const reader = new FileReader();
                    reader.onload = () => setPreviewSrc(reader.result);
                    reader.readAsDataURL(a.file);
                  } else {
                    setPreviewSrc(a.viewUrl || a.publicUrl || null);
                  }
                }}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-400 hover:to-cyan-300 border border-blue-400 transition-colors"
              >
                Preview
              </button>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => {
                  setAttachments([]);
                  setPreviewSrc(null);
                }}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-gray-300 border border-gray-500 hover:bg-gray-700 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {previewSrc && (
          <div className="mt-3 p-3 rounded-lg bg-slate-800 border border-slate-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-200">File preview</span>
              <button
                className="px-3 py-1.5 text-gray-300 text-xs font-semibold rounded bg-slate-700 border border-gray-500 hover:bg-slate-600"
                onClick={() => {
                  if (previewSrc.startsWith('blob:')) {
                    try { URL.revokeObjectURL(previewSrc); } catch {}
                  }
                  setPreviewSrc(null);
                }}
              >
                Close
              </button>
            </div>
            <div className="max-h-96 overflow-auto rounded bg-black/20 p-2">
              {latestAtt?.mime === 'application/pdf' ? (
                // PDF preview (best-effort: blob/data URLs generally work)
                <iframe
                  src={previewSrc}
                  title="PDF preview"
                  className="w-full h-96 rounded"
                />
              ) : (
                <img
                  src={previewSrc}
                  alt="Attachment preview"
                  className="max-h-96 mx-auto object-contain"
                />
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col justify-end h-[50px] mt-6 relative">
          <div className="relative w-full [&>button]:w-full [&>button]:block">
            <SimplifyButton
            onClick={handleSimplify}
              loading={loading}
              text={
              text ||
              (attachments.some(a => a.mime?.startsWith('image/')) ? 'image'
              : attachments.some(a => a.mime === 'application/pdf') ? 'pdf'
              : '')
           }
         />

            {/* First-visit popover */}
            {showTip && (
              <>
                <div
                  className="fixed inset-0 bg-black/40 z-40"
                  onClick={dismissTip}
                />
                <div
                  role="dialog"
                  aria-label="Unjargon tip"
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50
                            max-w-xs px-4 py-3 rounded-xl text-sm leading-snug
                            text-white bg-slate-900/90 backdrop-blur border-3 border-white/10 shadow-lg"
                >
                  <div className="font-semibold mb-1">Unjargon = Simplify</div>
                  <div>
                    Click this button to turn jargon into clear language.
                    Works for text, images, and PDFs you upload.
                  </div>
                  <div
                    className="absolute left-1/2 top-full -translate-x-1/2 mt-[2px] sm:mt-[3px]
                              w-[10px] h-[10px] sm:w-[12px] sm:h-[12px]
                              bg-slate-900/90 border-r border-b border-white/10 rotate-45
                              rounded-[1px]"
                    style={{ transformOrigin: 'center top', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }}
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={dismissTip}
                      className="px-3 py-1 rounded-md text-xs font-semibold
                                bg-white/90 text-slate-900 hover:bg-white"
                    >
                      Got it
                    </button>
                    <span className="text-[11px] text-white/70">(Shown only once)</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Output area */}
        {!showSideBySide ? (
          <div className="mt-6">
            <TextInput value={text} onChange={(e) => setText(e.target.value)} rows={12} />
              <div className="mt-1 text-right text-xs font-semibold"
                  style={{ color: (text?.length ?? 0) > MAX_CHARS ? '#ef4444' : '#9ca3af' }}>
                {(text?.length ?? 0).toLocaleString()} / {MAX_CHARS.toLocaleString()}
              </div>
            <OutputBox text={simplifiedText} />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Editable Original */}
            <div className="relative p-[7px] mt-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 shadow-md">
              <div className="bg-white rounded-[10px] p-5 h-full flex flex-col">
                <h2 className="text-lg font-semibold mb-2 text-blue-600">Original</h2>
                <textarea
                  className="flex-1 w-full p-3 border border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={12}
                  placeholder="Type or paste text here..."
                />
              </div>
            </div>

            {/* Right: Simplified Output */}
            <div className="-mt-3">
              <OutputBox text={simplifiedText} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
