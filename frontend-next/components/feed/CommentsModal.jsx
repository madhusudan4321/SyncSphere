'use client';

import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { timeAgo } from '@/lib/utils';
import { useState, useEffect } from 'react';

const S = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid #efefef',
    flexShrink: 0,
  },
  title: { fontSize: 16, fontWeight: 700, margin: 0, color: '#262626' },
  iconBtn: {
    background: 'none',
    border: 'none',
    padding: 4,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    color: '#262626',
  },
  list: { flex: 1, overflowY: 'auto', padding: '8px 0' },
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '12px 16px',
  },
  body: { flex: 1, minWidth: 0 },
  username: { fontSize: 13, fontWeight: 700, color: '#262626', marginRight: 6 },
  text: { fontSize: 14, lineHeight: 1.45, color: '#262626', wordBreak: 'break-word' },
  time: { fontSize: 12, color: '#8e8e8e', margin: '4px 0 0' },
  empty: {
    textAlign: 'center',
    color: '#8e8e8e',
    fontSize: 14,
    lineHeight: 1.6,
    padding: '48px 16px',
    margin: 0,
  },
  inputBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    borderTop: '1px solid #efefef',
    background: '#fff',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    boxSizing: 'border-box',
    padding: '10px 16px',
    fontSize: 14,
    color: '#262626',
    background: '#fafafa',
    border: '1px solid #dbdbdb',
    borderRadius: 999,
    outline: 'none',
  },
  sendBtn: {
    width: 38,
    height: 38,
    flexShrink: 0,
    border: 'none',
    borderRadius: '50%',
    background: '#0095f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
};

export default function CommentsModal({ isOpen, onClose, postId, onCountChange }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const { user } = useAuth();
  const { showToast } = useToast();

  const load = async () => {
    if (!postId) return;
    try {
      const data = await api.get(`/posts/${postId}/comments`);
      setComments(data);
    } catch (err) { showToast(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (isOpen && postId) {
      setLoading(true);
      load();
    }
  }, [isOpen, postId]);

  const submit = async () => {
    if (!text.trim()) return;
    const t = text;
    setText('');
    try {
      await api.post(`/posts/${postId}/comments`, { text: t });
      load();
      onCountChange?.(1);
    } catch (err) { showToast(err.message); setText(t); }
  };

  const remove = async (commentId) => {
    try {
      await api.del(`/posts/${postId}/comments/${commentId}`);
      load();
      onCountChange?.(-1);
    } catch (err) { showToast(err.message); }
  };

  const canSend = text.trim().length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ width: 28 }} />
        <h3 style={S.title}>Comments</h3>
        <button onClick={onClose} aria-label="Close" style={S.iconBtn}>
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Comments list */}
      <div style={S.list}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <style>{`@keyframes ss-spin { to { transform: rotate(360deg); } }`}</style>
            <div
              style={{
                width: 24,
                height: 24,
                border: '2px solid #dbdbdb',
                borderTopColor: '#0095f6',
                borderRadius: '50%',
                animation: 'ss-spin 0.8s linear infinite',
              }}
            />
          </div>
        ) : comments.length === 0 ? (
          <p style={S.empty}>
            No comments yet.
            <br />
            Be the first to comment!
          </p>
        ) : (
          comments.map((c) => (
            <div key={c._id} style={S.row}>
              <Avatar user={c.user} size={36} fontSize={12} />
              <div style={S.body}>
                <div>
                  <span style={S.username}>{c.user?.username}</span>
                  <span style={S.text}>{c.text}</span>
                </div>
                <p style={S.time}>{timeAgo(c.createdAt)}</p>
              </div>
              {c.user?._id === user?._id && (
                <button onClick={() => remove(c._id)} aria-label="Delete comment" style={{ ...S.iconBtn, color: '#8e8e8e' }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div style={S.inputBar}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Add a comment..."
          maxLength={500}
          style={S.input}
        />
        <button
          onClick={submit}
          disabled={!canSend}
          aria-label="Send comment"
          style={{ ...S.sendBtn, opacity: canSend ? 1 : 0.5, cursor: canSend ? 'pointer' : 'default' }}
        >
          <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" />
          </svg>
        </button>
      </div>
    </Modal>
  );
}