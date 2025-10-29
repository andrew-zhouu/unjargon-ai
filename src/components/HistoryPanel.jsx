'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { DotsVerticalIcon } from '@heroicons/react/solid';

export default function HistoryPanel({
  chats, activeChatId, onSelectChat, onNewChat, onDeleteChat, onRenameChat
}) {
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  // ✅ Default collapsed on first load; restore last preference afterwards
  const [collapsed, setCollapsed] = useState(true);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('unjargon_sidebar_collapsed');
      if (saved !== null) setCollapsed(saved === 'true');
    } catch {}
  }, []);

  return (
    <div
      className={`bg-blue-950/25 text-white p-4 border-3 border-blue-700/60 rounded-lg h-screen overflow-y-auto
                  transition-all duration-300 ease-in-out ${collapsed ? 'w-16' : 'w-64'} relative`}
    >
      <button
        onClick={() =>
          setCollapsed(prev => {
            const next = !prev;
            try { localStorage.setItem('unjargon_sidebar_collapsed', String(next)); } catch {}
            return next;
          })
        }
        className="flex items-center gap-3 px-3 py-1 text-base font-medium
                   bg-gray-800 hover:bg-gray-700 text-white rounded-lg
                   transition duration-200 shadow-sm absolute top-3 right-3 border-2 border-gray-400"
      >
        {collapsed ? '>' : '<'}
      </button>

      {!collapsed && (
        <>
          <h1 className="text-xl font-geist font-bold mb-4 text-center bg-gradient-to-r from-blue-600 to-purple-500 bg-clip-text text-transparent">
            unjargon.ai
          </h1>

          <motion.button
            onClick={onNewChat}
            whileTap={{ scale: 0.97 }}
            whileHover={{ opacity: 0.89 }}
            className="w-full px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-lg text-sm border-2 border-blue-300 shadow-sm mb-4"
          >
            ➕ Start New Chat
          </motion.button>

          <div className="space-y-4">
            <AnimatePresence>
              {chats.map((chat, index) => (
                <motion.div
                  key={chat.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className={`group relative p-3 rounded-lg text-sm font-semibold transition-all flex flex-col gap-1 shadow-sm border-2 border-gray-600 ${
                    chat.id === activeChatId ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1 truncate cursor-pointer" onClick={() => onSelectChat(chat.id)}>
                      {editingChatId === chat.id ? (
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => { onRenameChat(chat.id, editTitle); setEditingChatId(null); }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { onRenameChat(chat.id, editTitle); setEditingChatId(null); }
                          }}
                          className="bg-gray-700 text-white rounded px-2 py-1 w-full"
                          autoFocus
                        />
                      ) : (
                        <span>{chat.title || `Chat ${index + 1}`}</span>
                      )}
                    </div>
                    <div className="relative ml-2 hidden group-hover:block">
                      <Menu>
                        <MenuButton className="text-white text-xs hover:text-blue-300">
                          <DotsVerticalIcon className="w-4 h-4" />
                        </MenuButton>
                        <MenuItems className="absolute right-0 mt-1 w-28 origin-top-right rounded-md bg-gray-800 shadow-lg ring-1 ring-black/10 focus:outline-none z-50">
                          <MenuItem>
                            {({ active }) => (
                              <button
                                onClick={() => { setEditTitle(chat.title); setEditingChatId(chat.id); }}
                                className={`block w-full text-left px-3 py-1 text-sm font-semibold ${active ? 'bg-gray-700' : ''}`}
                              >
                                ✏️ Rename
                              </button>
                            )}
                          </MenuItem>
                          <MenuItem>
                            {({ active }) => (
                              <button
                                onClick={() => onDeleteChat(chat.id)}
                                className={`block w-full text-left px-3 py-1 text-sm font-semibold text-red-400 ${active ? 'bg-gray-700' : ''}`}
                              >
                                🗑️ Delete
                              </button>
                            )}
                          </MenuItem>
                        </MenuItems>
                      </Menu>
                    </div>
                  </div>
                  {chat.history?.length > 0 && (
                    <p className="text-xs text-gray-400 truncate">
                      {new Date(chat.history[chat.history.length - 1].timestamp).toLocaleString()}
                    </p>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}
