'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import PostCard from '@/components/feed/PostCard';
import StoryBar from '@/components/stories/StoryBar';
import api from '@/lib/api';
import Spinner from '@/components/ui/Spinner';

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef(null);
  const containerRef = useRef(null);

  const loadFeed = useCallback(async (pageNum, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const data = await api.get(`/posts/feed?page=${pageNum}&limit=10`);
      const newPosts = data.posts || data;
      if (append) {
        setPosts(prev => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }
      setHasMore(newPosts.length >= 10);
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadFeed(1);
  }, [loadFeed]);

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadFeed(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, page, loadFeed]);

  const handleDelete = (postId) => {
    setPosts(prev => prev.filter(p => p._id !== postId));
  };

  const handleUpdate = (postId, updates) => {
    setPosts(prev => prev.map(p => p._id === postId ? { ...p, ...updates } : p));
  };

  return (
    <div ref={containerRef} className="w-full h-full">
      <div className="w-full pb-4">
        {/* Stories */}
        <StoryBar />

        {/* Loading skeleton */}
        {loading ? (
          <div className="flex flex-col gap-0">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-surface border-b border-border animate-pulse">
                <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                  <div className="w-8 h-8 rounded-full bg-surface2" />
                  <div className="w-24 h-3 bg-surface2 rounded" />
                </div>
                <div className="w-full h-72 bg-surface2" />
                <div className="px-3.5 py-3 space-y-2">
                  <div className="w-32 h-3 bg-surface2 rounded" />
                  <div className="w-48 h-3 bg-surface2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <svg width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" className="mx-auto mb-4 text-border">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21,15 16,10 5,21" />
            </svg>
            <p className="text-lg font-semibold mb-1">No posts yet</p>
            <p className="text-sm">Follow people to see their posts here</p>
          </div>
        ) : (
          <>
            {posts.map(post => (
              <PostCard
                key={post._id}
                post={post}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4">
              {loadingMore && <Spinner size={24} />}
            </div>

            {!hasMore && posts.length > 0 && (
              <p className="text-center text-muted text-sm py-6">You&apos;re all caught up!</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
