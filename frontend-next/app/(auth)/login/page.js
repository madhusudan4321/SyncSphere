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
      {/* Logo */}
      <div className="text-center mb-1 flex flex-col items-center gap-0">
        <Image src="/logo.png" alt="SyncSphere" width={60} height={60} className="mx-auto" />
        <h1 className="font-[family-name:var(--font-dancing)] text-[52px] font-bold bg-auth-gradient">
          SyncSphere
        </h1>
      </div>

      {/* Login Card */}
      <div className="bg-surface border border-border rounded-md px-8 py-7 mb-2.5">
        <p className="text-center text-base font-semibold mb-4 font-[family-name:var(--font-playfair)] leading-snug">
          Sign in to see photos and videos from your friends
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username or email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full px-3 py-2.5 border border-border rounded-md text-[13px] bg-[#fafafa] outline-none text-text transition-colors focus:border-[#aaa] focus:bg-white mb-2"
          />
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-accent text-white border-none rounded-lg text-sm font-semibold cursor-pointer mt-2 transition-opacity hover:opacity-85 disabled:opacity-60"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        {error && (
          <p className="text-danger text-xs text-center mt-1.5 min-h-4">{error}</p>
        )}

        <div className="text-center mt-4">
          <Link href="/forgot" className="text-xs text-accent font-medium hover:underline">
            Forgot password?
          </Link>
        </div>
      </div>

      {/* Switch to Register */}
      <div className="bg-surface border border-border rounded-md py-3.5 text-center text-[13px] text-muted">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-accent font-semibold cursor-pointer hover:underline">
          Sign up
        </Link>
      </div>
    </>
  );
}
