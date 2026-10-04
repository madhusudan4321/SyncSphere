'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import BottomNav from '@/components/ui/BottomNav';
import { SocketProvider } from '@/lib/socket';
import { CallProvider } from '@/lib/call-context';
import CallOverlay from '@/components/calls/CallOverlay';

export default function MainLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div
        style={{
          width: '100%',
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
        }}
      >
        <style>{`
          @keyframes ss-spin { to { transform: rotate(360deg); } }
        `}</style>
  
        <h1
          style={{
            fontFamily: 'var(--font-dancing), "Dancing Script", cursive',
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 1.3,
            margin: 0,
            padding: '0 8px 14px',
            display: 'inline-block',
            background: 'linear-gradient(90deg, #4f46e5, #c026d3, #e11d48)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
          }}
        >
          SyncSphere
        </h1>
  
        <div
          style={{
            width: 32,
            height: 32,
            marginTop: 16,
            border: '3px solid #dbdbdb',
            borderTopColor: '#0095f6',
            borderRadius: '50%',
            animation: 'ss-spin 0.8s linear infinite',
          }}
        />
      </div>
    );
  }

  if (!user) return null;

  const hideTopHeader = pathname.startsWith('/chat');

  return (
    <SocketProvider>
      <CallProvider>
        {/* App Shell — Centered 480px Instagram container on desktop, 100% on mobile */}
        <div className="w-full max-w-[480px] h-dvh flex flex-col bg-surface relative shadow-[0_0_40px_rgba(0,0,0,0.08)] overflow-hidden mx-auto">
          {/* Top Nav — hidden on /chat tab to match legacy frontend */}
          {!hideTopHeader && (
            <header className="bg-surface border-b border-border px-4 h-[54px] w-full flex items-center justify-center flex-shrink-0 z-10">
              <div className="flex items-center gap-1">
                <span className="font-[family-name:var(--font-dancing)] text-[28px] font-bold bg-logo-gradient">
                  SyncSphere
                </span>
              </div>
            </header>
          )}

          {/* Content Area */}
          <main className="flex-1 w-full overflow-hidden relative">
            {children}
          </main>

          {/* Bottom Nav */}
          <BottomNav />

          {/* Call UI Overlay */}
          <CallOverlay />
        </div>
      </CallProvider>
    </SocketProvider>
  );
}
