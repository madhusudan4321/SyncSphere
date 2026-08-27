'use client';

import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { timeAgo } from '@/lib/utils';
import { useState, useEffect } from 'react';

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

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="w-10 h-1 bg-border rounded-full" />
        <h3 className="text-base font-bold">Comments</h3>
        <button onClick={onClose} className="bg-transparent border-none text-2xl cursor-pointer text-text leading-none">×</button>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin-slow" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-muted text-sm py-10">No comments yet.<br />Be the first to comment!</p>
        ) : (
          comments.map(c => (
            <div key={c._id} className="flex items-start gap-2.5 px-4 py-3 border-b border-border last:border-none">
              <Avatar user={c.user} size={32} fontSize={11} />
              <div className="flex-1 min-w-0">
                <span className="font-bold text-[13px] cursor-pointer">{c.user?.username}</span>
                <span className="text-[13px] ml-1.5">{c.text}</span>
                <p className="text-[11px] text-muted mt-0.5">{timeAgo(c.createdAt)}</p>
              </div>
              {c.user?._id === user?._id && (
                <button onClick={() => remove(c._id)} className="bg-transparent border-none text-muted cursor-pointer text-lg leading-none flex-shrink-0">×</button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-t border-border flex-shrink-0 bg-surface">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Add a comment..."
          maxLength={500}
          className="flex-1 border border-border rounded-full py-2 px-4 text-sm outline-none bg-surface2 text-text"
        />
        <button onClick={submit} className="bg-accent border-none rounded-full w-9 h-9 flex items-center justify-center cursor-pointer flex-shrink-0">
          <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" />
          </svg>
        </button>
      </div>
    </Modal>
  );
}
