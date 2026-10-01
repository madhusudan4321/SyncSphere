'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Avatar from '@/components/ui/Avatar';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useCall } from '@/lib/call-context';
import { useToast } from '@/components/ui/Toast';

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
      <div className="flex justify-center items-center h-full">
        <div className="w-8 h-8 border-3 border-border border-t-accent rounded-full animate-spin-slow" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted">
        <p className="text-lg font-semibold">User not found</p>
        <button onClick={() => router.back()} className="mt-4 text-accent font-semibold bg-transparent border-none cursor-pointer">Go back</button>
      </div>
    );
  }

  const isPrivateAndNotFollowing = profile.isPrivate && followStatus !== 'following';

  return (
    <div className="w-full h-full overflow-y-auto">
      {/* Back button + username header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border sticky top-0 bg-surface z-10">
        <button onClick={() => router.back()} className="bg-transparent border-none cursor-pointer text-text flex p-0">
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="15,18 9,12 15,6" />
          </svg>
        </button>
        <h2 className="text-base font-bold">{username}</h2>
        <div className="flex-1" />
        <button onClick={() => setShowMenu(true)} className="bg-transparent border-none cursor-pointer text-text p-1">
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Profile Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-5 mb-4">
          <Avatar user={profile} size={80} fontSize={24} />
          <div className="flex gap-6 flex-1 justify-center">
            <div className="text-center">
              <p className="text-lg font-bold">{profile.postCount || posts.length || 0}</p>
              <p className="text-xs text-muted">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{profile.followersCount || profile.followers?.length || 0}</p>
              <p className="text-xs text-muted">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{profile.followingCount || profile.following?.length || 0}</p>
              <p className="text-xs text-muted">Following</p>
            </div>
          </div>
        </div>

        {/* Name & Bio */}
        <div className="mb-3">
          <p className="text-sm font-bold">{profile.name || profile.username}</p>
          {profile.bio && <p className="text-sm text-text mt-0.5">{profile.bio}</p>}
          {profile.website && (
            <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-sm text-accent font-semibold">
              {profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleFollow}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors border-none ${
              followStatus === 'following'
                ? 'bg-surface2 border border-border text-text'
                : followStatus === 'requested'
                ? 'bg-surface2 border border-border text-muted'
                : 'bg-accent text-white'
            }`}
          >
            {followStatus === 'following' ? 'Following' : followStatus === 'requested' ? 'Requested' : 'Follow'}
          </button>
          <button
            onClick={() => router.push('/chat')}
            className="flex-1 py-2 bg-surface2 border border-border rounded-lg text-sm font-semibold cursor-pointer hover:bg-border transition-colors"
          >
            Message
          </button>
          <button
            onClick={() => startCall(profile, 'voice')}
            className="px-3 py-2 bg-surface2 border border-border rounded-lg text-sm font-semibold cursor-pointer hover:bg-border transition-colors text-text"
            title="Voice Call"
          >
            📞
          </button>
          <button
            onClick={() => startCall(profile, 'video')}
            className="px-3 py-2 bg-surface2 border border-border rounded-lg text-sm font-semibold cursor-pointer hover:bg-border transition-colors text-text"
            title="Video Call"
          >
            📹
          </button>
        </div>
      </div>

      {/* Post Grid */}
      <div className="border-t border-border">
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

      {/* Menu Bottom Sheet */}
      {showMenu && (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-end justify-center" onClick={() => setShowMenu(false)}>
          <div className="bg-surface w-full max-w-[480px] rounded-t-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-3 flex justify-center"><div className="w-9 h-1 bg-border rounded-full" /></div>
            <button onClick={handleBlock} className="w-full flex items-center gap-4 px-6 py-4 cursor-pointer border-b border-border hover:bg-surface2 bg-transparent text-left text-[15px] font-semibold text-danger">
              🚫 Block @{username}
            </button>
            {['Spam or fake account', 'Inappropriate content', 'Harassment', 'Scam or fraud'].map(reason => (
              <button key={reason} onClick={() => handleReport(reason)} className="w-full flex items-center gap-4 px-6 py-4 cursor-pointer border-b border-border hover:bg-surface2 bg-transparent text-left text-[15px] font-semibold text-text">
                ⚠️ Report: {reason}
              </button>
            ))}
            <button onClick={() => setShowMenu(false)} className="w-full py-4 text-center text-[15px] font-semibold text-muted cursor-pointer hover:bg-surface2 bg-transparent border-none">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
