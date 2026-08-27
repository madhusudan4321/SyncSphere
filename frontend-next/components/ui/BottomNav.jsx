'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import UploadModal from '@/components/feed/UploadModal';

export default function BottomNav() {
  const pathname = usePathname();
  const [showUpload, setShowUpload] = useState(false);

  const isActive = (path) => pathname.startsWith(path);

  return (
    <>
      <nav className="bg-surface border-t border-border flex-shrink-0">
        <div className="flex h-[52px] w-full">
          {/* Home */}
          <Link href="/feed" className="flex-1 flex items-center justify-center relative cursor-pointer">
            <svg width="24" height="24" fill={isActive('/feed') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              {isActive('/feed') && <path d="M9 22V12h6v10" />}
            </svg>
            {isActive('/feed') && <span className="absolute top-1.5 w-1 h-1 rounded-full bg-text" />}
          </Link>

          {/* Search */}
          <Link href="/search" className="flex-1 flex items-center justify-center relative cursor-pointer">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={isActive('/search') ? '2.5' : '2'} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {isActive('/search') && <span className="absolute top-1.5 w-1 h-1 rounded-full bg-text" />}
          </Link>

          {/* Add Post */}
          <div className="flex-[1.2] flex items-center justify-center">
            <button
              onClick={() => setShowUpload(true)}
              className="w-11 h-11 rounded-full bg-instagram-gradient flex items-center justify-center shadow-lg hover:scale-95 active:scale-90 transition-transform cursor-pointer"
            >
              <svg width="22" height="22" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {/* Chat */}
          <Link href="/chat" className="flex-1 flex items-center justify-center relative cursor-pointer">
            <svg width="24" height="24" fill={isActive('/chat') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            {isActive('/chat') && <span className="absolute top-1.5 w-1 h-1 rounded-full bg-text" />}
          </Link>

          {/* Profile */}
          <Link href="/profile" className="flex-1 flex items-center justify-center relative cursor-pointer">
            <svg width="24" height="24" fill={isActive('/profile') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            {isActive('/profile') && <span className="absolute top-1.5 w-1 h-1 rounded-full bg-text" />}
          </Link>
        </div>
        {/* Safe area padding for mobile */}
        <div className="h-[env(safe-area-inset-bottom)] bg-surface" />
      </nav>

      <UploadModal isOpen={showUpload} onClose={() => setShowUpload(false)} />
    </>
  );
}
