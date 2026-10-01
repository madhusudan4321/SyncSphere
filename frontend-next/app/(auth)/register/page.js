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
    <>
      {/* Logo */}
      <div className="text-center mb-2 flex flex-col items-center gap-2">
        <Image src="/logo.png" alt="SyncSphere" width={100} height={100} className="mx-auto" priority />
        <h1 className="font-[family-name:var(--font-dancing)] text-[48px] font-bold bg-auth-gradient leading-tight">
          SyncSphere
        </h1>
      </div>

      {/* Register Card */}
      <div className="bg-surface border border-border rounded-md px-8 pt-6 pb-7 mb-3">
        <p className="text-center text-[15px] font-semibold mb-6 font-[family-name:var(--font-playfair)] leading-snug">
          Sign up to see photos and videos from your friends.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={update('username')}
            className="w-full px-4 py-3 border border-border rounded-lg text-sm bg-[#fafafa] outline-none text-text transition-colors focus:border-[#aaa] focus:bg-white"
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={update('email')}
            className="w-full px-4 py-3 border border-border rounded-lg text-sm bg-[#fafafa] outline-none text-text transition-colors focus:border-[#aaa] focus:bg-white"
          />
          <input
            type="text"
            placeholder="Full Name (optional)"
            value={form.name}
            onChange={update('name')}
            className="w-full px-4 py-3 border border-border rounded-lg text-sm bg-[#fafafa] outline-none text-text transition-colors focus:border-[#aaa] focus:bg-white"
          />
          <PasswordInput
            value={form.password}
            onChange={update('password')}
            placeholder="Password (min 6 chars)"
          />
          <PasswordInput
            value={form.confirmPassword}
            onChange={update('confirmPassword')}
            placeholder="Confirm Password"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-accent text-white border-none rounded-lg text-[15px] font-semibold cursor-pointer mt-2 transition-opacity hover:opacity-85 disabled:opacity-60"
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>

        {error && (
          <p className="text-danger text-xs text-center mt-2 min-h-4">{error}</p>
        )}
      </div>

      {/* Switch to Login */}
      <div className="bg-surface border border-border rounded-md py-4 text-center text-sm text-muted">
        Have an account?{' '}
        <Link href="/login" className="text-accent font-semibold cursor-pointer hover:underline">
          Log in
        </Link>
      </div>
    </>
  );
}
