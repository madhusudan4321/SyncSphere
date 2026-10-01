'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import BottomNav from '@/components/ui/BottomNav';
import { SocketProvider } from '@/lib/socket';
import { CallProvider } from '@/lib/call-context';
import CallOverlay from '@/components/calls/CallOverlay';

export default function MainLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="w-full h-dvh flex items-center justify-center bg-surface">
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-dancing)] text-5xl font-bold bg-auth-gradient mb-2">
            SyncSphere
          </h1>
          <div className="w-8 h-8 border-3 border-border border-t-accent rounded-full animate-spin-slow mx-auto mt-4" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <SocketProvider>
      <CallProvider>
        {/* App Shell — exactly like legacy #app-shell: centered 480px container */}
        <div className="w-full max-w-[480px] h-dvh flex flex-col bg-surface relative shadow-[0_0_40px_rgba(0,0,0,0.08)] overflow-hidden">
          {/* Top Nav */}
          <header className="bg-surface border-b border-border px-4 h-[54px] flex items-center justify-center flex-shrink-0 z-10">
            <div className="flex items-center gap-1">
              <span className="font-[family-name:var(--font-dancing)] text-[28px] font-bold bg-logo-gradient">
                SyncSphere
              </span>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-hidden relative">
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
