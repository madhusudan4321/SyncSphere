'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import BottomNav from '@/components/ui/BottomNav';
import DesktopSidebar from '@/components/ui/DesktopSidebar';
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
        <div className="w-full min-h-dvh bg-background flex flex-col md:flex-row text-text">
          {/* Desktop Left Navigation Sidebar */}
          <DesktopSidebar />

          {/* Main App Container */}
          <div className="flex-1 md:ml-64 flex flex-col items-center min-h-dvh justify-start relative">
            {/* Mobile Top Header (Hidden on Desktop) */}
            <header className="md:hidden w-full max-w-[480px] bg-surface border-b border-border px-4 h-[54px] flex items-center justify-center flex-shrink-0 z-10 sticky top-0">
              <span className="font-[family-name:var(--font-dancing)] text-[28px] font-bold bg-logo-gradient">
                SyncSphere
              </span>
            </header>

            {/* Content View Container */}
            <main className="w-full max-w-[540px] md:max-w-2xl lg:max-w-4xl h-dvh md:h-dvh flex flex-col bg-surface border-x border-border/60 shadow-lg relative overflow-hidden">
              {children}
            </main>

            {/* Mobile Bottom Navigation (Hidden on Desktop) */}
            <div className="md:hidden w-full max-w-[480px]">
              <BottomNav />
            </div>

            {/* WebRTC Call UI Overlay */}
            <CallOverlay />
          </div>
        </div>
      </CallProvider>
    </SocketProvider>
  );
}
