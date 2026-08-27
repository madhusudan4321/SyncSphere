'use client';

import { useState, useEffect } from 'react';
import Avatar from '@/components/ui/Avatar';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [followRequests, setFollowRequests] = useState([]);

  const loadProfile = async () => {
    try {
      const data = await api.get(`/users/${user.username}`);
      setProfile(data.user || data);
      setPosts(data.posts || []);
    } catch (err) { showToast(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (user?.username) loadProfile();
  }, [user?.username]);

  // Follow requests
  useEffect(() => {
    const loadRequests = async () => {
      try {
        const data = await api.get('/users/follow-requests/list');
        setFollowRequests(data);
      } catch {}
    };
    loadRequests();
  }, []);

  const togglePrivacy = async () => {
    try {
      const data = await api.put('/users/privacy/toggle');
      updateUser({ isPrivate: data.isPrivate });
      setProfile(prev => ({ ...prev, isPrivate: data.isPrivate }));
      showToast(`Account is now ${data.isPrivate ? 'private' : 'public'}`);
    } catch (err) { showToast(err.message); }
  };

  const acceptRequest = async (reqId) => {
    try {
      await api.put(`/users/follow-requests/${reqId}/accept`);
      setFollowRequests(prev => prev.filter(r => r._id !== reqId));
      showToast('Request accepted');
      loadProfile();
    } catch (err) { showToast(err.message); }
  };

  const declineRequest = async (reqId) => {
    try {
      await api.put(`/users/follow-requests/${reqId}/decline`);
      setFollowRequests(prev => prev.filter(r => r._id !== reqId));
      showToast('Request declined');
    } catch (err) { showToast(err.message); }
  };

  const handleAvatarUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('avatar', file);
      try {
        const data = await api.upload('/users/avatar', fd);
        updateUser({ avatar: data.avatar || data.url });
        showToast('Avatar updated!');
        loadProfile();
      } catch (err) { showToast(err.message); }
    };
    input.click();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="w-8 h-8 border-3 border-border border-t-accent rounded-full animate-spin-slow" />
      </div>
    );
  }

  const p = profile || user;

  return (
    <div className="w-full h-full overflow-y-auto">
      {/* Profile Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-5 mb-4">
          {/* Avatar */}
          <div className="relative cursor-pointer" onClick={handleAvatarUpload}>
            <Avatar user={p} size={80} fontSize={24} />
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6 flex-1 justify-center">
            <div className="text-center">
              <p className="text-lg font-bold">{p.postCount || posts.length || 0}</p>
              <p className="text-xs text-muted">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{p.followersCount || p.followers?.length || 0}</p>
              <p className="text-xs text-muted">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{p.followingCount || p.following?.length || 0}</p>
              <p className="text-xs text-muted">Following</p>
            </div>
          </div>
        </div>

        {/* Name & Bio */}
        <div className="mb-3">
          <p className="text-sm font-bold">{p.name || p.username}</p>
          {p.bio && <p className="text-sm text-text mt-0.5">{p.bio}</p>}
          {p.website && (
            <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-sm text-accent font-semibold">
              {p.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex-1 py-2 bg-surface2 border border-border rounded-lg text-sm font-semibold cursor-pointer hover:bg-border transition-colors"
          >
            Edit Profile
          </button>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="px-3 py-2 bg-surface2 border border-border rounded-lg cursor-pointer hover:bg-border transition-colors"
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 15.5A3.5 3.5 0 1012 8.5a3.5 3.5 0 000 7zm7.43-2.53a7.76 7.76 0 000-1.94l2.11-1.65a.5.5 0 00.12-.64l-2-3.46a.5.5 0 00-.61-.22l-2.49 1a7.3 7.3 0 00-1.68-.98l-.38-2.65A.5.5 0 0014 2h-4a.5.5 0 00-.5.42l-.38 2.65a7.3 7.3 0 00-1.68.98l-2.49-1a.5.5 0 00-.61.22l-2 3.46a.5.5 0 00.12.64l2.11 1.65a7.76 7.76 0 000 1.94l-2.11 1.65a.5.5 0 00-.12.64l2 3.46a.5.5 0 00.61.22l2.49-1a7.3 7.3 0 001.68.98l.38 2.65a.5.5 0 00.5.42h4a.5.5 0 00.5-.42l.38-2.65a7.3 7.3 0 001.68-.98l2.49 1a.5.5 0 00.61-.22l2-3.46a.5.5 0 00-.12-.64l-2.11-1.65z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Follow Requests */}
      {followRequests.length > 0 && (
        <div className="px-4 py-2 border-t border-b border-border bg-surface2">
          <p className="text-xs font-semibold text-accent mb-2">Follow Requests ({followRequests.length})</p>
          {followRequests.map(req => (
            <div key={req._id} className="flex items-center gap-2 py-1.5">
              <Avatar user={req.from || req} size={32} fontSize={11} />
              <span className="text-sm font-semibold flex-1">{req.from?.username || req.username}</span>
              <button onClick={() => acceptRequest(req._id)} className="px-3 py-1 bg-accent text-white rounded-md text-xs font-semibold border-none cursor-pointer">Accept</button>
              <button onClick={() => declineRequest(req._id)} className="px-3 py-1 bg-surface2 border border-border rounded-md text-xs font-semibold cursor-pointer">Decline</button>
            </div>
          ))}
        </div>
      )}

      {/* Post Grid */}
      <div className="border-t border-border">
        {posts.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" className="mx-auto mb-3 text-border">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21,15 16,10 5,21" />
            </svg>
            <p className="text-base font-semibold">No Posts Yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map(post => (
              <div key={post._id} className="aspect-square bg-surface2 cursor-pointer overflow-hidden hover:opacity-80 transition-opacity">
                {post.image ? (
                  <img src={post.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl bg-surface2">
                    {post.emoji || '📷'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings Menu */}
      {showMenu && (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-end justify-center" onClick={() => setShowMenu(false)}>
          <div className="bg-surface w-full max-w-[480px] rounded-t-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-3 flex justify-center"><div className="w-9 h-1 bg-border rounded-full" /></div>
            <button onClick={() => { togglePrivacy(); setShowMenu(false); }} className="w-full flex items-center gap-4 px-6 py-4 cursor-pointer border-b border-border hover:bg-surface2 bg-transparent text-left text-[15px] font-semibold text-text">
              {p.isPrivate ? '🔓 Switch to Public' : '🔒 Switch to Private'}
            </button>
            <button onClick={() => { router.push('/chat'); setShowMenu(false); }} className="w-full flex items-center gap-4 px-6 py-4 cursor-pointer border-b border-border hover:bg-surface2 bg-transparent text-left text-[15px] font-semibold text-text">
              💬 Messages
            </button>
            <button onClick={() => { logout(); setShowMenu(false); }} className="w-full flex items-center gap-4 px-6 py-4 cursor-pointer border-b border-border hover:bg-surface2 bg-transparent text-left text-[15px] font-semibold text-danger">
              🚪 Log Out
            </button>
            <button onClick={() => setShowMenu(false)} className="w-full py-4 text-center text-[15px] font-semibold text-muted cursor-pointer hover:bg-surface2 bg-transparent border-none">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          profile={p}
          onClose={() => setShowEditModal(false)}
          onSave={(updates) => {
            updateUser(updates);
            setProfile(prev => ({ ...prev, ...updates }));
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
}

// Edit Profile Modal
function EditProfileModal({ profile, onClose, onSave }) {
  const [form, setForm] = useState({
    name: profile.name || '',
    bio: profile.bio || '',
    website: profile.website || '',
  });
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/users/profile/update', form);
      showToast('Profile updated!');
      onSave(form);
    } catch (err) { showToast(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[400] bg-black/60 flex items-center justify-center p-5" onClick={onClose}>
      <div className="bg-surface rounded-2xl w-full max-w-[380px] overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button onClick={onClose} className="text-sm font-semibold text-text bg-transparent border-none cursor-pointer">Cancel</button>
          <h3 className="text-base font-bold">Edit Profile</h3>
          <button onClick={handleSave} disabled={saving} className="text-sm font-semibold text-accent bg-transparent border-none cursor-pointer disabled:opacity-50">
            {saving ? 'Saving...' : 'Done'}
          </button>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold text-muted mb-1 block">Name</label>
            <input value={form.name} onChange={update('name')} className="w-full px-3 py-2 border border-border rounded-lg text-sm outline-none bg-surface2 text-text" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted mb-1 block">Bio</label>
            <textarea value={form.bio} onChange={update('bio')} maxLength={150} rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm outline-none resize-none bg-surface2 text-text" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted mb-1 block">Website</label>
            <input value={form.website} onChange={update('website')} placeholder="https://..."
              className="w-full px-3 py-2 border border-border rounded-lg text-sm outline-none bg-surface2 text-text" />
          </div>
        </div>
      </div>
    </div>
  );
}
