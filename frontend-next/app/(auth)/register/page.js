'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import PasswordInput from '@/components/ui/PasswordInput';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const { username, email, password, confirmPassword } = form;
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
      await api.post('/auth/register', { username: username.trim(), email: email.trim(), password });
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
      {/* Logo — matching legacy */}
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
        <h1 className="font-[family-name:var(--font-dancing)] text-[52px] font-bold bg-auth-gradient leading-tight mb-2">
          SyncSphere
        </h1>
      </div>

      {/* Register Card */}
      <div className="bg-surface border border-border rounded-[4px] px-8 pt-7 pb-5 mb-2.5">
        <p className="text-center text-[16px] font-semibold mb-4 font-[family-name:var(--font-playfair)] leading-[1.4]">
          Sign up to see photos from your friends.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={update('username')}
            className="w-full px-3 py-2.5 border border-border rounded-[6px] text-[13px] bg-[#fafafa] outline-none text-text transition-colors focus:border-[#aaa] focus:bg-white mb-2 block"
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={update('email')}
            autoComplete="email"
            className="w-full px-3 py-2.5 border border-border rounded-[6px] text-[13px] bg-[#fafafa] outline-none text-text transition-colors focus:border-[#aaa] focus:bg-white mb-2 block"
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

          {error && (
            <p className="text-danger text-xs text-center mt-1.5 min-h-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-[9px] bg-accent text-white border-none rounded-[8px] text-[14px] font-semibold cursor-pointer mt-2 transition-opacity hover:opacity-85 disabled:opacity-60"
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>
      </div>

      {/* Switch to Login */}
      <div className="bg-surface border border-border rounded-[4px] py-3.5 text-center text-[13px] text-muted">
        Have an account?{' '}
        <Link href="/login" className="text-accent font-semibold cursor-pointer hover:underline">
          Log in
        </Link>
      </div>
    </>
  );
}
