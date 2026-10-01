'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import PasswordInput from '@/components/ui/PasswordInput';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export default function ForgotPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/forgot/send-otp', { email: email.trim() });
      showToast('OTP sent to your email!');
      setStep(2);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) { setError('Enter a valid 6-digit OTP'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/forgot/verify-otp', { email: email.trim(), otp });
      setStep(3);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) { setError('Please fill both fields'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/forgot/reset-password', { email: email.trim(), otp, newPassword: password });
      showToast('Password reset successfully!');
      router.push('/login');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div className="text-center mb-1 flex flex-col items-center gap-0">
        <Image src="/logo.png" alt="SyncSphere" width={80} height={80} className="mx-auto" priority />
        <h1 className="font-[family-name:var(--font-dancing)] text-[52px] font-bold bg-auth-gradient">
          SyncSphere
        </h1>
      </div>

      <div className="bg-surface border border-border rounded-md px-8 py-7 mb-2.5">
        <h2 className="text-center text-lg font-bold mb-2">Reset Password</h2>

        {/* Step 1: Email */}
        {step === 1 && (
          <form onSubmit={handleSendOTP} className="flex flex-col gap-2">
            <p className="text-center text-[13px] text-muted mb-3">
              Enter your email address and we&apos;ll send you an OTP.
            </p>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-md text-[13px] bg-[#fafafa] outline-none text-text transition-colors focus:border-[#aaa] focus:bg-white"
            />
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-accent text-white border-none rounded-lg text-sm font-semibold cursor-pointer mt-1 transition-opacity hover:opacity-85 disabled:opacity-60">
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        )}

        {/* Step 2: OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOTP} className="flex flex-col gap-2">
            <p className="text-center text-[13px] text-muted mb-3">
              Enter the code sent to <span className="font-semibold text-text">{email}</span>
            </p>
            <input
              type="text"
              inputMode="numeric"
              placeholder="6-digit OTP"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2.5 border border-border rounded-md text-[13px] bg-[#fafafa] outline-none text-text transition-colors focus:border-[#aaa] focus:bg-white text-center tracking-[8px] text-lg font-bold"
            />
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-accent text-white border-none rounded-lg text-sm font-semibold cursor-pointer mt-1 transition-opacity hover:opacity-85 disabled:opacity-60">
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        )}

        {/* Step 3: New Password */}
        {step === 3 && (
          <form onSubmit={handleReset} className="flex flex-col gap-2">
            <p className="text-center text-[13px] text-muted mb-3">
              Enter your new password.
            </p>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" />
            <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-accent text-white border-none rounded-lg text-sm font-semibold cursor-pointer mt-1 transition-opacity hover:opacity-85 disabled:opacity-60">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        {error && <p className="text-danger text-xs text-center mt-2">{error}</p>}
      </div>

      <div className="bg-surface border border-border rounded-md py-3.5 text-center text-[13px] text-muted">
        <Link href="/login" className="text-accent font-semibold hover:underline">Back to Login</Link>
      </div>
    </>
  );
}
