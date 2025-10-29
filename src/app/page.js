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
      // If the same image is clicked twice in a row, force a “change” so React re-renders:
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

  // NEW: hold uploaded attachments (so Analyze can find the latest image)
  const [attachments, setAttachments] = useState([]);

  function handleUploaded(meta, file) {
    // Do NOT modify the input box
    if (meta?.mime?.startsWith('image/')) {
      // Make a local blob URL for reliable in-app preview
      const blobUrl = file ? URL.createObjectURL(file) : null;

      setAttachments((prev) => [
        ...prev,
        {
          key: meta.key || meta.id,
          name: file?.name || meta.id,
          mime: meta.mime,
          size: meta.size,
          previewUrl: blobUrl || meta.viewUrl || null, // prefer blob for preview
          viewUrl: meta.viewUrl || null,               // keep presigned GET as fallback
          file,                                        // keep for analyze (dataURL)
        },
      ]);
    }
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
    const text = String(s || '');

    // Find the "3. Helpful Definitions" section bounds
    const h3 = text.match(/^\s*3\.\s*Helpful Definitions\s*$/m);
    if (!h3) return text;

    const startIdx = h3.index + h3[0].length;
    const tail = text.slice(startIdx);
    const nextHeader = tail.match(/^\s*\d+\.\s/m);
    const endIdx = nextHeader ? startIdx + nextHeader.index : text.length;

    const before = text.slice(0, startIdx);
    const body = text.slice(startIdx, endIdx);
    const after = text.slice(endIdx);

    const fixed = body
      .split('\n')
      .map((line) => {
        const raw = line.trim();
        if (!raw || /^N\/A$/i.test(raw)) return line;

        // remove leading bullet if present
        const noLead = raw.replace(/^[\-\*\u2022]\s+/, '');

        // split on first colon
        const colon = noLead.indexOf(':');
        if (colon === -1) return line;

        let term = noLead.slice(0, colon).trim().replace(/^\[?/, '').replace(/\]?$/, '');
        let defn = noLead.slice(colon + 1).trimStart();

        // wrap term with **...** if missing
        if (!/^\*\*.*\*\*$/.test(term)) {
          term = `**${term.replace(/^\*\*|\*\*$/g, '')}**`;
        }

        // Always output as a hyphen bullet for consistency
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
  // decide: if there is an image attachment, analyze it; else simplify text
  const img = attachments.slice().reverse().find(a => a.mime?.startsWith('image/'));
  if (!text.trim() && !img) return;

  setLoading(true);
  setSimplifiedText('');

  try {
    let res, raw, data, simplified, full;

    if (img) {
      // Prefer bytes (data URL) so server doesn't have to reach S3 at all
      const toDataUrl = (file) =>
        new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = reject;
          r.readAsDataURL(file);
        });
      const dataUrl = img.file ? await toDataUrl(img.file) : null;

      // call image endpoint
      res = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          dataUrl ? { dataUrl, level } : { imageUrl: img.previewUrl, level }
        ),
      });

      // If the route streams plain text, show it live; otherwise parse JSON
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
      res = await fetch('/api/simplify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, domain, level }),
      });

      if (res.ok && res.body) {
        full = await streamIntoState(res, setSimplifiedText);
        simplified = fixHelpfulDefinitionsFormatting(full);
        setSimplifiedText(simplified);
      } else {
        raw = await res.text();
        try { data = JSON.parse(raw); } catch {}
      }
    }

    // Non-streaming (JSON) fallback handling
    if (!res.ok) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('simplify/analyze failed status:', res.status);
        console.warn('raw body:', raw);
        console.warn('parsed JSON:', data);
      }
      const msg = (data && (data.error || data.detail)) || raw || `Request failed (${res.status})`;
      setSimplifiedText(`1. Summary
${msg}

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
    // If selected chat has no simplified result, ensure toggle is off
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

        {/* Control Row */}
        <div className="flex flex-wrap items-stretch gap-6 mb-4">
          {/* each “column” gets a fixed height and bottom alignment */}
          <div className="flex flex-col justify-end h-[84px]">
            <DomainSelect value={domain} onChange={setDomain} />
          </div>

          <div className="flex flex-col justify-end h-[84px]">
            <LevelSelect value={level} onChange={setLevel} />
          </div>

          {/* Toggle, kept closer to the left and aligned to the same baseline */}
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

        {/* Upload row (kept close to the controls) */}
        <div className="mt-2 mb-3">
          <UploadBox onUploaded={handleUploaded} disabled={loading} />

        </div>

        {attachments.length > 0 && (
          <div className="mt-3 flex items-center justify-between max-w-md p-2 pl-3 rounded-lg bg-gray-100/10 border border-gray-700 backdrop-blur-sm">
            <div className="flex items-center gap-3 overflow-hidden">
              <span className="text-sm text-gray-300 truncate">
                {attachments[attachments.length - 1].file?.name ||
                  attachments[attachments.length - 1].name ||
                  'Uploaded image'}{' '}
                •{' '}
                {attachments[attachments.length - 1].mime
                  ?.replace('image/', '')
                  .toUpperCase() || 'FILE'}
                •{' '}
                {Math.round(
                  (attachments[attachments.length - 1].file?.size ||
                    attachments[attachments.length - 1].size) /
                    102.4
                ) / 10}{' '}
                KB
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Preview button */}
              <button
                type="button"
                onClick={() => {
                  const img = attachments[attachments.length - 1];
                  if (img?.file) {
                    const reader = new FileReader();
                    reader.onload = () => setPreviewSrc(reader.result);
                    reader.readAsDataURL(img.file);
                  } else {
                    setPreviewSrc(img.viewUrl || img.publicUrl || null);
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
              <span className="text-sm font-semibold text-gray-200">Image preview</span>
              <button
                className="px-3 py-1.5 text-gray-300 text-xs font-semibold rounded bg-slate-700 border border-gray-500 hover:bg-slate-600"
                onClick={() => {
                  // Revoke blob URLs to avoid leaks
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
              <img
                src={previewSrc}
                alt="Attachment preview"
                className="max-h-96 mx-auto object-contain"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col justify-end h-[50px] mt-6 relative">
          {/* Anchor for the tooltip */}
          <div className="relative w-full [&>button]:w-full [&>button]:block">
          <SimplifyButton
            onClick={handleSimplify}
            loading={loading}
            text={text || (attachments.some(a => a.mime?.startsWith('image/')) ? 'image' : '')}
          /> 
            
            {/* First-visit popover */}
            {showTip && (
              <>
                {/* dim background; click to dismiss */}
                <div
                  className="fixed inset-0 bg-black/40 z-40"
                  onClick={dismissTip}
                />

                {/* bubble positioned above the button */}
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
                    Works for text and images you upload.
                  </div>

                  {/* little arrow */}
                  {/* Tooltip arrow — diamond (can’t squish on iOS) */}
<div
  aria-hidden="true"
  className="absolute left-1/2 top-full -translate-x-1/2 mt-2 pointer-events-none"
>
  <div
    className="
      w-3 h-3
      min-w-[12px] min-h-[12px] max-w-[12px] max-h-[12px]
      bg-slate-900/90 border border-white/10
      rotate-45 rounded-[2px] shadow-sm
      inline-block align-middle
      shrink-0 grow-0
      transform-gpu
    "
  />
</div>




                  {/* action row */}
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
