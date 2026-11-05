'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from '@headlessui/react';
import {
  Ellipsis,
  History,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { domainLabel } from '@/components/DomainSelect';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function lastActivity(chat) {
  const last = chat.history?.[chat.history.length - 1];
  const ts = last?.timestamp || chat.createdAt;
  const d = ts ? new Date(ts) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function groupChats(chats) {
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 6);

  const groups = [
    { key: 'today', label: 'Today', items: [] },
    { key: 'yesterday', label: 'Yesterday', items: [] },
    { key: 'week', label: 'Previous 7 days', items: [] },
    { key: 'older', label: 'Earlier', items: [] },
  ];

  chats.forEach((chat, index) => {
    const d = lastActivity(chat);
    const entry = { chat, index, date: d };
    if (!d) groups[3].items.push(entry);
    else if (d >= today) groups[0].items.push(entry);
    else if (d >= yesterday) groups[1].items.push(entry);
    else if (d >= weekAgo) groups[2].items.push(entry);
    else groups[3].items.push(entry);
  });

  return groups.filter((g) => g.items.length > 0);
}

function metaLine(chat, date, groupKey) {
  const last = chat.history?.[chat.history.length - 1];
  const parts = [];
  if (last?.domain) parts.push(domainLabel(last.domain));
  if (date) {
    if (groupKey === 'today' || groupKey === 'yesterday') {
      parts.push(date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    } else if (groupKey === 'week') {
      parts.push(date.toLocaleDateString([], { weekday: 'short' }));
    } else {
      parts.push(date.toLocaleDateString([], { month: 'short', day: 'numeric' }));
    }
  }
  if (!last) parts.push('Not started');
  return parts.join(' · ');
}

export function BrandMark({ className }) {
  return (
    <span className={cn('font-display font-bold tracking-tight text-gradient-brand', className)}>
      unjargon.ai
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Chat list (shared by desktop sidebar + mobile drawer)                        */
/* -------------------------------------------------------------------------- */

function ChatItem({ chat, index, date, groupKey, active, onSelect, onDelete, onRename }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const t = title.trim();
    if (t && t !== chat.title) onRename(chat.id, t);
    setEditing(false);
  };

  const label = chat.title || `Chat ${index + 1}`;

  return (
    <li className="group relative">
      {editing ? (
        <div className="rounded-lg bg-white/[0.06] px-2 py-1.5">
          <label className="sr-only" htmlFor={`rename-${chat.id}`}>Rename chat</label>
          <input
            id={`rename-${chat.id}`}
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') setEditing(false);
            }}
            className="w-full rounded-md bg-ink-900 px-2 py-1.5 text-sm text-text outline-none ring-1 ring-brand-blue/60"
          />
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => onSelect(chat.id)}
            aria-current={active ? 'true' : undefined}
            className={cn(
              'block w-full rounded-lg py-2 pl-3 pr-9 text-left transition-colors',
              active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
            )}
          >
            <span className={cn('block truncate text-[0.9rem]', active ? 'font-medium text-text' : 'text-text-soft')}>
              {label}
            </span>
            <span className="mt-0.5 block truncate text-xs text-text-muted">
              {metaLine(chat, date, groupKey)}
            </span>
          </button>

          <Menu>
            <MenuButton
              aria-label={`Options for ${label}`}
              className={cn(
                'absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-text-muted',
                'hover:bg-white/[0.08] hover:text-text data-[open]:bg-white/[0.08] data-[open]:opacity-100',
                'opacity-0 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100',
                '[@media(hover:none)]:opacity-100',
                active && 'opacity-100'
              )}
            >
              <Ellipsis className="size-4" aria-hidden="true" />
            </MenuButton>
            <MenuItems
              anchor="bottom end"
              className="z-[70] mt-1 w-36 rounded-lg border border-line-strong bg-ink-800 p-1 text-sm shadow-2xl shadow-black/40 focus:outline-none"
            >
              <MenuItem>
                <button
                  type="button"
                  onClick={() => {
                    setTitle(chat.title || '');
                    setEditing(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-text-soft data-[focus]:bg-white/[0.07] data-[focus]:text-text"
                >
                  <Pencil className="size-3.5" aria-hidden="true" /> Rename
                </button>
              </MenuItem>
              <MenuItem>
                <button
                  type="button"
                  onClick={() => onDelete(chat.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-red-300 data-[focus]:bg-red-500/10"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" /> Delete
                </button>
              </MenuItem>
            </MenuItems>
          </Menu>
        </>
      )}
    </li>
  );
}

function PanelBody({ chats, activeChatId, onSelectChat, onNewChat, onDeleteChat, onRenameChat, header }) {
  const groups = useMemo(() => groupChats(chats), [chats]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {header}

      <div className="px-3">
        <button
          type="button"
          onClick={onNewChat}
          className="flex h-10 w-full items-center gap-2.5 rounded-lg border border-line bg-white/[0.04] px-3 text-sm font-medium text-text hover:bg-white/[0.08]"
        >
          <Plus className="size-4 text-brand-cyan" aria-hidden="true" />
          Start new chat
        </button>
      </div>

      <nav aria-label="Chat history" className="mt-4 min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {groups.length === 0 ? (
          <p className="px-3 py-2 text-sm leading-relaxed text-text-muted">
            Your unjargoned texts will appear here.
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.key} className="mt-3 first:mt-0">
              <h2 className="px-3 pb-1.5 pt-2 font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-text-muted">
                {g.label}
              </h2>
              <ul className="space-y-0.5">
                {g.items.map(({ chat, index, date }) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    index={index}
                    date={date}
                    groupKey={g.key}
                    active={chat.id === activeChatId}
                    onSelect={onSelectChat}
                    onDelete={onDeleteChat}
                    onRename={onRenameChat}
                  />
                ))}
              </ul>
            </div>
          ))
        )}
      </nav>

      <div className="border-t border-line px-6 py-4">
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[0.8125rem] text-text-muted">
          <li><Link href="/about-us" className="hover:text-text">About</Link></li>
          <li><Link href="/contact" className="hover:text-text">Contact</Link></li>
          <li><Link href="/terms" className="hover:text-text">Terms</Link></li>
          <li><Link href="/privacy" className="hover:text-text">Privacy</Link></li>
        </ul>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sidebar                                                                     */
/* -------------------------------------------------------------------------- */

export default function HistoryPanel({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  mobileOpen = false,
  onMobileClose = () => {},
}) {
  // Restore the last preference; default to expanded on desktop.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('unjargon_sidebar_collapsed');
      if (saved !== null) setCollapsed(saved === 'true');
    } catch {}
  }, []);

  const setCollapsedPersist = (next) => {
    setCollapsed(next);
    try { localStorage.setItem('unjargon_sidebar_collapsed', String(next)); } catch {}
  };

  const bodyProps = { chats, activeChatId, onDeleteChat, onRenameChat };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        aria-label="Sidebar"
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 border-r border-line bg-ink-850 lg:block',
          'motion-safe:transition-[width] motion-safe:duration-200',
          collapsed ? 'w-[68px]' : 'w-[272px]'
        )}
      >
        {collapsed ? (
          <div className="flex h-full flex-col items-center gap-2 py-4">
            <span className="mb-2 font-display text-xl font-bold text-gradient-brand" aria-label="unjargon.ai">u.</span>
            <button
              type="button"
              onClick={() => setCollapsedPersist(false)}
              aria-label="Expand sidebar"
              aria-expanded="false"
              className="grid size-10 place-items-center rounded-lg text-text-soft hover:bg-white/[0.06] hover:text-text"
            >
              <PanelLeftOpen className="size-[18px]" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onNewChat}
              aria-label="Start new chat"
              className="grid size-10 place-items-center rounded-lg bg-white/[0.05] text-brand-cyan hover:bg-white/[0.1]"
            >
              <Plus className="size-[18px]" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setCollapsedPersist(false)}
              aria-label="Show chat history"
              className="grid size-10 place-items-center rounded-lg text-text-soft hover:bg-white/[0.06] hover:text-text"
            >
              <History className="size-[18px]" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <PanelBody
            {...bodyProps}
            onSelectChat={onSelectChat}
            onNewChat={onNewChat}
            header={
              <div className="flex h-16 items-center justify-between pl-6 pr-3">
                <Link href="/" className="text-[1.25rem]" aria-label="unjargon.ai home">
                  <BrandMark />
                </Link>
                <button
                  type="button"
                  onClick={() => setCollapsedPersist(true)}
                  aria-label="Collapse sidebar"
                  aria-expanded="true"
                  className="grid size-9 place-items-center rounded-lg text-text-muted hover:bg-white/[0.06] hover:text-text"
                >
                  <PanelLeftClose className="size-[18px]" aria-hidden="true" />
                </button>
              </div>
            }
          />
        )}
      </aside>

      {/* Mobile / tablet drawer */}
      <Dialog open={mobileOpen} onClose={onMobileClose} className="relative z-[60] lg:hidden">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-ink-950/70 backdrop-blur-[2px] transition-opacity duration-200 data-[closed]:opacity-0"
        />
        <DialogPanel
          transition
          className="fixed inset-y-0 left-0 w-[min(86vw,320px)] border-r border-line bg-ink-850 shadow-2xl transition-transform duration-200 ease-out data-[closed]:-translate-x-full"
        >
          <PanelBody
            {...bodyProps}
            onSelectChat={(id) => {
              onSelectChat(id);
              onMobileClose();
            }}
            onNewChat={() => {
              onNewChat();
              onMobileClose();
            }}
            header={
              <div className="flex h-16 items-center justify-between pl-6 pr-3">
                <BrandMark className="text-[1.2rem]" />
                <button
                  type="button"
                  onClick={onMobileClose}
                  aria-label="Close menu"
                  className="grid size-10 place-items-center rounded-lg text-text-soft hover:bg-white/[0.06]"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>
            }
          />
        </DialogPanel>
      </Dialog>
    </>
  );
}
