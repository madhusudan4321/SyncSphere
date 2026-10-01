'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import PasswordInput from '@/components/ui/PasswordInput';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!identifier || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const data = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password
      });
      login(data);
      router.push('/feed');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Logo — matching legacy: 150x150 image + 52px Dancing Script */}
      <div className="text-center flex flex-col items-center gap-0 mb-1">
        <Image
          src="/logo.png"
          alt="SyncSphere"
          width={150}
          height={150}
          className="object-contain"
          style={{ mixBlendMode: 'multiply' }}
          priority
        />
        <h1
          className="text-[52px] font-bold bg-auth-gradient leading-tight mb-2"
          style={{ fontFamily: 'var(--font-dancing), "Dancing Script", cursive' }}
        >
          SyncSphere
        </h1>
      </div>

      {/* Login Card — matching legacy auth-card */}
      <div className="bg-surface border border-border rounded-[8px] px-10 pt-8 pb-6 mb-4">
        <p className="text-center text-[16px] font-semibold mb-4 font-[family-name:var(--font-playfair)] leading-[1.4]">
          Sign in to see photos from your friends.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Email or Username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="off"
            className="w-full px-3 py-2.5 border border-border rounded-[6px] text-[13px] bg-[#fafafa] outline-none text-text transition-colors focus:border-[#aaa] focus:bg-white mb-3 block"
          />
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
          />

          {error && (
            <p className="text-danger text-xs text-center mt-1.5 min-h-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-[10px] rounded-[8px] text-[14px] font-semibold cursor-pointer mt-4 transition-opacity hover:opacity-85 disabled:opacity-60"
            style={{ background: '#0095f6', color: '#ffffff', border: 'none' }}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className="text-center mt-4">
          <Link href="/forgot" className="text-[13px] text-accent font-semibold cursor-pointer hover:underline">
            Forgot password?
          </Link>
        </div>
      </div>

      {/* Switch to Register — matching legacy auth-switch */}
      <div className="bg-surface border border-border rounded-[8px] py-4 text-center text-[14px] text-muted">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-accent font-semibold cursor-pointer hover:underline">
          Sign up
        </Link>
      </div>
    </>
  );
}
