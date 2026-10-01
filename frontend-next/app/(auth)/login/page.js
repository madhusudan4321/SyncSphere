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
    <div className="w-full flex flex-col justify-center py-2">
      {/* Header Branding */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-surface2/60 border border-border/50 mb-3 shadow-sm">
          <Image src="/logo.png" alt="SyncSphere" width={52} height={52} className="object-contain" priority />
        </div>
        <h1 className="font-[family-name:var(--font-dancing)] text-5xl font-bold bg-logo-gradient mb-1">
          SyncSphere
        </h1>
        <p className="text-sm text-muted font-medium">
          Welcome back! Please enter your details.
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
            Username or Email
          </label>
          <input
            type="text"
            placeholder="e.g. alex or alex@example.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-surface2/40 outline-none text-text transition-all focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-text uppercase tracking-wider">
              Password
            </label>
            <Link href="/forgot" className="text-xs text-accent font-semibold hover:underline">
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs text-center font-medium animate-shake">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-none rounded-xl text-sm font-bold cursor-pointer transition-all shadow-md hover:shadow-lg hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Footer Switch */}
      <div className="mt-8 text-center pt-5 border-t border-border/60">
        <p className="text-sm text-muted">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-accent font-bold hover:underline ml-1">
            Sign up now
          </Link>
        </p>
      </div>
    </div>
  );
}
