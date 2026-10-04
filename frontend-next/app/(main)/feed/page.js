'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import PostCard from '@/components/feed/PostCard';
import StoryBar from '@/components/stories/StoryBar';
import api from '@/lib/api';
import Spinner from '@/components/ui/Spinner';

const PAGE_SIZE = 10;

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const sentinelRef = useRef(null);
  const containerRef = useRef(null);
  const pageRef = useRef(1);
  const fetchingRef = useRef(false);
  const hasMoreRef = useRef(true);

  const loadFeed = useCallback(async (pageNum, append = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const data = await api.get(`/posts/feed?page=${pageNum}&limit=${PAGE_SIZE}`);
      const newPosts = data.posts || data;

      if (append) {
        setPosts((prev) => {
          const seen = new Set(prev.map((p) => p._id));
          return [...prev, ...newPosts.filter((p) => !seen.has(p._id))];
        });
      } else {
        setPosts(newPosts);
      }

      const more = newPosts.length >= PAGE_SIZE;
      hasMoreRef.current = more;
      setHasMore(more);
    } catch (err) {
      console.error('Failed to load feed:', err);
      if (append) pageRef.current -= 1; // allow retry of the same page
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadFeed(1);
  }, [loadFeed]);

  // Infinite scroll: observer is created once per list state, not on every page change
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = containerRef.current;
    if (!sentinel || !root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !fetchingRef.current) {
          pageRef.current += 1;
          loadFeed(pageRef.current, true);
        }
      },
      {
        root,                    // the scrolling container, not the viewport
        rootMargin: '0px 0px 600px 0px', // start loading before the user reaches the end
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loading, hasMore, loadFeed]);

  const handleDelete = useCallback((postId) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  }, []);

  const handleUpdate = useCallback((postId, updates) => {
    setPosts((prev) => prev.map((p) => (p._id === postId ? { ...p, ...updates } : p)));
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-y-auto"
      style={{
        scrollbarWidth: 'none',
        overscrollBehaviorY: 'contain',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
      }}
    >
      <div className="w-full pb-4">
        {/* Stories */}
        <StoryBar />

        {/* Loading skeleton */}
        {loading ? (
          <div className="flex flex-col gap-0">
            {[1, 2, 3].map((i) => (
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
            {posts.map((post) => (
              <div
                key={post._id}
                style={{
                  contentVisibility: 'auto',
                  containIntrinsicSize: 'auto 560px',
                }}
              >
                <PostCard post={post} onDelete={handleDelete} onUpdate={handleUpdate} />
              </div>
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} style={{ minHeight: 16 }}>
              {loadingMore && <Spinner size={24} />}
            </div>

            {!hasMore && (
              <p className="text-center text-muted text-sm py-6">You&apos;re all caught up!</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}