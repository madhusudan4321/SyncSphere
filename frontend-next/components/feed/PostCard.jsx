'use client';

import { useState, useEffect } from 'react';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import api from '@/lib/api';
import { timeAgo, QUICK_EMOJIS } from '@/lib/utils';

export default function PostCard({ post, onDelete, onUpdate }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [liked, setLiked] = useState(post.likes?.includes(user?._id));
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0);
  const [saved, setSaved] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [caption, setCaption] = useState(post.caption || '');
  const isOwn = post.user?._id === user?._id;

  const toggleLike = async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(c => wasLiked ? c - 1 : c + 1);
    try {
      await api.post(`/posts/${post._id}/like`);
    } catch {
      setLiked(wasLiked);
      setLikeCount(c => wasLiked ? c + 1 : c - 1);
    }
  };

  const deletePost = async () => {
    if (!confirm('Delete this post?')) return;
    try {
      await api.del(`/posts/${post._id}`);
      showToast('Post deleted');
      onDelete?.(post._id);
    } catch (err) { showToast(err.message); }
    setShowMenu(false);
  };

  const saveCaption = async () => {
    try {
      await api.put(`/posts/${post._id}`, { caption });
      showToast('Caption updated');
      onUpdate?.(post._id, { caption });
      setEditingCaption(false);
    } catch (err) { showToast(err.message); }
  };

  const sharePost = () => {
    if (navigator.share) {
      navigator.share({ title: 'Check this post', url: window.location.origin + `/post/${post._id}` });
    } else {
      navigator.clipboard.writeText(window.location.origin + `/post/${post._id}`);
      showToast('Link copied!');
    }
    setShowMenu(false);
  };

  return (
    <div className="bg-surface border-b border-border">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <Avatar user={post.user} size={34} fontSize={12} className="cursor-pointer" />
        <span className="text-[13px] font-semibold cursor-pointer flex-1">{post.user?.username}</span>
        <button onClick={() => setShowMenu(!showMenu)} className="bg-transparent border-none cursor-pointer text-text p-1">
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Post Menu */}
      {showMenu && (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-end justify-center" onClick={() => setShowMenu(false)}>
          <div className="bg-surface w-full max-w-[480px] rounded-t-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-3 flex justify-center"><div className="w-9 h-1 bg-border rounded-full" /></div>
            {isOwn && (
              <>
                <button onClick={() => { setEditingCaption(true); setShowMenu(false); }} className="w-full flex items-center gap-4 px-6 py-4 cursor-pointer border-b border-border hover:bg-surface2 bg-transparent text-left text-[15px] font-semibold text-text">
                  ✏️ Edit Caption
                </button>
                <button onClick={deletePost} className="w-full flex items-center gap-4 px-6 py-4 cursor-pointer border-b border-border hover:bg-surface2 bg-transparent text-left text-[15px] font-semibold text-danger">
                  🗑️ Delete Post
                </button>
              </>
            )}
            <button onClick={sharePost} className="w-full flex items-center gap-4 px-6 py-4 cursor-pointer border-b border-border hover:bg-surface2 bg-transparent text-left text-[15px] font-semibold text-text">
              🔗 Share
            </button>
            <button onClick={() => setShowMenu(false)} className="w-full py-4 text-center text-[15px] font-semibold text-muted cursor-pointer hover:bg-surface2 bg-transparent border-none">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Image */}
      <div className="w-full max-h-[600px] bg-surface2 flex items-center justify-center text-7xl overflow-hidden">
        {post.image ? (
          <img src={post.image} alt="" className="w-full h-full max-h-[600px] object-contain block bg-surface2" onDoubleClick={toggleLike} />
        ) : (
          <span className="py-16">{post.emoji || '📷'}</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3.5 px-3.5 pt-2.5 pb-1.5">
        <button onClick={toggleLike} className="bg-transparent border-none cursor-pointer p-0">
          <svg width="24" height="24" fill={liked ? '#ed4956' : 'none'} stroke={liked ? '#ed4956' : 'currentColor'} strokeWidth="2" viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </button>
        <button onClick={() => setShowComments(!showComments)} className="bg-transparent border-none cursor-pointer p-0">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </button>
        <button onClick={sharePost} className="bg-transparent border-none cursor-pointer p-0">
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" />
          </svg>
        </button>
        <button onClick={() => setSaved(!saved)} className="bg-transparent border-none cursor-pointer p-0 ml-auto">
          <svg width="22" height="22" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
        </button>
      </div>

      {/* Likes */}
      {likeCount > 0 && (
        <p className="px-3.5 pb-1 text-[13px] font-semibold">{likeCount} {likeCount === 1 ? 'like' : 'likes'}</p>
      )}

      {/* Caption */}
      <div className="px-3.5 pb-2 text-[13px] leading-relaxed">
        {editingCaption ? (
          <div className="flex gap-2 items-end">
            <textarea value={caption} onChange={e => setCaption(e.target.value)} className="flex-1 border border-border rounded-lg p-2 text-[13px] outline-none resize-none bg-surface2 text-text" rows={2} />
            <button onClick={saveCaption} className="text-accent text-sm font-semibold bg-transparent border-none cursor-pointer">Save</button>
            <button onClick={() => { setEditingCaption(false); setCaption(post.caption || ''); }} className="text-muted text-sm bg-transparent border-none cursor-pointer">Cancel</button>
          </div>
        ) : (
          post.caption && <p><strong className="font-semibold cursor-pointer mr-1">{post.user?.username}</strong>{post.caption}</p>
        )}
      </div>

      {/* Tags */}
      {post.taggedUsers?.length > 0 && (
        <p className="px-3.5 pb-1 text-[11px] text-muted">
          with {post.taggedUsers.map(t => `@${t.username}`).join(', ')}
        </p>
      )}

      {/* Time */}
      <p className="px-3.5 pb-2.5 text-[11px] text-muted uppercase tracking-wide">
        {timeAgo(post.createdAt)}
      </p>

      {/* Inline Comments */}
      {showComments && (
        <CommentsSection postId={post._id} />
      )}
    </div>
  );
}

// Inline comments section
function CommentsSection({ postId }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');

  const load = async () => {
    try {
      const data = await api.get(`/posts/${postId}/comments`);
      setComments(data);
    } catch (err) { showToast(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!text.trim()) return;
    const t = text;
    setText('');
    try {
      await api.post(`/posts/${postId}/comments`, { text: t });
      load();
    } catch (err) { showToast(err.message); setText(t); }
  };

  const remove = async (commentId) => {
    try {
      await api.del(`/posts/${postId}/comments/${commentId}`);
      load();
    } catch (err) { showToast(err.message); }
  };

  return (
    <div className="border-t border-border">
      {loading ? (
        <div className="p-4 flex justify-center">
          <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin-slow" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-center text-muted text-sm py-6">No comments yet</p>
      ) : (
        <div className="max-h-60 overflow-y-auto">
          {comments.map(c => (
            <div key={c._id} className="flex items-start gap-2.5 px-3.5 py-2.5 border-b border-border last:border-none">
              <Avatar user={c.user} size={28} fontSize={10} />
              <div className="flex-1 min-w-0">
                <span className="font-bold text-[13px] mr-1.5">{c.user?.username}</span>
                <span className="text-[13px]">{c.text}</span>
                <p className="text-[11px] text-muted mt-0.5">{timeAgo(c.createdAt)}</p>
              </div>
              {c.user?._id === user?._id && (
                <button onClick={() => remove(c._id)} className="bg-transparent border-none text-muted cursor-pointer text-lg leading-none">×</button>
              )}
            </div>
          ))}
        </div>
      )}
      {/* Input */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-t border-border">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Add a comment..."
          maxLength={500}
          className="flex-1 border border-border rounded-full py-2 px-4 text-sm outline-none bg-surface2 text-text"
        />
        <button onClick={submit} className="bg-accent border-none rounded-full w-8 h-8 flex items-center justify-center cursor-pointer flex-shrink-0">
          <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" />
          </svg>
        </button>
      </div>
    </div>
  );
}
