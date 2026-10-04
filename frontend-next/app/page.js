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

      <Image
        src="/logo.png"
        alt="SyncSphere"
        width={80}
        height={80}
        style={{ objectFit: 'contain', mixBlendMode: 'multiply', marginBottom: 8 }}
        priority
      />

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
          marginTop: 8,
          border: '3px solid #dbdbdb',
          borderTopColor: '#0095f6',
          borderRadius: '50%',
          animation: 'ss-spin 0.8s linear infinite',
        }}
      />
    </div>
  );
}