'use client';

import { useState, useEffect } from 'react';
import Avatar from '@/components/ui/Avatar';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';

export default function StoryBar() {
  const [groups, setGroups] = useState([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerGroupIdx, setViewerGroupIdx] = useState(0);
  const { user } = useAuth();
  const { showToast } = useToast();

  const loadStories = async () => {
    try {
      const data = await api.get('/stories/feed');
      setGroups(data);
    } catch { setGroups([]); }
  };

  useEffect(() => { loadStories(); }, []);

  const myGroupIdx = groups.findIndex(g => g.user?._id === user?._id);
  const hasMyStory = myGroupIdx >= 0 && groups[myGroupIdx]?.stories?.length > 0;

  const openViewer = (idx) => {
    setViewerGroupIdx(idx);
    setViewerOpen(true);
  };

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showToast('Only image stories are supported');
        return;
      }
      showToast('Uploading story...');
      const fd = new FormData();
      fd.append('media', file);
      try {
        await api.request('POST', '/stories', fd, true);
        showToast('Story posted!');
        loadStories();
      } catch (err) { showToast(err.message); }
    };
    input.click();
  };

  return (
    <>
      <div className="flex gap-3.5 px-4 py-3 pb-2.5 overflow-x-auto border-b border-border scrollbar-none">
        {/* Own story bubble */}
        <div
          onClick={hasMyStory ? () => openViewer(myGroupIdx) : handleUpload}
          className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0"
        >
          <div
            className={`w-[58px] h-[58px] rounded-full p-[2px] ${hasMyStory ? 'bg-instagram-gradient' : 'border-2 border-dashed border-border bg-surface2'}`}
          >
            <div className="w-full h-full rounded-full bg-surface border-[2.5px] border-surface flex items-center justify-center text-lg font-semibold overflow-hidden">
              {hasMyStory ? (
                user?.avatar ? (
                  <img src={user.avatar} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span className="text-[18px] font-semibold">{(user?.name || user?.username || '?')[0]?.toUpperCase()}</span>
                )
              ) : (
                <span className="text-[22px] font-light text-muted">+</span>
              )}
            </div>
          </div>
          <span className="text-[11px] text-muted text-center max-w-[66px] truncate">
            {hasMyStory ? 'Your story' : 'Add story'}
          </span>
        </div>

        {/* Other users' stories */}
        {groups.map((group, gIdx) => {
          if (group.user?._id === user?._id) return null;
          const allViewed = group.stories.every(s => s.viewed);
          return (
            <div key={group.user?._id || gIdx} onClick={() => openViewer(gIdx)} className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0">
              <div className={`w-[58px] h-[58px] rounded-full p-[2px] ${allViewed ? 'bg-border' : 'bg-instagram-gradient'}`}>
                <div className="w-full h-full rounded-full bg-surface border-[2.5px] border-surface flex items-center justify-center overflow-hidden">
                  {group.user?.avatar ? (
                    <img src={group.user.avatar} alt="" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span className="text-[18px] font-semibold">{(group.user?.name || group.user?.username || '?')[0]?.toUpperCase()}</span>
                  )}
                </div>
              </div>
              <span className="text-[11px] text-center max-w-[66px] truncate">{group.user?.username}</span>
            </div>
          );
        })}
      </div>

      {/* Story Viewer */}
      {viewerOpen && (
        <StoryViewer
          groups={groups}
          startGroupIdx={viewerGroupIdx}
          onClose={() => { setViewerOpen(false); loadStories(); }}
        />
      )}
    </>
  );
}

// Full-screen story viewer
function StoryViewer({ groups, startGroupIdx, onClose }) {
  const [gIdx, setGIdx] = useState(startGroupIdx);
  const [sIdx, setSIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const { user } = useAuth();
  const { showToast } = useToast();

  const group = groups[gIdx];
  const story = group?.stories?.[sIdx];
  const isOwn = group?.user?._id === user?._id;
  const totalStories = group?.stories?.length || 0;

  // Auto-advance timer
  useEffect(() => {
    if (paused || !story) return;
    const duration = 6000;
    const start = performance.now() - (progress / 100) * duration;
    let rafId;
    const tick = (now) => {
      const elapsed = now - start;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);
      if (pct < 100) {
        rafId = requestAnimationFrame(tick);
      } else {
        nextStory();
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [gIdx, sIdx, paused]);

  // Mark as viewed
  useEffect(() => {
    if (story?._id) {
      api.request('PUT', `/stories/${story._id}/view`, null).catch(() => {});
    }
  }, [story?._id]);

  const nextStory = () => {
    if (sIdx + 1 < totalStories) {
      setSIdx(sIdx + 1);
      setProgress(0);
    } else if (gIdx + 1 < groups.length) {
      setGIdx(gIdx + 1);
      setSIdx(0);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const prevStory = () => {
    if (sIdx > 0) {
      setSIdx(sIdx - 1);
      setProgress(0);
    } else if (gIdx > 0) {
      setGIdx(gIdx - 1);
      setSIdx(groups[gIdx - 1].stories.length - 1);
      setProgress(0);
    }
  };

  const toggleLike = async () => {
    try {
      await api.request('PUT', `/stories/${story._id}/like`, null);
    } catch (err) { showToast(err.message); }
  };

  const submitReply = async () => {
    if (!replyText.trim()) return;
    try {
      await api.post(`/stories/${story._id}/reply`, { text: replyText });
      showToast('Reply sent!');
      setReplyText('');
    } catch (err) { showToast(err.message); }
  };

  const deleteStory = async () => {
    try {
      await api.request('DELETE', `/stories/${story._id}`, null);
      showToast('Story deleted');
      onClose();
    } catch (err) { showToast(err.message); }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') nextStory();
      if (e.key === 'ArrowLeft') prevStory();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [gIdx, sIdx]);

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[800] bg-black flex flex-col items-center justify-center" style={{ touchAction: 'none' }}>
      {/* Progress bars */}
      <div className="absolute top-2 left-3 right-3 flex gap-1 z-10">
        {Array.from({ length: totalStories }, (_, i) => (
          <div key={i} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{ width: i < sIdx ? '100%' : i === sIdx ? `${progress}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-6 left-3 right-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5 flex-1">
          <Avatar user={group.user} size={36} fontSize={14} />
          <div>
            <p className="text-white text-sm font-bold">{group.user?.username}</p>
            <p className="text-white/60 text-[11px]">{story.expiresAt ? _timeLeft(story.expiresAt) : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={() => setPaused(!paused)} className="bg-transparent border-none cursor-pointer text-white p-1">
            {paused ? (
              <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" /></svg>
            ) : (
              <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
            )}
          </button>
          {isOwn && (
            <button onClick={deleteStory} className="bg-transparent border-none cursor-pointer text-white p-1">
              <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg>
            </button>
          )}
          <button onClick={onClose} className="bg-white/15 border-none rounded-full w-8 h-8 cursor-pointer text-white text-lg flex items-center justify-center">×</button>
        </div>
      </div>

      {/* Media */}
      <img
        src={story.media}
        alt=""
        className="w-full h-full object-contain select-none pointer-events-none"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Tap zones */}
      <div className="absolute inset-0 flex" style={{ top: 80, bottom: 90 }}>
        <div className="flex-1 cursor-pointer" onClick={prevStory} />
        <div className="flex-1 cursor-pointer" onClick={nextStory} />
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-3 right-3 flex items-center gap-3 z-10">
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            onKeyDown={(e) => e.key === 'Enter' && submitReply()}
            placeholder="Reply to story…"
            maxLength={200}
            className="flex-1 bg-white/12 border-[1.5px] border-white/30 rounded-3xl py-2 px-4 text-white text-sm outline-none placeholder:text-white/50"
          />
          <button onClick={submitReply} className="bg-transparent border-none cursor-pointer p-1.5 flex items-center">
            <svg width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" />
            </svg>
          </button>
        </div>
        <button onClick={toggleLike} className="bg-transparent border-none cursor-pointer flex items-center text-white flex-shrink-0">
          <svg width="26" height="26" fill={story.liked ? '#ed4956' : 'none'} stroke={story.liked ? '#ed4956' : '#fff'} strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function _timeLeft(expiresAt) {
  const ms = new Date(expiresAt) - Date.now();
  if (ms <= 0) return 'expired';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h left` : `${m}m left`;
}
