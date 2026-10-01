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
      <div className="text-center mb-2 flex flex-col items-center gap-2">
        <Image src="/logo.png" alt="SyncSphere" width={100} height={100} className="mx-auto" priority />
        <h1 className="font-[family-name:var(--font-dancing)] text-[48px] font-bold bg-auth-gradient leading-tight">
          SyncSphere
        </h1>
      </div>

      {/* Login Card */}
      <div className="bg-surface border border-border rounded-md px-8 pt-6 pb-7 mb-3">
        <p className="text-center text-[15px] font-semibold mb-6 font-[family-name:var(--font-playfair)] leading-snug">
          Sign in to see photos and videos from your friends.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Email or Username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full px-4 py-3 border border-border rounded-lg text-sm bg-[#fafafa] outline-none text-text transition-colors focus:border-[#aaa] focus:bg-white"
          />
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-accent text-white border-none rounded-lg text-[15px] font-semibold cursor-pointer mt-2 transition-opacity hover:opacity-85 disabled:opacity-60"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        {error && (
          <p className="text-danger text-xs text-center mt-2 min-h-4">{error}</p>
        )}

        <div className="text-center mt-4">
          <Link href="/forgot" className="text-sm text-accent font-medium hover:underline">
            Forgot password?
          </Link>
        </div>
      </div>

      {/* Switch to Register */}
      <div className="bg-surface border border-border rounded-md py-4 text-center text-sm text-muted">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-accent font-semibold cursor-pointer hover:underline">
          Sign up
        </Link>
      </div>
    </>
  );
}
