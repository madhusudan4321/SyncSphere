'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Avatar from '@/components/ui/Avatar';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/socket';
import { useCall } from '@/lib/call-context';
import { useToast } from '@/components/ui/Toast';
import { timeAgo, QUICK_EMOJIS, formatFileSize, FILE_ICONS, FILE_COLORS, getFileCategory } from '@/lib/utils';

export default function ChatPage() {
  const [threads, setThreads] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
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

  const renderThreadsList = () => (
    <div className="flex flex-col h-full bg-surface border-r border-border">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-border flex items-center justify-between flex-shrink-0">
        <h2 className="text-lg font-bold">Messages</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCallHistory(true)}
            className="bg-transparent border-none cursor-pointer text-text hover:text-accent p-1 transition-colors"
            title="Call Logs"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
          </button>
          <button
            onClick={() => setShowNewChat(true)}
            className="bg-transparent border-none cursor-pointer text-text hover:text-accent p-1 transition-colors"
            title="New Chat"
          >
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-7 h-7 border-2 border-border border-t-accent rounded-full animate-spin-slow" />
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-16 text-muted px-4">
            <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="mx-auto mb-3 text-border">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <p className="text-base font-semibold mb-1">No messages yet</p>
            <p className="text-sm">Start a conversation with friends!</p>
          </div>
        ) : (
          threads.map(t => {
            const partner = t.partner || t.user || {};
            const isSelected = selectedChat?.userId === partner._id;
            return (
              <div
                key={t._id || partner._id}
                onClick={() => openChat(partner._id, partner.username, partner)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-border/40 ${
                  isSelected ? 'bg-accent/10 border-l-4 border-l-accent' : 'hover:bg-surface2'
                }`}
              >
                <div className="relative">
                  <Avatar user={partner} size={48} fontSize={15} />
                  {t.online && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-success rounded-full border-2 border-surface" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{partner.username}</p>
                  <p className="text-[13px] text-muted truncate">
                    {t.lastMessage?.type === 'media'
                      ? '📎 Attached File'
                      : t.lastMessage?.text || t.lastMessage || 'Tap to chat'}
                  </p>
                </div>
                <span className="text-[11px] text-muted flex-shrink-0">{t.lastMessageAt ? timeAgo(t.lastMessageAt) : ''}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full w-full flex flex-col md:flex-row overflow-hidden bg-surface">
      {/* Thread list panel: Full width on mobile when no chat selected, fixed width column on desktop */}
      <div className={`h-full w-full md:w-80 lg:w-96 flex-shrink-0 ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
        {renderThreadsList()}
      </div>

      {/* Chat Window panel: Full width on mobile when chat selected, flex-1 on desktop */}
      <div className={`h-full flex-1 min-w-0 ${selectedChat ? 'flex' : 'hidden md:flex'}`}>
        {selectedChat ? (
          <ChatWindow
            partnerId={selectedChat.userId}
            partnerName={selectedChat.username}
            partnerUser={selectedChat.user}
            onBack={() => { setSelectedChat(null); loadThreads(); }}
          />
        ) : (
          <div className="hidden md:flex flex-col items-center justify-center h-full w-full text-center p-8 text-muted bg-surface">
            <div className="w-20 h-20 rounded-full bg-surface2 flex items-center justify-center mb-4 border border-border">
              <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-accent">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-text mb-1">Your Messages</h3>
            <p className="text-sm max-w-xs">Send private messages and video calls to a friend or group.</p>
            <button
              onClick={() => setShowNewChat(true)}
              className="mt-5 px-5 py-2.5 bg-accent text-white font-semibold text-sm rounded-xl border-none cursor-pointer shadow-md hover:opacity-90 transition-opacity"
            >
              Send Message
            </button>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && <NewChatSearch onClose={() => setShowNewChat(false)} onSelect={(u) => { setShowNewChat(false); openChat(u._id, u.username, u); }} />}

      {/* Call History Modal */}
      {showCallHistory && <CallHistoryModal onClose={() => setShowCallHistory(false)} onCallUser={(u, type) => { setShowCallHistory(false); openChat(u._id, u.username, u); }} />}
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
            className="flex-1 bg-surface2 rounded-lg px-3.5 py-2 text-sm outline-none text-text border border-border"
          />
          <button onClick={onClose} className="text-sm font-semibold text-accent bg-transparent border-none cursor-pointer">Cancel</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {results.map(u => (
            <div key={u._id} onClick={() => onSelect(u)} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface2 rounded-xl">
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

// Call History Modal
function CallHistoryModal({ onClose, onCallUser }) {
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
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-surface w-full max-w-[480px] rounded-t-2xl max-h-[75vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-base font-bold">Call History</h3>
          <button onClick={onClose} className="text-muted font-bold text-lg bg-transparent border-none cursor-pointer">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin-slow" />
            </div>
          ) : calls.length === 0 ? (
            <p className="text-center text-muted text-sm py-12">No call logs found</p>
          ) : (
            calls.map(c => {
              const partner = c.callerId?._id === c.receiverId?._id ? c.receiverId : (c.callerId || c.receiverId);
              return (
                <div key={c._id} className="flex items-center justify-between px-4 py-3 hover:bg-surface2 rounded-xl border-b border-border/30">
                  <div className="flex items-center gap-3">
                    <Avatar user={partner} size={40} fontSize={14} />
                    <div>
                      <p className="text-sm font-semibold">{partner?.username || 'User'}</p>
                      <p className="text-xs text-muted capitalize flex items-center gap-1">
                        <span className={c.status === 'missed' ? 'text-danger font-medium' : ''}>
                          {c.status}
                        </span>
                        • {c.callType} call • {timeAgo(c.createdAt)}
                      </p>
                    </div>
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

// Chat Window
function ChatWindow({ partnerId, partnerName, partnerUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const [presence, setPresence] = useState({ isOnline: false, lastSeen: null });
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recTimerRef = useRef(null);

  const { user } = useAuth();
  const socket = useSocket();
  const { startCall } = useCall();
  const { showToast } = useToast();

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
      const msg = await api.post('/messages', { receiverId: partnerId, text: t });
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

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-shrink-0 bg-surface z-10 shadow-sm">
        <button onClick={onBack} className="bg-transparent border-none cursor-pointer text-text p-1">
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="15,18 9,12 15,6" />
          </svg>
        </button>
        <Avatar user={{ username: partnerName }} size={36} fontSize={12} />
        <div className="flex-1 min-w-0">
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

        {/* Action Buttons: Voice Call, Video Call, Media Gallery */}
        <div className="flex items-center gap-2">
          {/* Voice Call */}
          <button
            onClick={() => startCall(partnerUser || { _id: partnerId, username: partnerName }, 'voice')}
            className="w-8 h-8 rounded-full bg-surface2 flex items-center justify-center cursor-pointer text-text hover:text-accent transition-colors"
            title="Voice Call"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
          </button>

          {/* Video Call */}
          <button
            onClick={() => startCall(partnerUser || { _id: partnerId, username: partnerName }, 'video')}
            className="w-8 h-8 rounded-full bg-surface2 flex items-center justify-center cursor-pointer text-text hover:text-accent transition-colors"
            title="Video Call"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </button>

          {/* Media Gallery */}
          <button
            onClick={() => setShowMediaGallery(true)}
            className="w-8 h-8 rounded-full bg-surface2 flex items-center justify-center cursor-pointer text-text hover:text-accent transition-colors"
            title="Shared Media"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21,15 16,10 5,21" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin-slow" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-muted text-sm py-16">No messages yet. Say hi! 👋</p>
        ) : (
          messages.map(msg => {
            const senderId = msg.sender?._id || msg.sender || msg.from?._id || msg.from;
            const isMine = senderId === user._id;

            return (
              <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className="relative group max-w-[80%]">
                  {/* Media Bubble */}
                  {msg.type === 'media' && msg.media ? (
                    <MediaBubble media={msg.media} isMine={isMine} onOpenLightbox={setLightboxImage} />
                  ) : (
                    /* Text Bubble */
                    <div className={`px-3.5 py-2 rounded-2xl text-[14px] leading-relaxed shadow-sm ${isMine ? 'bg-accent text-white rounded-br-sm' : 'bg-surface2 text-text rounded-bl-sm'}`}>
                      {msg.text}
                      {msg.edited && <span className="text-[10px] opacity-60 ml-1">(edited)</span>}
                    </div>
                  )}

                  {/* Time & Status */}
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
          <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          Uploading attachment...
        </div>
      )}

      {/* Input Bar */}
      <div className="px-3 py-2.5 border-t border-border flex items-center gap-2 flex-shrink-0 bg-surface">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileUpload(e.target.files)}
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip"
        />

        {/* Media Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-9 h-9 rounded-full bg-surface2 flex items-center justify-center text-text hover:text-accent cursor-pointer transition-colors flex-shrink-0"
          title="Attach File"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        {/* Voice Note Recorder or Text Input */}
        {recording ? (
          <div className="flex-1 bg-surface2 rounded-full py-1.5 px-4 flex items-center justify-between border border-danger/40 animate-pulse">
            <span className="text-xs text-danger font-semibold flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-danger rounded-full animate-ping" />
              Recording {recordingTime}s
            </span>
            <div className="flex items-center gap-2">
              <button onClick={cancelVoiceRecording} className="text-xs text-muted cursor-pointer bg-transparent border-none">Cancel</button>
              <button onClick={stopVoiceRecording} className="text-xs text-accent font-bold cursor-pointer bg-transparent border-none">Send</button>
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
              className="flex-1 bg-surface2 rounded-full py-2 px-4 text-sm outline-none text-text border border-border"
            />

            {text.trim() ? (
              <button
                onClick={sendMessage}
                className="bg-accent border-none rounded-full w-9 h-9 flex items-center justify-center cursor-pointer flex-shrink-0 hover:scale-105 transition-transform"
              >
                <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" />
                </svg>
              </button>
            ) : (
              <button
                onClick={startVoiceRecording}
                className="w-9 h-9 rounded-full bg-surface2 flex items-center justify-center text-text hover:text-accent cursor-pointer transition-colors flex-shrink-0"
                title="Voice Note"
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
        <div className="fixed inset-0 z-[900] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
          <img src={lightboxImage} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
          <button onClick={() => setLightboxImage(null)} className="absolute top-4 right-4 text-white text-2xl font-bold bg-transparent border-none cursor-pointer">✕</button>
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

// Media Bubble Renderer
function MediaBubble({ media, isMine, onOpenLightbox }) {
  const { fileType, storageUrl, originalFileName, fileSize } = media;
  const name = originalFileName || 'Attachment';
  const size = formatFileSize(fileSize || 0);
  const cat = getFileCategory(fileType || '', name);

  if (fileType === 'image' || cat === 'image') {
    return (
      <div className="rounded-2xl overflow-hidden cursor-pointer shadow-sm border border-border" onClick={() => onOpenLightbox(storageUrl)}>
        <img src={storageUrl} alt={name} className="max-w-[240px] max-h-[240px] object-cover block" />
      </div>
    );
  }

  if (fileType === 'video' || cat === 'video') {
    return (
      <div className="rounded-2xl overflow-hidden shadow-sm border border-border max-w-[260px] bg-black">
        <video src={storageUrl} controls className="w-full h-full max-h-[240px] block" />
      </div>
    );
  }

  if (fileType === 'audio' || cat === 'audio') {
    return (
      <div className={`p-3 rounded-2xl flex items-center gap-3 min-w-[200px] shadow-sm ${isMine ? 'bg-accent text-white rounded-br-sm' : 'bg-surface2 text-text rounded-bl-sm'}`}>
        <span className="text-xl">🎵</span>
        <div className="flex-1 min-w-0">
          <audio src={storageUrl} controls className="w-full h-8 outline-none" />
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
      <span className="text-2xl">{FILE_ICONS[cat] || '📄'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{name}</p>
        <p className="text-[10px] opacity-75">{size}</p>
      </div>
    </a>
  );
}

// Media Gallery Modal
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
    <div className="fixed inset-0 z-[400] bg-black/60 flex items-end justify-center" onClick={onClose}>
      <div className="bg-surface w-full max-w-[480px] rounded-t-2xl max-h-[80vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-base font-bold">Shared Media & Files</h3>
          <button onClick={onClose} className="text-muted font-bold text-lg bg-transparent border-none cursor-pointer">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin-slow" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-muted text-sm py-12">No media shared yet</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {items.map(m => (
                <a key={m._id} href={m.storageUrl} target="_blank" rel="noopener noreferrer" className="aspect-square bg-surface2 rounded-lg overflow-hidden flex items-center justify-center border border-border">
                  {m.fileType === 'image' ? (
                    <img src={m.storageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">{FILE_ICONS[m.fileType] || '📎'}</span>
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
