'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/lib/auth-context';
import UploadModal from '@/components/feed/UploadModal';

export default function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showUpload, setShowUpload] = useState(false);

  const isActive = (path) => pathname.startsWith(path);

  const navItems = [
    {
      label: 'Home',
      href: '/feed',
      icon: (active) => (
        <svg width="24" height="24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          {active && <path d="M9 22V12h6v10" />}
        </svg>
      ),
    },
    {
      label: 'Search',
      href: '/search',
      icon: (active) => (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={active ? '2.5' : '2'} viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
    },
    {
      label: 'Messages',
      href: '/chat',
      icon: (active) => (
        <svg width="24" height="24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      ),
    },
    {
      label: 'Profile',
      href: '/profile',
      icon: (active) => (
        <svg width="24" height="24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-surface px-5 py-6 fixed left-0 top-0 h-dvh z-30 justify-between select-none">
        {/* Top Header Logo */}
        <div>
          <Link href="/feed" className="flex items-center gap-2.5 mb-8 no-underline group px-2">
            <span className="font-[family-name:var(--font-dancing)] text-3xl font-bold bg-logo-gradient group-hover:scale-105 transition-transform">
              SyncSphere
            </span>
          </Link>

          {/* Nav items */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-4 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all no-underline ${
                    active
                      ? 'bg-accent/10 text-accent'
                      : 'text-text hover:bg-surface2 hover:text-accent'
                  }`}
                >
                  {item.icon(active)}
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Create Post Button */}
            <button
              onClick={() => setShowUpload(true)}
              className="w-full mt-4 flex items-center justify-center gap-2.5 py-3 px-4 bg-instagram-gradient text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg hover:opacity-95 transition-all cursor-pointer border-none"
            >
              <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Create Post</span>
            </button>
          </nav>
        </div>

        {/* Bottom User Account Menu */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between p-2 rounded-xl hover:bg-surface2 transition-colors">
            <div
              onClick={() => router.push('/profile')}
              className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
            >
              <Avatar user={user} size={38} fontSize={14} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate text-text">{user?.name || user?.username}</p>
                <p className="text-[11px] text-muted truncate">@{user?.username}</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-1.5 text-muted hover:text-danger bg-transparent border-none cursor-pointer transition-colors"
              title="Log Out"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16,17 21,12 16,7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <UploadModal isOpen={showUpload} onClose={() => setShowUpload(false)} />
    </>
  );
}
