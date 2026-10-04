'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Avatar from '@/components/ui/Avatar';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useCall } from '@/lib/call-context';
import { useToast } from '@/components/ui/Toast';

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
  block: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="10" />
      <line x1="4.9" y1="4.9" x2="19.1" y2="19.1" />
    </svg>
  ),
  flag: (
    <svg {...iconProps}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  ),
  phone: (
    <svg {...iconProps} width={18} height={18}>
      <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.7a2 2 0 01-.5 2.1L8.1 9.8a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.7.7a2 2 0 011.7 2z" />
    </svg>
  ),
  video: (
    <svg {...iconProps} width={18} height={18}>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  ),
};

function MenuItem({ icon, label, value, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
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
        color: danger ? '#ed4956' : '#262626',
      }}
    >
      <span style={{ display: 'flex' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {value && (
        <span style={{ fontSize: 13, fontWeight: 500, color: '#737373' }}>{value}</span>
      )}
    </button>
  );
}

const callButtonStyle = {
  padding: '8px 12px',
  background: '#efefef',
  color: '#262626',
  border: '1px solid #dbdbdb',
  borderRadius: 8,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
};

export default function UserProfilePage() {
  const { username } = useParams();
  const { user } = useAuth();
  const { startCall } = useCall();
  const { showToast } = useToast();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followStatus, setFollowStatus] = useState('none'); // none | following | requested
  const [showMenu, setShowMenu] = useState(false);

  // Redirect to own profile
  useEffect(() => {
    if (user?.username && username === user.username) {
      router.replace('/profile');
    }
  }, [username, user?.username, router]);

  const loadProfile = async () => {
    try {
      const data = await api.get(`/users/${username}`);
      const p = data.user || data;
      setProfile(p);
      setPosts(data.posts || []);
      // Determine follow status
      if (p.followers?.includes(user?._id) || p.isFollowing) {
        setFollowStatus('following');
      } else if (p.isRequested || p.followRequested) {
        setFollowStatus('requested');
      } else {
        setFollowStatus('none');
      }
    } catch (err) { showToast(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (username) loadProfile();
  }, [username]);

  const handleFollow = async () => {
    try {
      const data = await api.post(`/users/${profile._id}/follow`);
      if (data.status === 'requested' || data.message?.includes('requested')) {
        setFollowStatus('requested');
        showToast('Follow request sent');
      } else if (data.status === 'unfollowed' || followStatus === 'following') {
        setFollowStatus('none');
        setProfile(prev => ({ ...prev, followersCount: (prev.followersCount || 0) - 1 }));
      } else {
        setFollowStatus('following');
        setProfile(prev => ({ ...prev, followersCount: (prev.followersCount || 0) + 1 }));
      }
    } catch (err) { showToast(err.message); }
  };

  const handleBlock = async () => {
    if (!confirm(`Block @${username}?`)) return;
    try {
      await api.post(`/users/${profile._id}/block`);
      showToast(`@${username} blocked`);
      router.push('/feed');
    } catch (err) { showToast(err.message); }
    setShowMenu(false);
  };

  const handleReport = async (reason) => {
    try {
      await api.post(`/users/${profile._id}/report`, { reason });
      showToast('Report submitted. Thank you!');
    } catch { showToast('Report submitted!'); }
    setShowMenu(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full w-full">
        <div className="w-8 h-8 border-3 border-border border-t-accent rounded-full animate-spin-slow" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted w-full">
        <p className="text-lg font-semibold">User not found</p>
        <button onClick={() => router.back()} className="mt-4 text-accent font-semibold bg-transparent border-none cursor-pointer">Go back</button>
      </div>
    );
  }

  const isPrivateAndNotFollowing = profile.isPrivate && followStatus !== 'following';

  const followBtnStyle =
    followStatus === 'following'
      ? { background: '#efefef', color: '#262626', border: '1px solid #dbdbdb' }
      : followStatus === 'requested'
      ? { background: '#efefef', color: '#737373', border: '1px solid #dbdbdb' }
      : { background: '#0095f6', color: '#ffffff', border: '1px solid #0095f6' };

  return (
    <div className="w-full h-full overflow-y-auto bg-surface">
      {/* Back button + username header */}
      <div className="w-full flex items-center gap-3 px-4 py-2 border-b border-border sticky top-0 bg-surface z-10">
        <button onClick={() => router.back()} className="bg-transparent border-none cursor-pointer text-text flex p-0">
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="15,18 9,12 15,6" />
          </svg>
        </button>
        <h2 className="text-base font-bold text-text">{username}</h2>
        <div className="flex-1" />
        <button onClick={() => setShowMenu(true)} className="bg-transparent border-none cursor-pointer text-text p-1">
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Profile Header */}
      <div className="w-full px-4 pt-4 pb-3">
        <div className="flex items-center gap-5 mb-4">
          {/* Avatar with gradient ring */}
          <div className="w-[82px] h-[82px] rounded-full bg-instagram-gradient p-[3px] flex-shrink-0">
            <div className="w-full h-full rounded-full bg-surface border-[3px] border-white flex items-center justify-center overflow-hidden">
              {profile.avatar ? (
                <img src={profile.avatar} alt="" className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-[26px] font-bold text-text">
                  {(profile.name || profile.username || '?')[0]?.toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-1 justify-around text-center">
            <div>
              <p className="text-[17px] font-bold text-text">{profile.postCount || posts.length || 0}</p>
              <p className="text-xs text-muted">Posts</p>
            </div>
            <div>
              <p className="text-[17px] font-bold text-text">{profile.followersCount || profile.followers?.length || 0}</p>
              <p className="text-xs text-muted">Followers</p>
            </div>
            <div>
              <p className="text-[17px] font-bold text-text">{profile.followingCount || profile.following?.length || 0}</p>
              <p className="text-xs text-muted">Following</p>
            </div>
          </div>
        </div>

        {/* Name & Bio */}
        <div className="mb-3 w-full">
          <p className="text-sm font-semibold text-text">{profile.name || profile.username}</p>
          {profile.bio && <p className="text-[13px] text-text mt-0.5 leading-relaxed">{profile.bio}</p>}
          {profile.website && (
            <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-[13px] text-accent font-semibold block mt-0.5">
              {profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <button
            onClick={handleFollow}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              ...followBtnStyle,
            }}
          >
            {followStatus === 'following' ? 'Following' : followStatus === 'requested' ? 'Requested' : 'Follow'}
          </button>
          <button
            onClick={() => router.push('/chat')}
            style={{
              flex: 1,
              padding: '8px 0',
              background: '#efefef',
              color: '#262626',
              border: '1px solid #dbdbdb',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Message
          </button>
          <button
            onClick={() => startCall(profile, 'voice')}
            title="Voice Call"
            aria-label="Voice Call"
            style={callButtonStyle}
          >
            {Icons.phone}
          </button>
          <button
            onClick={() => startCall(profile, 'video')}
            title="Video Call"
            aria-label="Video Call"
            style={callButtonStyle}
          >
            {Icons.video}
          </button>
        </div>
      </div>

      {/* Posts Tab Header */}
      <div className="flex w-full border-t border-border border-b border-border">
        <div className="flex-1 py-2.5 text-center border-t-2 border-t-text text-[13px] font-semibold text-text flex items-center justify-center gap-1.5">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
          Posts
        </div>
      </div>

      {/* Post Grid — 3 Column Responsive Grid */}
      <div className="w-full">
        {isPrivateAndNotFollowing ? (
          <div className="text-center py-16 text-muted">
            <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="mx-auto mb-3 text-border">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <p className="text-base font-semibold">This Account is Private</p>
            <p className="text-sm mt-1">Follow to see their posts</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <p className="text-base font-semibold">No Posts Yet</p>
          </div>
        ) : (
          <div className="w-full grid grid-cols-3 gap-[2px]">
            {posts.map(post => (
              <div key={post._id} className="w-full aspect-square bg-surface2 cursor-pointer overflow-hidden hover:opacity-80 transition-opacity relative">
                {post.image ? (
                  <img src={post.image} alt="" className="w-full h-full object-cover block hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-surface2 text-muted">
                    <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21,15 16,10 5,21" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Menu Bottom Sheet */}
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
            className="animate-slide-up"
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

            <MenuItem icon={Icons.block} label={`Block @${username}`} danger onClick={handleBlock} />
            {['Spam or fake account', 'Inappropriate content', 'Harassment', 'Scam or fraud'].map((reason) => (
              <MenuItem
                key={reason}
                icon={Icons.flag}
                label={`Report: ${reason}`}
                onClick={() => handleReport(reason)}
              />
            ))}

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
    </div>
  );
}