'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Image from 'next/image';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/feed');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  // Splash screen while deciding
  return (
    <div className="w-full h-dvh flex items-center justify-center bg-surface">
      <div className="text-center flex flex-col items-center">
        <Image src="/logo.png" alt="SyncSphere" width={80} height={80} className="mb-4" />
        <h1 className="font-[family-name:var(--font-dancing)] text-5xl font-bold bg-auth-gradient mb-2">
          SyncSphere
        </h1>
        <div className="w-8 h-8 border-3 border-border border-t-accent rounded-full animate-spin-slow mt-4" />
      </div>
    </div>
  );
}
