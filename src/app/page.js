'use client';

import { useEffect, useState } from 'react';
import { Switch } from '@headlessui/react';
import TextInput from '@/components/TextInput';
import DomainSelect from '@/components/DomainSelect';
import LevelSelect from '@/components/LevelSelect';
import SimplifyButton from '@/components/SimplifyButton';
import OutputBox from '@/components/OutputBox';
import HistoryPanel from '@/components/HistoryPanel';
import { v4 as uuidv4 } from 'uuid';

export default function HomePage() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [text, setText] = useState('');
  const [domain, setDomain] = useState('general');
  const [level, setLevel] = useState('intermediate');
  const [simplifiedText, setSimplifiedText] = useState('');
  const [loading, setLoading] = useState(false);

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
    if (!text.trim()) return;
    setLoading(true);
    setSimplifiedText('');

    try {
      const res = await fetch('/api/simplify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, domain, level }),
      });

      // Read raw body once, then attempt JSON parse
      const raw = await res.text();
      let data = null;
      try { data = JSON.parse(raw); } catch {}

      if (!res.ok) {
  // In dev you can inspect with warn; in prod, stay silent.
      if (process.env.NODE_ENV === 'development') {
        console.warn('simplify failed status:', res.status);
        console.warn('simplify raw body:', raw);
        console.warn('simplify parsed JSON:', data);
      }

      const msg =
        (data && (data.error || data.detail)) ||
        raw ||
        `Request failed (${res.status})`;

      setSimplifiedText(`1. Summary
    ${msg}


  2. Main Points
  N/A

  3. Helpful Definitions
  N/A`);
        return;
      }

      const simplified = (data && data.simplified) || 'No response';
      setSimplifiedText(simplified);

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
                  result: simplified,
                  timestamp,
                },
              ],
              title: chat.title || text.slice(0, 30),
            }
          : chat
      );
      setChats(updatedChats);
    } catch (err) {
      console.error('simplify caught exception:', err);
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
              Unjargn.
            </span>
          </h1>
      
        <p className="text-center italic text-lg font-medium 
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
              <span className="text-sm text-gray-300">Side-by-Side</span>
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
            <p className="text-xs text-gray-400 mt-1">Toggle side-by-side comparison</p>
          </div>
        </div>

        <div className="flex flex-col justify-end h-[50px] mt-4">
          <SimplifyButton onClick={handleSimplify} loading={loading} text={text} />
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