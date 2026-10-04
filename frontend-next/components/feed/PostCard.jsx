'use client';

import { useState, useEffect } from 'react';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import api from '@/lib/api';
import { timeAgo } from '@/lib/utils';

const iconProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const Icons = {
  edit: (
    <svg {...iconProps}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
  trash: (
    <svg {...iconProps}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  ),
  link: (
    <svg {...iconProps}>
      <path d="M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  ),
  image: (
    <svg {...iconProps} width={40} height={40} strokeWidth={1.2}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21,15 16,10 5,21" />
    </svg>
  ),
};

const S = {
  card: { background: '#fff', borderBottom: '1px solid #efefef', paddingBottom: 4 },
  header: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' },
  username: { fontSize: 14, fontWeight: 600, color: '#262626', flex: 1, cursor: 'pointer' },
  iconBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    color: '#262626',
  },
  media: {
    width: '100%',
    height: 'min(52dvh, 460px)',
    background: '#fafafa',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    color: '#8e8e8e',
  },
  actions: { display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px 8px' },
  likes: { fontSize: 14, fontWeight: 600, color: '#262626', margin: 0, padding: '0 16px 6px' },
  caption: { fontSize: 14, lineHeight: 1.5, color: '#262626', margin: 0, padding: '0 16px 6px', wordBreak: 'break-word' },
  tags: { fontSize: 12, color: '#8e8e8e', margin: 0, padding: '0 16px 6px' },
  time: {
    fontSize: 11,
    color: '#8e8e8e',
    margin: 0,
    padding: '2px 16px 12px',
    textTransform: 'uppercase',
    letterSpacing: '.3px',
  },
  menuItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '16px 24px',
    background: 'none',
    border: 'none',
    borderTop: '1px solid #efefef',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 600,
    color: '#262626',
  },
};

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...S.menuItem, color: danger ? '#ed4956' : '#262626' }}
    >
      <span style={{ display: 'flex' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

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
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1));
    try {
      await api.post(`/posts/${post._id}/like`);
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => (wasLiked ? c + 1 : c - 1));
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
    <div style={S.card}>
      {/* Header */}
      <div style={S.header}>
        <Avatar user={post.user} size={36} fontSize={12} className="cursor-pointer" />
        <span style={S.username}>{post.user?.username}</span>
        <button onClick={() => setShowMenu(!showMenu)} aria-label="More options" style={{ ...S.iconBtn, padding: 4 }}>
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Post Menu */}
      {showMenu && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          onClick={() => setShowMenu(false)}
        >
          <div
            style={{
              background: '#fff',
              width: '100%',
              maxWidth: 480,
              borderRadius: '16px 16px 0 0',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#dbdbdb' }} />
            </div>
            {isOwn && (
              <>
                <MenuItem
                  icon={Icons.edit}
                  label="Edit Caption"
                  onClick={() => { setEditingCaption(true); setShowMenu(false); }}
                />
                <MenuItem icon={Icons.trash} label="Delete Post" danger onClick={deletePost} />
              </>
            )}
            <MenuItem icon={Icons.link} label="Share" onClick={sharePost} />
            <button
              type="button"
              onClick={() => setShowMenu(false)}
              style={{
                width: '100%',
                padding: '16px 0',
                background: 'none',
                border: 'none',
                borderTop: '1px solid #efefef',
                fontSize: 15,
                fontWeight: 600,
                color: '#737373',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Image */}
      <div style={S.media}>
        {post.image ? (
          <img
            src={post.image}
            alt=""
            loading="lazy"
            decoding="async"
            onDoubleClick={toggleLike}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        ) : (
          <div>{Icons.image}</div>
        )}
      </div>

      {/* Actions */}
      <div style={S.actions}>
        <button onClick={toggleLike} aria-label="Like" style={S.iconBtn}>
          <svg width="26" height="26" fill={liked ? '#ed4956' : 'none'} stroke={liked ? '#ed4956' : 'currentColor'} strokeWidth="2" viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </button>
        <button onClick={() => setShowComments(!showComments)} aria-label="Comments" style={S.iconBtn}>
          <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </button>
        <button onClick={sharePost} aria-label="Share" style={S.iconBtn}>
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" />
          </svg>
        </button>
        <button onClick={() => setSaved(!saved)} aria-label="Save" style={{ ...S.iconBtn, marginLeft: 'auto' }}>
          <svg width="24" height="24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
        </button>
      </div>

      {/* Likes */}
      {likeCount > 0 && (
        <p style={S.likes}>{likeCount} {likeCount === 1 ? 'like' : 'likes'}</p>
      )}

      {/* Caption */}
      {editingCaption ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', padding: '0 16px 8px' }}>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={2}
            style={{
              flex: 1,
              boxSizing: 'border-box',
              padding: '8px 10px',
              fontSize: 14,
              color: '#262626',
              background: '#fafafa',
              border: '1px solid #dbdbdb',
              borderRadius: 8,
              outline: 'none',
              resize: 'none',
            }}
          />
          <button onClick={saveCaption} style={{ ...S.iconBtn, color: '#0095f6', fontSize: 14, fontWeight: 600 }}>
            Save
          </button>
          <button
            onClick={() => { setEditingCaption(false); setCaption(post.caption || ''); }}
            style={{ ...S.iconBtn, color: '#8e8e8e', fontSize: 14 }}
          >
            Cancel
          </button>
        </div>
      ) : (
        post.caption && (
          <p style={S.caption}>
            <strong style={{ fontWeight: 600, marginRight: 6, cursor: 'pointer' }}>{post.user?.username}</strong>
            {post.caption}
          </p>
        )
      )}

      {/* Tags */}
      {post.taggedUsers?.length > 0 && (
        <p style={S.tags}>with {post.taggedUsers.map((t) => `@${t.username}`).join(', ')}</p>
      )}

      {/* Time */}
      <p style={S.time}>{timeAgo(post.createdAt)}</p>

      {/* Inline Comments */}
      {showComments && <CommentsSection postId={post._id} />}
    </div>
  );
}

// Inline comments section
const C = {
  wrap: { borderTop: '1px solid #efefef' },
  list: { maxHeight: 260, overflowY: 'auto' },
  row: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px' },
  body: { flex: 1, minWidth: 0 },
  username: { fontSize: 13, fontWeight: 700, color: '#262626', marginRight: 6 },
  text: { fontSize: 14, lineHeight: 1.45, color: '#262626', wordBreak: 'break-word' },
  time: { fontSize: 12, color: '#8e8e8e', margin: '4px 0 0' },
  empty: { textAlign: 'center', color: '#8e8e8e', fontSize: 14, padding: '28px 16px', margin: 0 },
  inputBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    borderTop: '1px solid #efefef',
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
  send: {
    width: 36,
    height: 36,
    flexShrink: 0,
    border: 'none',
    borderRadius: '50%',
    background: '#0095f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
};

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

  const canSend = text.trim().length > 0;

  return (
    <div style={C.wrap}>
      {loading ? (
        <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
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
        <p style={C.empty}>No comments yet</p>
      ) : (
        <div style={C.list}>
          {comments.map((c) => (
            <div key={c._id} style={C.row}>
              <Avatar user={c.user} size={32} fontSize={11} />
              <div style={C.body}>
                <div>
                  <span style={C.username}>{c.user?.username}</span>
                  <span style={C.text}>{c.text}</span>
                </div>
                <p style={C.time}>{timeAgo(c.createdAt)}</p>
              </div>
              {c.user?._id === user?._id && (
                <button onClick={() => remove(c._id)} aria-label="Delete comment" style={{ ...S.iconBtn, color: '#8e8e8e' }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={C.inputBar}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Add a comment..."
          maxLength={500}
          style={C.input}
        />
        <button
          onClick={submit}
          disabled={!canSend}
          aria-label="Send comment"
          style={{ ...C.send, opacity: canSend ? 1 : 0.5, cursor: canSend ? 'pointer' : 'default' }}
        >
          <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" />
          </svg>
        </button>
      </div>
    </div>
  );
}