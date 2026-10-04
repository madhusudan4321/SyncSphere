'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/ui/Avatar';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/socket';
import { useCall } from '@/lib/call-context';
import { useToast } from '@/components/ui/Toast';
import { timeAgo, formatFileSize, getFileCategory } from '@/lib/utils';

/* ---------- Icons ---------- */
const ip = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
};

const CloseIcon = ({ size = 20 }) => (
  <svg width={size} height={size} {...ip}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SearchIcon = ({ size = 18 }) => (
  <svg width={size} height={size} {...ip}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const FileIcon = ({ size = 24 }) => (
  <svg width={size} height={size} {...ip}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14,2 14,8 20,8" />
  </svg>
);

const MusicIcon = ({ size = 22 }) => (
  <svg width={size} height={size} {...ip}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const PhoneIcon = ({ size = 18 }) => (
  <svg width={size} height={size} {...ip}>
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
  </svg>
);

const VideoIcon = ({ size = 18 }) => (
  <svg width={size} height={size} {...ip}>
    <path d="M23 7l-7 5 7 5V7z" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const Spinner = ({ size = 24 }) => (
  <>
    <style>{`@keyframes ss-spin { to { transform: rotate(360deg); } }`}</style>
    <div
      style={{
        width: size,
        height: size,
        border: '2px solid #dbdbdb',
        borderTopColor: '#0095f6',
        borderRadius: '50%',
        animation: 'ss-spin 0.8s linear infinite',
      }}
    />
  </>
);

const roundBtn = {
  width: 38,
  height: 38,
  flexShrink: 0,
  border: 'none',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
};

/* ---------- Chat page ---------- */
export default function ChatPage() {
  const [threads, setThreads] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const { user } = useAuth();
  const socket = useSocket();

  const loadThreads = useCallback(async () => {
    try {
      const data = await api.get('/messages/threads');
      setThreads(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  // Open a chat directly when coming from a profile's Message button
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('open_chat');
      if (!raw) return;
      sessionStorage.removeItem('open_chat');
      const u = JSON.parse(raw);
      setSelectedChat({ userId: u._id, username: u.username, user: u });
    } catch {}
  }, []);

  // Socket: new messages update thread list
  useEffect(() => {
    if (!socket) return;
    const onNewMsg = () => loadThreads();
    socket.on('receive-message', onNewMsg);
    socket.on('message:updated', onNewMsg);
    socket.on('message:deleted', onNewMsg);
    socket.on('call:historyUpdated', onNewMsg);
    return () => {
      socket.off('receive-message', onNewMsg);
      socket.off('message:updated', onNewMsg);
      socket.off('message:deleted', onNewMsg);
      socket.off('call:historyUpdated', onNewMsg);
    };
  }, [socket, loadThreads]);

  const openChat = (userId, username, userObj) => {
    setSelectedChat({ userId, username, user: userObj });
  };

  const headerBtn = {
    background: 'none',
    border: 'none',
    padding: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    color: '#262626',
  };

  const renderThreadsList = () => (
    <div className="flex flex-col h-full bg-surface border-r border-border">
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid #efefef',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#262626' }}>
          {user?.username || 'Messages'}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setShowCallHistory(true)} style={headerBtn} title="Call Logs" aria-label="Call Logs">
            <PhoneIcon size={22} />
          </button>
          <button onClick={() => setShowNewChat(true)} style={headerBtn} title="Search" aria-label="Search">
            <SearchIcon size={22} />
          </button>
        </div>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto" style={{ overscrollBehaviorY: 'contain' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Spinner size={28} />
          </div>
        ) : threads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', color: '#8e8e8e' }}>
            <svg width="48" height="48" {...ip} strokeWidth={1.3} style={{ margin: '0 auto 12px', display: 'block', color: '#dbdbdb' }}>
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 4px', color: '#262626' }}>No messages yet</p>
            <p style={{ fontSize: 14, margin: 0 }}>Start a conversation with friends</p>
          </div>
        ) : (
          threads.map(t => {
            const partner = t.user || t.partner || {};
            const lastMsg = t.lastMsg || t.lastMessage || {};
            const isMine = (lastMsg.from?._id || lastMsg.from) === user?._id;
            const lastText = lastMsg.text || '';
            let preview = '';
            if (lastMsg.type === 'media') {
              preview = isMine ? 'You: Attachment' : 'Attachment';
            } else if (lastText) {
              const sliced = lastText.length > 35 ? lastText.slice(0, 35) + '...' : lastText;
              preview = isMine ? `You: ${sliced}` : sliced;
            } else {
              preview = 'Tap to chat';
            }
            const timeStr = lastMsg.createdAt ? timeAgo(lastMsg.createdAt) : (t.lastMessageAt ? timeAgo(t.lastMessageAt) : '');
            const isSelected = selectedChat?.userId === partner._id;

            return (
              <div
                key={t._id || partner._id}
                onClick={() => openChat(partner._id, partner.username, partner)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f3f3f3',
                  background: isSelected ? 'rgba(0,149,246,0.08)' : 'transparent',
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar user={partner} size={52} fontSize={16} />
                  {t.online && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: '#22c55e',
                        border: '2px solid #fff',
                      }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#262626' }}>{partner.username}</p>
                  <p
                    style={{
                      fontSize: 13,
                      margin: '3px 0 0',
                      color: '#8e8e8e',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {preview}
                  </p>
                </div>
                {timeStr && (
                  <span style={{ fontSize: 11, color: '#8e8e8e', flexShrink: 0, alignSelf: 'flex-start', marginTop: 4 }}>
                    {timeStr}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-surface">
      {/* Thread list panel */}
      <div className={`h-full w-full flex-col flex-shrink-0 ${selectedChat ? 'hidden' : 'flex'}`}>
        {renderThreadsList()}
      </div>

      {/* Chat Window panel */}
      <div className={`h-full w-full flex-col flex-1 min-w-0 ${selectedChat ? 'flex' : 'hidden'}`}>
        {selectedChat && (
          <ChatWindow
            key={selectedChat.userId}
            partnerId={selectedChat.userId}
            partnerName={selectedChat.username}
            partnerUser={selectedChat.user}
            onBack={() => { setSelectedChat(null); loadThreads(); }}
          />
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <NewChatSearch
          onClose={() => setShowNewChat(false)}
          onSelect={(u) => { setShowNewChat(false); openChat(u._id, u.username, u); }}
        />
      )}

      {/* Call History Modal */}
      {showCallHistory && (
        <CallHistoryModal
          onClose={() => setShowCallHistory(false)}
          onCallUser={(u) => { setShowCallHistory(false); openChat(u._id, u.username, u); }}
        />
      )}
    </div>
  );
}

/* ---------- New chat search ---------- */
const MIN_QUERY = 2;

function NewChatSearch({ onClose, onSelect }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchedFor, setSearchedFor] = useState('');

  const q = query.trim();
  const tooShort = q.length < MIN_QUERY;
  const searching = !tooShort && searchedFor !== q;

  useEffect(() => {
    if (q.length < MIN_QUERY) return;
    let cancelled = false;

    const timer = setTimeout(async () => {
      let list = [];
      try {
        const data = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
        list = Array.isArray(data) ? data : data?.users || [];
      } catch {
        list = [];
      }
      if (cancelled) return;
      setResults(list.filter((u) => u._id !== user?._id));
      setSearchedFor(q);
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, user?._id]);

  const hint = {
    textAlign: 'center',
    color: '#8e8e8e',
    fontSize: 14,
    lineHeight: 1.5,
    padding: '48px 24px',
    margin: 0,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        className="animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          width: '100%',
          maxWidth: 480,
          height: '70dvh',
          borderRadius: '16px 16px 0 0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#dbdbdb' }} />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px 12px',
            flexShrink: 0,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#262626' }}>Search</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex', color: '#262626' }}
          >
            <CloseIcon />
          </button>
        </div>

        <div style={{ padding: '0 16px 12px', flexShrink: 0, borderBottom: '1px solid #efefef' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0 14px',
              height: 42,
              background: '#efefef',
              borderRadius: 10,
              boxSizing: 'border-box',
            }}
          >
            <span style={{ display: 'flex', color: '#8e8e8e' }}>
              <SearchIcon />
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users"
              autoFocus
              autoComplete="off"
              style={{
                flex: 1,
                minWidth: 0,
                height: '100%',
                padding: 0,
                fontSize: 15,
                color: '#262626',
                background: 'transparent',
                border: 'none',
                outline: 'none',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', display: 'flex', color: '#8e8e8e' }}
              >
                <CloseIcon size={16} />
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehaviorY: 'contain' }}>
          {tooShort ? (
            <p style={hint}>Type at least {MIN_QUERY} characters to search</p>
          ) : searching ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <Spinner />
            </div>
          ) : results.length === 0 ? (
            <p style={hint}>No users found for &quot;{q}&quot;</p>
          ) : (
            results.map((u) => (
              <div
                key={u._id}
                onClick={() => onSelect(u)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f3f3f3',
                }}
              >
                <Avatar user={u} size={44} fontSize={14} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#262626' }}>{u.username}</p>
                  {u.name && <p style={{ fontSize: 13, margin: '2px 0 0', color: '#8e8e8e' }}>{u.name}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Call History Modal ---------- */
function CallHistoryModal({ onClose }) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    api.get('/calls')
      .then(res => setCalls(res.calls || []))
      .catch(err => showToast(err.message))
      .finally(() => setLoading(false));
  }, [showToast]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        className="animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          width: '100%',
          maxWidth: 480,
          maxHeight: '75dvh',
          borderRadius: '16px 16px 0 0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            borderBottom: '1px solid #efefef',
            flexShrink: 0,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#262626' }}>Call History</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex', color: '#262626' }}
          >
            <CloseIcon />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <Spinner />
            </div>
          ) : calls.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#8e8e8e', fontSize: 14, padding: '48px 0', margin: 0 }}>
              No call logs found
            </p>
          ) : (
            calls.map(c => {
              const partner = c.callerId?._id === c.receiverId?._id ? c.receiverId : (c.callerId || c.receiverId);
              return (
                <div
                  key={c._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 16px',
                    borderBottom: '1px solid #f3f3f3',
                  }}
                >
                  <Avatar user={partner} size={44} fontSize={14} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#262626' }}>
                      {partner?.username || 'User'}
                    </p>
                    <p style={{ fontSize: 12, margin: '3px 0 0', color: '#8e8e8e', textTransform: 'capitalize' }}>
                      <span style={c.status === 'missed' ? { color: '#ed4956', fontWeight: 500 } : undefined}>
                        {c.status}
                      </span>
                      {' · '}{c.callType} call{' · '}{timeAgo(c.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Chat options sheet ---------- */
const REPORT_REASONS = ['Spam or fake account', 'Inappropriate content', 'Harassment', 'Scam or fraud'];

function SheetRow({ icon, label, onClick, color = '#262626', tint = '#f2f2f2' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 20px',
        background: 'none',
        border: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        fontSize: 15,
        fontWeight: 600,
        color,
      }}
    >
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: tint,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

function ChatOptionsSheet({ partnerId, partnerName, partnerUser, onClose, onProfile, onVoice, onVideo, onMedia, onBlocked }) {
  const [closing, setClosing] = useState(false);
  const [view, setView] = useState('main');
  const { showToast } = useToast();

  const close = (after) => {
    setClosing(true);
    setTimeout(() => {
      onClose();
      if (typeof after === 'function') after();
    }, 180);
  };

  const block = async () => {
    if (!confirm(`Block @${partnerName}?`)) return;
    try {
      await api.post(`/users/${partnerId}/block`);
      showToast(`@${partnerName} blocked`);
      close(onBlocked);
    } catch (err) { showToast(err.message); }
  };

  const report = async (reason) => {
    try {
      await api.post(`/users/${partnerId}/report`, { reason });
    } catch {}
    showToast('Report submitted. Thank you!');
    close();
  };

  return createPortal(
    <>
      <style>{`
        @keyframes ss-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ss-fade-out { from { opacity: 1 } to { opacity: 0 } }
        @keyframes ss-sheet-in { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes ss-sheet-out { from { transform: translateY(0) } to { transform: translateY(100%) } }
      `}</style>
      <div
        onClick={() => close()}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          animation: `${closing ? 'ss-fade-out' : 'ss-fade-in'} 0.18s ease forwards`,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#fff',
            width: '100%',
            maxWidth: 480,
            borderRadius: '20px 20px 0 0',
            overflow: 'hidden',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
            animation: `${closing ? 'ss-sheet-out' : 'ss-sheet-in'} 0.22s cubic-bezier(0.32, 0.72, 0, 1) forwards`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#dbdbdb' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 14px', gap: 8 }}>
            <Avatar user={partnerUser || { username: partnerName }} size={64} fontSize={20} />
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#262626' }}>@{partnerName}</p>
          </div>

          <div style={{ borderTop: '1px solid #efefef', paddingTop: 6 }}>
            {view === 'main' ? (
              <>
                <SheetRow
                  label="View profile"
                  onClick={() => close(onProfile)}
                  icon={<svg width="20" height="20" {...ip}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
                />
                <SheetRow
                  label="Voice call" color="#16a34a" tint="#e8f7ee"
                  onClick={() => close(onVoice)}
                  icon={<PhoneIcon size={20} />}
                />
                <SheetRow
                  label="Video call" color="#0095f6" tint="#e6f3fe"
                  onClick={() => close(onVideo)}
                  icon={<VideoIcon size={20} />}
                />
                <SheetRow
                  label="Shared media" color="#8b5cf6" tint="#f1ebfe"
                  onClick={() => close(onMedia)}
                  icon={<svg width="20" height="20" {...ip}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21,15 16,10 5,21" /></svg>}
                />
                <SheetRow
                  label="Block user" color="#ed4956" tint="#fdecee"
                  onClick={block}
                  icon={<svg width="20" height="20" {...ip}><circle cx="12" cy="12" r="10" /><line x1="4.9" y1="4.9" x2="19.1" y2="19.1" /></svg>}
                />
                <SheetRow
                  label="Report user" color="#f59e0b" tint="#fef3df"
                  onClick={() => setView('report')}
                  icon={<svg width="20" height="20" {...ip}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
                />
              </>
            ) : (
              <>
                <p style={{ margin: '4px 20px 6px', fontSize: 13, color: '#8e8e8e' }}>Why are you reporting this account?</p>
                {REPORT_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => report(r)}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      background: 'none',
                      border: 'none',
                      borderTop: '1px solid #f3f3f3',
                      textAlign: 'left',
                      fontSize: 15,
                      fontWeight: 500,
                      color: '#262626',
                      cursor: 'pointer',
                    }}
                  >
                    {r}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setView('main')}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    background: 'none',
                    border: 'none',
                    borderTop: '1px solid #f3f3f3',
                    textAlign: 'left',
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#8e8e8e',
                    cursor: 'pointer',
                  }}
                >
                  Back
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => close()}
            style={{
              width: '100%',
              padding: '14px 0',
              background: 'none',
              border: 'none',
              borderTop: '1px solid #efefef',
              fontSize: 15,
              fontWeight: 600,
              color: '#8e8e8e',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

/* ---------- Chat Window ---------- */
function ChatWindow({ partnerId, partnerName, partnerUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const [presence, setPresence] = useState({ isOnline: false, lastSeen: null });
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recTimerRef = useRef(null);

  const router = useRouter();
  const { user } = useAuth();
  const socket = useSocket();
  const { startCall } = useCall();
  const { showToast } = useToast();

  const callTarget = partnerUser || { _id: partnerId, username: partnerName };

  // Request presence
  useEffect(() => {
    if (!socket || !partnerId) return;
    socket.emit('presence:request', { targetId: partnerId });
    const onPresence = (data) => {
      if (data.userId === partnerId) {
        setPresence({ isOnline: data.isOnline, lastSeen: data.lastSeen });
      }
    };
    const onUserOnline = ({ userId }) => {
      if (userId === partnerId) setPresence(p => ({ ...p, isOnline: true }));
    };
    const onUserOffline = ({ userId, lastSeen }) => {
      if (userId === partnerId) setPresence({ isOnline: false, lastSeen });
    };
    socket.on('presence:update', onPresence);
    socket.on('user:online', onUserOnline);
    socket.on('user:offline', onUserOffline);
    return () => {
      socket.off('presence:update', onPresence);
      socket.off('user:online', onUserOnline);
      socket.off('user:offline', onUserOffline);
    };
  }, [socket, partnerId]);

  // Load messages
  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get(`/messages/${partnerId}`);
        setMessages(data);
        api.put(`/messages/seen/${partnerId}`).catch(() => {});
      } catch (err) { showToast(err.message); }
      finally { setLoading(false); }
    };
    load();
  }, [partnerId, showToast]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;
    const onMsg = (msg) => {
      if (msg.sender === partnerId || msg.sender?._id === partnerId || msg.from === partnerId || msg.from?._id === partnerId) {
        setMessages(prev => [...prev, msg]);
        api.put(`/messages/seen/${partnerId}`).catch(() => {});
      }
    };
    const onTyping = ({ from }) => {
      if (from === partnerId) {
        setTyping(true);
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setTyping(false), 2000);
      }
    };
    const onStopTyping = ({ from }) => {
      if (from === partnerId) setTyping(false);
    };

    socket.on('receive-message', onMsg);
    socket.on('typing:start', onTyping);
    socket.on('typing:stop', onStopTyping);
    return () => {
      socket.off('receive-message', onMsg);
      socket.off('typing:start', onTyping);
      socket.off('typing:stop', onStopTyping);
    };
  }, [socket, partnerId]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    const t = text;
    setText('');
    const tempMsg = { _id: 'temp_' + Date.now(), text: t, sender: user._id, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);
    try {
      // Send both field names so it works whichever one the route reads
      const msg = await api.post('/messages', { to: partnerId, receiverId: partnerId, text: t });
      setMessages(prev => prev.map(m => m._id === tempMsg._id ? msg : m));
      socket?.emit('message-sent', { to: partnerId, message: msg });
      socket?.emit('typing:stop', { to: partnerId });
    } catch (err) {
      setMessages(prev => prev.filter(m => m._id !== tempMsg._id));
      setText(t);
      showToast(err.message);
    }
  };

  const handleTyping = () => {
    socket?.emit('typing:start', { to: partnerId });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket?.emit('typing:stop', { to: partnerId });
    }, 2000);
  };

  // Upload Media
  const handleFileUpload = async (files) => {
    if (!files || !files.length) return;
    const file = files[0];
    setUploadingMedia(true);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('receiverId', partnerId);
    fd.append('to', partnerId);

    try {
      const res = await api.request('POST', '/media/upload', fd, true);
      const newMsg = res.message;
      setMessages(prev => [...prev, newMsg]);
      socket?.emit('media:message', { to: partnerId, message: newMsg });
      showToast('Media uploaded');
    } catch (err) {
      showToast(err.message || 'Upload failed');
    } finally {
      setUploadingMedia(false);
    }
  };

  const openFileInput = (acceptType) => {
    setShowAttachMenu(false);
    if (fileInputRef.current) {
      fileInputRef.current.accept = acceptType;
      fileInputRef.current.click();
    }
  };

  // Voice recorder handlers
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
        handleFileUpload([audioFile]);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(0);
      recTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      showToast('Could not access microphone');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearInterval(recTimerRef.current);
    }
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
      setRecording(false);
      clearInterval(recTimerRef.current);
    }
  };

  const callBtn = {
    ...roundBtn,
    width: 34,
    height: 34,
    background: '#efefef',
    color: '#262626',
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-shrink-0 bg-surface z-10 shadow-sm">
        <button onClick={onBack} className="bg-transparent border-none cursor-pointer text-text p-1" aria-label="Back">
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="15,18 9,12 15,6" />
          </svg>
        </button>

        {/* Tappable profile area */}
        <div
          onClick={() => setShowOptions(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, cursor: 'pointer' }}
        >
          <Avatar user={partnerUser || { username: partnerName }} size={38} fontSize={12} />
          <div style={{ minWidth: 0 }}>
            <p className="text-sm font-semibold truncate">{partnerName}</p>
            <p className="text-[11px] text-muted truncate">
              {typing ? (
                <span className="text-accent font-medium animate-pulse">typing...</span>
              ) : presence.isOnline ? (
                <span className="text-success font-medium">Online</span>
              ) : presence.lastSeen ? (
                `Last seen ${timeAgo(presence.lastSeen)}`
              ) : (
                'Offline'
              )}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => startCall(callTarget, 'voice')} style={callBtn} title="Voice Call" aria-label="Voice Call">
            <PhoneIcon />
          </button>
          <button onClick={() => startCall(callTarget, 'video')} style={callBtn} title="Video Call" aria-label="Video Call">
            <VideoIcon />
          </button>
        </div>
      </div>

      {showOptions && (
        <ChatOptionsSheet
          partnerId={partnerId}
          partnerName={partnerName}
          partnerUser={partnerUser}
          onClose={() => setShowOptions(false)}
          onProfile={() => router.push(`/profile/${partnerName}`)}
          onVoice={() => startCall(callTarget, 'voice')}
          onVideo={() => startCall(callTarget, 'video')}
          onMedia={() => setShowMediaGallery(true)}
          onBlocked={onBack}
        />
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-muted text-sm py-16">No messages yet. Say hi!</p>
        ) : (
          messages.map(msg => {
            const senderId = msg.sender?._id || msg.sender || msg.from?._id || msg.from;
            const isMine = senderId === user._id;

            return (
              <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className="relative group max-w-[80%]">
                  {msg.type === 'media' && msg.media ? (
                    <MediaBubble media={msg.media} isMine={isMine} onOpenLightbox={setLightboxImage} />
                  ) : (
                    <div className={`px-3.5 py-2 rounded-2xl text-[14px] leading-relaxed shadow-sm ${isMine ? 'bg-accent text-white rounded-br-sm' : 'bg-surface2 text-text rounded-bl-sm'}`}>
                      {msg.text}
                      {msg.edited && <span className="text-[10px] opacity-60 ml-1">(edited)</span>}
                    </div>
                  )}

                  <p className={`text-[10px] text-muted mt-0.5 px-1 ${isMine ? 'text-right' : 'text-left'}`}>
                    {timeAgo(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Uploading progress indicator */}
      {uploadingMedia && (
        <div className="px-4 py-2 bg-surface2 border-t border-border flex items-center gap-2 text-xs text-accent">
          <Spinner size={14} />
          Uploading attachment...
        </div>
      )}

      {/* Input Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          borderTop: '1px solid #efefef',
          background: '#fff',
          flexShrink: 0,
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => { handleFileUpload(e.target.files); e.target.value = ''; }}
          style={{ display: 'none' }}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip"
        />

        {/* Attachment button + menu */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            title="Attach File"
            aria-label="Attach File"
            style={{
              ...roundBtn,
              background: showAttachMenu ? '#e6f3fe' : '#efefef',
              color: showAttachMenu ? '#0095f6' : '#262626',
            }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          {showAttachMenu && (
            <>
              <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowAttachMenu(false)} />
              <div className="absolute bottom-12 left-0 z-50 bg-surface border border-border shadow-xl rounded-2xl p-1.5 flex flex-col min-w-[160px] animate-slide-up">
                <button
                  onClick={() => openFileInput('.pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.zip,application/*,text/*')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface2 transition-colors cursor-pointer border-none bg-transparent text-left w-full"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14,2 14,8 20,8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-text">Documents</span>
                </button>

                <button
                  onClick={() => openFileInput('image/*')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface2 transition-colors cursor-pointer border-none bg-transparent text-left w-full"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center flex-shrink-0">
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21,15 16,10 5,21" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-text">Photos</span>
                </button>

                <button
                  onClick={() => openFileInput('video/*')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface2 transition-colors cursor-pointer border-none bg-transparent text-left w-full"
                >
                  <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center flex-shrink-0">
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M23 7l-7 5 7 5V7z" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-text">Videos</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Recorder or text input */}
        {recording ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 16px',
              background: '#fafafa',
              border: '1px solid #f5b5ba',
              borderRadius: 999,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: '#ed4956' }}>Recording {recordingTime}s</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button onClick={cancelVoiceRecording} style={{ background: 'none', border: 'none', fontSize: 13, color: '#8e8e8e', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={stopVoiceRecording} style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: '#0095f6', cursor: 'pointer' }}>
                Send
              </button>
            </div>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={text}
              onChange={(e) => { setText(e.target.value); handleTyping(); }}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Message..."
              style={{
                flex: 1,
                minWidth: 0,
                boxSizing: 'border-box',
                padding: '10px 16px',
                fontSize: 14,
                color: '#262626',
                background: '#fafafa',
                border: '1px solid #dbdbdb',
                borderRadius: 999,
                outline: 'none',
              }}
            />

            {text.trim() ? (
              <button
                onClick={sendMessage}
                aria-label="Send"
                style={{ ...roundBtn, background: '#0095f6' }}
              >
                <svg width="17" height="17" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" />
                </svg>
              </button>
            ) : (
              <button
                onClick={startVoiceRecording}
                title="Voice Note"
                aria-label="Voice Note"
                style={{ ...roundBtn, background: '#efefef', color: '#262626' }}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[900] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <img src={lightboxImage} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
          <button
            onClick={() => setLightboxImage(null)}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <CloseIcon size={26} />
          </button>
        </div>
      )}

      {/* Media Gallery Modal */}
      {showMediaGallery && (
        <MediaGalleryModal
          chatId={[user._id, partnerId].sort().join('_')}
          onClose={() => setShowMediaGallery(false)}
        />
      )}
    </div>
  );
}

/* ---------- Media Bubble ---------- */
function MediaBubble({ media, isMine, onOpenLightbox }) {
  const { fileType, storageUrl, originalFileName, fileSize } = media;
  const name = originalFileName || 'Attachment';
  const size = formatFileSize(fileSize || 0);
  const cat = getFileCategory(fileType || '', name);

  if (fileType === 'image' || cat === 'image') {
    return (
      <div className="rounded-2xl overflow-hidden cursor-pointer shadow-sm border border-border" onClick={() => onOpenLightbox(storageUrl)}>
        <img src={storageUrl} alt={name} loading="lazy" decoding="async" className="max-w-[240px] max-h-[240px] object-cover block" />
      </div>
    );
  }

  if (fileType === 'video' || cat === 'video') {
    return (
      <div className="rounded-2xl overflow-hidden shadow-sm border border-border max-w-[260px] bg-black">
        <video src={storageUrl} controls preload="metadata" className="w-full h-full max-h-[240px] block" />
      </div>
    );
  }

  if (fileType === 'audio' || cat === 'audio') {
    return (
      <div className={`p-3 rounded-2xl flex items-center gap-3 min-w-[200px] shadow-sm ${isMine ? 'bg-accent text-white rounded-br-sm' : 'bg-surface2 text-text rounded-bl-sm'}`}>
        <MusicIcon />
        <div className="flex-1 min-w-0">
          <audio src={storageUrl} controls preload="metadata" className="w-full h-8 outline-none" />
          <p className="text-[10px] opacity-75 mt-0.5">{size}</p>
        </div>
      </div>
    );
  }

  return (
    <a
      href={storageUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`p-3 rounded-2xl flex items-center gap-3 shadow-sm max-w-[240px] no-underline ${isMine ? 'bg-accent text-white rounded-br-sm' : 'bg-surface2 text-text rounded-bl-sm'}`}
    >
      <FileIcon />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{name}</p>
        <p className="text-[10px] opacity-75">{size}</p>
      </div>
    </a>
  );
}

/* ---------- Media Gallery Modal ---------- */
function MediaGalleryModal({ chatId, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/media/chat/${chatId}`)
      .then(res => setItems(res.items || res.media || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [chatId]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        className="animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          width: '100%',
          maxWidth: 480,
          maxHeight: '80dvh',
          borderRadius: '16px 16px 0 0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            borderBottom: '1px solid #efefef',
            flexShrink: 0,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#262626' }}>Shared Media &amp; Files</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex', color: '#262626' }}
          >
            <CloseIcon />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <Spinner />
            </div>
          ) : items.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#8e8e8e', fontSize: 14, padding: '48px 0', margin: 0 }}>
              No media shared yet
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {items.map(m => (
                <a
                  key={m._id}
                  href={m.storageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    aspectRatio: '1 / 1',
                    background: '#fafafa',
                    borderRadius: 8,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #efefef',
                    color: '#8e8e8e',
                  }}
                >
                  {m.fileType === 'image' ? (
                    <img src={m.storageUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <FileIcon size={28} />
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}