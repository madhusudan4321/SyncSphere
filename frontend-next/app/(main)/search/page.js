'use client';

import { useState, useEffect, useRef } from 'react';
import Avatar from '@/components/ui/Avatar';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get(`/users/search?q=${encodeURIComponent(query.trim())}`);
        setResults(data);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="p-3 px-4">
        <div className="flex items-center gap-2 bg-surface2 rounded-[10px] px-3 py-2">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-muted flex-shrink-0">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users..."
            className="bg-transparent border-none outline-none text-sm flex-1 text-text placeholder:text-muted"
          />
          {query && (
            <button onClick={() => setQuery('')} className="bg-transparent border-none cursor-pointer text-muted text-lg leading-none">×</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin-slow" />
        </div>
      ) : results.length > 0 ? (
        <div>
          {results.map(u => (
            <div
              key={u._id}
              onClick={() => router.push(`/profile/${u.username}`)}
              className="flex items-center gap-3 px-4 py-3 border-b border-border cursor-pointer hover:bg-surface2 transition-colors"
            >
              <Avatar user={u} size={46} fontSize={15} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{u.username}</p>
                <p className="text-xs text-muted truncate">{u.name || u.bio || ''}</p>
              </div>
            </div>
          ))}
        </div>
      ) : query ? (
        <p className="text-center text-muted text-sm py-10">No users found</p>
      ) : (
        <p className="text-center text-muted text-sm py-10 px-10">Search for people to follow and connect with</p>
      )}
    </div>
  );
}
