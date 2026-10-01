'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import PasswordInput from '@/components/ui/PasswordInput';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', name: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const { username, email, name, password, confirmPassword } = form;
    if (!username || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', { username: username.trim(), email: email.trim(), name: name.trim(), password });
      showToast('Account created! Please verify your email.');
      sessionStorage.setItem('verify_email', email.trim());
      router.push('/verify');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col justify-center py-2">
      {/* Header Branding */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-surface2/60 border border-border/50 mb-3 shadow-sm">
          <Image src="/logo.png" alt="SyncSphere" width={48} height={48} className="object-contain" priority />
        </div>
        <h1 className="font-[family-name:var(--font-dancing)] text-4xl font-bold bg-logo-gradient mb-1">
          Create Account
        </h1>
        <p className="text-xs text-muted font-medium">
          Sign up to connect and share with your network
        </p>
      </div>

      {/* Register Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-text uppercase tracking-wider mb-1">
              Username *
            </label>
            <input
              type="text"
              placeholder="e.g. alex"
              value={form.username}
              onChange={update('username')}
              className="w-full px-3.5 py-2.5 border border-border rounded-xl text-xs bg-surface2/40 outline-none text-text transition-all focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-text uppercase tracking-wider mb-1">
              Full Name
            </label>
            <input
              type="text"
              placeholder="e.g. Alex Johnson"
              value={form.name}
              onChange={update('name')}
              className="w-full px-3.5 py-2.5 border border-border rounded-xl text-xs bg-surface2/40 outline-none text-text transition-all focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-text uppercase tracking-wider mb-1">
            Email Address *
          </label>
          <input
            type="email"
            placeholder="alex@example.com"
            value={form.email}
            onChange={update('email')}
            className="w-full px-3.5 py-2.5 border border-border rounded-xl text-xs bg-surface2/40 outline-none text-text transition-all focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-text uppercase tracking-wider mb-1">
              Password *
            </label>
            <PasswordInput
              value={form.password}
              onChange={update('password')}
              placeholder="Min 6 chars"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-text uppercase tracking-wider mb-1">
              Confirm Password *
            </label>
            <PasswordInput
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              placeholder="Re-enter password"
            />
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs text-center font-medium animate-shake">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-none rounded-xl text-sm font-bold cursor-pointer transition-all shadow-md hover:shadow-lg hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating Account...
            </>
          ) : (
            'Sign Up'
          )}
        </button>
      </form>

      {/* Footer Switch */}
      <div className="mt-6 text-center pt-4 border-t border-border/60">
        <p className="text-xs text-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-accent font-bold hover:underline ml-1">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
