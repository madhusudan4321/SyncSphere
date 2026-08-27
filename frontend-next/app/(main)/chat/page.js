'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Avatar from '@/components/ui/Avatar';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/socket';
import { useToast } from '@/components/ui/Toast';
import { timeAgo, QUICK_EMOJIS } from '@/lib/utils';

export default function ChatPage() {
  const [threads, setThreads] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const { user } = useAuth();
  const socket = useSocket();
  const { showToast } = useToast();

  const loadThreads = useCallback(async () => {
    try {
      const data = await api.get('/messages/threads');
      setThreads(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  // Socket: new messages update thread list
  useEffect(() => {
    if (!socket) return;
    const onNewMsg = () => loadThreads();
    socket.on('receive-message', onNewMsg);
    socket.on('message:updated', onNewMsg);
    socket.on('message:deleted', onNewMsg);
    return () => {
      socket.off('receive-message', onNewMsg);
      socket.off('message:updated', onNewMsg);
      socket.off('message:deleted', onNewMsg);
    };
  }, [socket, loadThreads]);

  const openChat = (userId, username) => {
    setSelectedChat({ userId, username });
  };

  // Show chat window if selected, otherwise thread list
  if (selectedChat) {
    return (
      <ChatWindow
        partnerId={selectedChat.userId}
        partnerName={selectedChat.username}
        onBack={() => { setSelectedChat(null); loadThreads(); }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-border flex items-center justify-between flex-shrink-0">
        <h2 className="text-lg font-bold">Messages</h2>
        <button onClick={() => setShowNewChat(true)} className="bg-transparent border-none cursor-pointer text-text">
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-7 h-7 border-2 border-border border-t-accent rounded-full animate-spin-slow" />
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="mx-auto mb-3 text-border">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <p className="text-base font-semibold mb-1">No messages yet</p>
            <p className="text-sm">Start a conversation!</p>
          </div>
        ) : (
          threads.map(t => {
            const partner = t.partner || t.user || {};
            return (
              <div
                key={t._id || partner._id}
                onClick={() => openChat(partner._id, partner.username)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface2 transition-colors"
              >
                <div className="relative">
                  <Avatar user={partner} size={50} fontSize={16} />
                  {t.online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-surface" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{partner.username}</p>
                  <p className="text-[13px] text-muted truncate">{t.lastMessage?.text || t.lastMessage || 'Tap to chat'}</p>
                </div>
                <span className="text-[11px] text-muted flex-shrink-0">{t.lastMessageAt ? timeAgo(t.lastMessageAt) : ''}</span>
              </div>
            );
          })
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && <NewChatSearch onClose={() => setShowNewChat(false)} onSelect={(u) => { setShowNewChat(false); openChat(u._id, u.username); }} />}
    </div>
  );
}

// New chat search overlay
function NewChatSearch({ onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const data = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
        setResults(data);
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-surface w-full max-w-[480px] rounded-t-2xl max-h-[70vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex items-center gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users..."
            autoFocus
            className="flex-1 bg-surface2 rounded-lg px-3 py-2 text-sm outline-none text-text"
          />
          <button onClick={onClose} className="text-sm font-semibold text-accent bg-transparent border-none cursor-pointer">Cancel</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {results.map(u => (
            <div key={u._id} onClick={() => onSelect(u)} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface2">
              <Avatar user={u} size={40} fontSize={14} />
              <div>
                <p className="text-sm font-semibold">{u.username}</p>
                <p className="text-xs text-muted">{u.name || ''}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Chat Window
function ChatWindow({ partnerId, partnerName, onBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const { user } = useAuth();
  const socket = useSocket();
  const { showToast } = useToast();

  // Load messages
  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get(`/messages/${partnerId}`);
        setMessages(data);
        // Mark as seen
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
      if (msg.sender === partnerId || msg.sender?._id === partnerId) {
        setMessages(prev => [...prev, msg]);
        api.put(`/messages/seen/${partnerId}`).catch(() => {});
      }
    };
    const onTyping = ({ userId }) => {
      if (userId === partnerId) {
        setTyping(true);
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setTyping(false), 2000);
      }
    };
    const onStopTyping = ({ userId }) => {
      if (userId === partnerId) setTyping(false);
    };
    const onUpdated = ({ messageId, text: newText }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, text: newText, edited: true } : m));
    };
    const onDeleted = ({ messageId }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
    };

    socket.on('receive-message', onMsg);
    socket.on('user:typing', onTyping);
    socket.on('user:stopTyping', onStopTyping);
    socket.on('message:updated', onUpdated);
    socket.on('message:deleted', onDeleted);
    return () => {
      socket.off('receive-message', onMsg);
      socket.off('user:typing', onTyping);
      socket.off('user:stopTyping', onStopTyping);
      socket.off('message:updated', onUpdated);
      socket.off('message:deleted', onDeleted);
    };
  }, [socket, partnerId]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    const t = text;
    setText('');
    // Optimistic
    const tempMsg = { _id: 'temp_' + Date.now(), text: t, sender: user._id, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);
    try {
      const msg = await api.post('/messages', { receiverId: partnerId, text: t });
      setMessages(prev => prev.map(m => m._id === tempMsg._id ? msg : m));
      socket?.emit('send-message', { to: partnerId, message: msg });
      socket?.emit('user:stopTyping', { to: partnerId });
    } catch (err) {
      setMessages(prev => prev.filter(m => m._id !== tempMsg._id));
      setText(t);
      showToast(err.message);
    }
  };

  const handleTyping = () => {
    socket?.emit('user:typing', { to: partnerId });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket?.emit('user:stopTyping', { to: partnerId });
    }, 2000);
  };

  const deleteMessage = async (msgId) => {
    try {
      await api.del(`/messages/${msgId}`);
      setMessages(prev => prev.filter(m => m._id !== msgId));
      socket?.emit('message:delete', { to: partnerId, messageId: msgId });
    } catch (err) { showToast(err.message); }
  };

  const reactToMessage = async (msgId, emoji) => {
    try {
      await api.post(`/messages/${msgId}/react`, { emoji });
      setMessages(prev => prev.map(m => {
        if (m._id !== msgId) return m;
        const reactions = { ...(m.reactions || {}) };
        reactions[user._id] = emoji;
        return { ...m, reactions };
      }));
      socket?.emit('message:reaction', { to: partnerId, messageId: msgId, emoji });
    } catch (err) { showToast(err.message); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-shrink-0 bg-surface">
        <button onClick={onBack} className="bg-transparent border-none cursor-pointer text-text flex p-0">
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="15,18 9,12 15,6" />
          </svg>
        </button>
        <Avatar user={{ username: partnerName }} size={34} fontSize={12} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{partnerName}</p>
          {typing && <p className="text-[11px] text-accent">typing...</p>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin-slow" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-muted text-sm py-16">No messages yet. Say hi! 👋</p>
        ) : (
          messages.map(msg => {
            const isMine = (msg.sender === user._id || msg.sender?._id === user._id);
            return (
              <div key={msg._id} className={`flex mb-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className="relative group max-w-[75%]">
                  <div className={`px-3 py-2 rounded-2xl text-[14px] leading-relaxed ${isMine ? 'bg-accent text-white rounded-br-sm' : 'bg-surface2 text-text rounded-bl-sm'}`}>
                    {msg.text}
                    {msg.edited && <span className="text-[10px] opacity-60 ml-1">(edited)</span>}
                  </div>
                  {/* Reactions */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className={`flex gap-0.5 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      {Object.values(msg.reactions).map((emoji, i) => (
                        <span key={i} className="text-xs bg-surface2 rounded-full px-1">{emoji}</span>
                      ))}
                    </div>
                  )}
                  {/* Time */}
                  <p className={`text-[10px] text-muted mt-0.5 ${isMine ? 'text-right' : 'text-left'}`}>
                    {timeAgo(msg.createdAt)}
                  </p>
                  {/* Actions on hover */}
                  <div className={`absolute top-0 ${isMine ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} hidden group-hover:flex items-center gap-1 px-1`}>
                    {QUICK_EMOJIS.slice(0, 3).map(emoji => (
                      <button key={emoji} onClick={() => reactToMessage(msg._id, emoji)} className="text-sm bg-transparent border-none cursor-pointer hover:scale-125 transition-transform">{emoji}</button>
                    ))}
                    {isMine && (
                      <button onClick={() => deleteMessage(msg._id)} className="text-xs text-danger bg-transparent border-none cursor-pointer">🗑️</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-border flex items-center gap-2 flex-shrink-0 bg-surface">
        <input
          type="text"
          value={text}
          onChange={(e) => { setText(e.target.value); handleTyping(); }}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Message..."
          className="flex-1 bg-surface2 rounded-full py-2 px-4 text-sm outline-none text-text border border-border"
        />
        <button
          onClick={sendMessage}
          disabled={!text.trim()}
          className="bg-accent border-none rounded-full w-9 h-9 flex items-center justify-center cursor-pointer disabled:opacity-50 flex-shrink-0"
        >
          <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" />
          </svg>
        </button>
      </div>
    </div>
  );
}
