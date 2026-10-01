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
  const [showBlockedModal, setShowBlockedModal] = useState(false);
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
      <div className="flex justify-center items-center h-full w-full">
        <div className="w-8 h-8 border-3 border-border border-t-accent rounded-full animate-spin-slow" />
      </div>
    );
  }

  const p = profile || user;

  return (
    <div className="w-full h-full overflow-y-auto bg-surface">
      {/* Username Header Row */}
      <div className="w-full flex items-center justify-between px-4 py-2.5 border-b border-border sticky top-0 bg-surface z-10">
        <h2 className="text-base font-bold text-text">{p.username}</h2>
        <button onClick={() => setShowMenu(true)} className="bg-transparent border-none cursor-pointer text-text p-1">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* Profile Header */}
      <div className="w-full px-4 pt-4 pb-3">
        <div className="flex items-center gap-5 mb-4">
          {/* Avatar with gradient ring */}
          <div
            className="w-[82px] h-[82px] rounded-full bg-instagram-gradient p-[3px] flex-shrink-0 cursor-pointer relative"
            onClick={handleAvatarUpload}
          >
            <div className="w-full h-full rounded-full bg-surface border-[3px] border-white flex items-center justify-center overflow-hidden">
              {p.avatar ? (
                <img src={p.avatar} alt="" className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-[26px] font-bold text-text">
                  {(p.name || p.username || '?')[0]?.toUpperCase()}
                </span>
              )}
            </div>
            {/* Camera overlay on hover */}
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-1 justify-around text-center">
            <div>
              <p className="text-[17px] font-bold text-text">{p.postCount || posts.length || 0}</p>
              <p className="text-xs text-muted">Posts</p>
            </div>
            <div>
              <p className="text-[17px] font-bold text-text">{p.followersCount || p.followers?.length || 0}</p>
              <p className="text-xs text-muted">Followers</p>
            </div>
            <div>
              <p className="text-[17px] font-bold text-text">{p.followingCount || p.following?.length || 0}</p>
              <p className="text-xs text-muted">Following</p>
            </div>
          </div>
        </div>

        {/* Name & Bio */}
        <div className="mb-3 w-full">
          <p className="text-sm font-semibold text-text">{p.name || p.username}</p>
          {p.bio && <p className="text-[13px] text-text mt-0.5 leading-relaxed">{p.bio}</p>}
          {p.website && (
            <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-[13px] text-accent font-semibold block mt-0.5">
              {p.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1.5 w-full">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex-1 py-[7px] bg-surface2 border border-border rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-border transition-colors text-text"
          >
            Edit Profile
          </button>
          <button
            onClick={togglePrivacy}
            className="flex-1 py-[7px] bg-black text-white border border-black rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-neutral-800 transition-colors shadow-sm"
          >
            {p.isPrivate ? 'Private' : 'Public'}
          </button>
        </div>
      </div>

      {/* Follow Requests */}
      {followRequests.length > 0 && (
        <div className="w-full px-4 py-2 border-t border-b border-border bg-surface2">
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

      {/* Posts Tab Header */}
      <div className="flex w-full border-t border-b border-border">
        <div className="flex-1 py-2.5 text-center border-t-2 border-t-text text-[13px] font-semibold text-text flex items-center justify-center gap-1.5">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
          Posts
        </div>
      </div>

      {/* Post Grid — 3 Column Responsive Grid */}
      <div className="w-full">
        {posts.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" className="mx-auto mb-3 text-border">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21,15 16,10 5,21" />
            </svg>
            <p className="text-base font-semibold">No Posts Yet</p>
          </div>
        ) : (
          <div className="w-full grid grid-cols-3 gap-[2px]">
            {posts.map(post => (
              <div key={post._id} className="w-full aspect-square bg-surface2 cursor-pointer overflow-hidden hover:opacity-80 transition-opacity relative">
                {post.image ? (
                  <img src={post.image} alt="" className="w-full h-full object-cover block hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[40px] bg-surface2">
                    {post.emoji || '📷'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings & Options Menu */}
      {showMenu && (
        <div className="fixed inset-0 z-[300] bg-black/65 flex items-end justify-center" style={{ animation: 'fadeInOverlay .2s' }} onClick={() => setShowMenu(false)}>
          <div className="bg-surface w-full max-w-[480px] rounded-t-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-3 flex justify-center"><div className="w-9 h-1 bg-border rounded-full" /></div>
            <h3 className="text-center text-[15px] font-bold pb-2">Settings & Options</h3>

            {/* Edit Profile */}
            <button
              onClick={() => { setShowEditModal(true); setShowMenu(false); }}
              className="w-full flex items-center gap-4 px-6 py-4 cursor-pointer border-t border-border hover:bg-surface2 bg-transparent text-left"
            >
              <span className="text-accent text-lg">✏️</span>
              <div>
                <p className="text-[15px] font-semibold text-text">Edit Profile</p>
                <p className="text-[12px] text-muted">Update your name, bio and website</p>
              </div>
              <span className="ml-auto text-muted text-sm">›</span>
            </button>

            {/* Account Privacy */}
            <button
              onClick={() => { togglePrivacy(); setShowMenu(false); }}
              className="w-full flex items-center gap-4 px-6 py-4 cursor-pointer border-t border-border hover:bg-surface2 bg-transparent text-left"
            >
              <span className="text-lg">🔒</span>
              <div>
                <p className="text-[15px] font-semibold text-text">Account Privacy</p>
                <p className="text-[12px] text-muted">Currently {p.isPrivate ? 'Private' : 'Public'} — tap to make {p.isPrivate ? 'Public' : 'Private'}</p>
              </div>
              <span className="ml-auto text-muted text-sm">›</span>
            </button>

            {/* Blocked Users */}
            <button
              onClick={() => { setShowBlockedModal(true); setShowMenu(false); }}
              className="w-full flex items-center gap-4 px-6 py-4 cursor-pointer border-t border-border hover:bg-surface2 bg-transparent text-left"
            >
              <span className="text-danger text-lg">🚫</span>
              <div>
                <p className="text-[15px] font-semibold text-text">Blocked Users</p>
                <p className="text-[12px] text-muted">Manage users you have blocked</p>
              </div>
              <span className="ml-auto text-muted text-sm">›</span>
            </button>

            {/* Call History */}
            <button
              onClick={() => { router.push('/chat'); setShowMenu(false); }}
              className="w-full flex items-center gap-4 px-6 py-4 cursor-pointer border-t border-border hover:bg-surface2 bg-transparent text-left"
            >
              <span className="text-accent text-lg">📞</span>
              <div>
                <p className="text-[15px] font-semibold text-text">Call History</p>
                <p className="text-[12px] text-muted">Voice & video call logs</p>
              </div>
              <span className="ml-auto text-muted text-sm">›</span>
            </button>

            {/* Logout */}
            <button
              onClick={() => { logout(); setShowMenu(false); }}
              className="w-full flex items-center gap-4 px-6 py-4 cursor-pointer border-t border-border hover:bg-surface2 bg-transparent text-left"
            >
              <span className="text-danger text-lg">🚪</span>
              <div>
                <p className="text-[15px] font-semibold text-danger">Logout</p>
                <p className="text-[12px] text-muted">Sign out of your account</p>
              </div>
              <span className="ml-auto text-muted text-sm">›</span>
            </button>

            <button onClick={() => setShowMenu(false)} className="w-full py-4 text-center text-[15px] font-semibold text-muted cursor-pointer hover:bg-surface2 bg-transparent border-t border-border border-b-0">
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

      {/* Blocked Users Modal */}
      {showBlockedModal && (
        <BlockedUsersModal onClose={() => setShowBlockedModal(false)} />
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
        <div className="p-4 flex flex-col gap-3.5">
          <div>
            <label className="text-xs font-semibold text-muted mb-1 block uppercase tracking-wider">Name</label>
            <input value={form.name} onChange={update('name')} className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] outline-none bg-background text-text transition-colors focus:border-accent focus:bg-white" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted mb-1 block uppercase tracking-wider">Bio</label>
            <textarea value={form.bio} onChange={update('bio')} maxLength={150} rows={3}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] outline-none resize-none bg-background text-text transition-colors focus:border-accent focus:bg-white" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted mb-1 block uppercase tracking-wider">Website</label>
            <input value={form.website} onChange={update('website')} placeholder="https://..."
              className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] outline-none bg-background text-text transition-colors focus:border-accent focus:bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Blocked Users Modal
function BlockedUsersModal({ onClose }) {
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    api.get('/users/blocked/list')
      .then(data => setBlocked(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const unblock = async (userId) => {
    try {
      await api.post(`/users/${userId}/unblock`);
      setBlocked(prev => prev.filter(u => u._id !== userId));
      showToast('User unblocked');
    } catch (err) { showToast(err.message); }
  };

  return (
    <div className="fixed inset-0 z-[400] bg-black/60 flex items-center justify-center p-5" onClick={onClose}>
      <div className="bg-surface rounded-2xl w-full max-w-[380px] overflow-hidden animate-slide-up max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <h3 className="text-base font-bold">Blocked Users</h3>
          <button onClick={onClose} className="text-lg font-bold text-muted bg-transparent border-none cursor-pointer">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin-slow" />
            </div>
          ) : blocked.length === 0 ? (
            <p className="text-center text-muted text-sm py-8">No blocked users</p>
          ) : (
            blocked.map(u => (
              <div key={u._id} className="flex items-center gap-3 py-3 border-b border-border last:border-none">
                <Avatar user={u} size={40} fontSize={14} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{u.username}</p>
                  <p className="text-xs text-muted">{u.name || ''}</p>
                </div>
                <button onClick={() => unblock(u._id)} className="px-3 py-1.5 text-xs font-semibold border border-border rounded-lg cursor-pointer bg-surface2 hover:bg-border transition-colors text-text">
                  Unblock
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
