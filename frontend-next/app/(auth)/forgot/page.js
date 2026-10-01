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

      {/* Step 1: Enter Email */}
      {step === 1 && (
        <>
          <div className="bg-surface border border-border rounded-[4px] px-8 pt-7 pb-5 mb-2.5">
            <p className="text-center text-[16px] font-semibold mb-4 font-[family-name:var(--font-playfair)] leading-[1.4]">
              Reset your password
            </p>
            <p className="text-center text-[13px] text-muted mb-4">
              Enter your registered email and we&apos;ll send you an OTP
            </p>
            <form onSubmit={handleSendOTP}>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-[6px] text-[13px] bg-[#fafafa] outline-none text-text transition-colors focus:border-[#aaa] focus:bg-white mb-2 block"
              />
              {error && <p className="text-danger text-xs text-center mt-1.5 min-h-4">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-[9px] bg-accent text-white border-none rounded-[8px] text-[14px] font-semibold cursor-pointer mt-2 transition-opacity hover:opacity-85 disabled:opacity-60"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          </div>
          <div className="bg-surface border border-border rounded-[4px] py-3.5 text-center text-[13px] text-muted">
            Remember your password?{' '}
            <Link href="/login" className="text-accent font-semibold cursor-pointer hover:underline">Log in</Link>
          </div>
        </>
      )}

      {/* Step 2: Enter OTP */}
      {step === 2 && (
        <div className="bg-surface border border-border rounded-[4px] px-8 pt-7 pb-5 mb-2.5">
          <p className="text-center text-[16px] font-semibold mb-4 font-[family-name:var(--font-playfair)] leading-[1.4]">
            Enter OTP
          </p>
          <p className="text-center text-[13px] text-muted mb-4">
            We sent a 6-digit OTP to <strong>{email}</strong>
          </p>
          <form onSubmit={handleVerifyOTP}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2.5 border border-border rounded-[6px] text-[20px] font-bold bg-[#fafafa] outline-none text-text transition-colors focus:border-[#aaa] focus:bg-white mb-2 block text-center tracking-[8px]"
            />
            {error && <p className="text-danger text-xs text-center mt-1.5 min-h-4">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-[9px] bg-accent text-white border-none rounded-[8px] text-[14px] font-semibold cursor-pointer mt-2 transition-opacity hover:opacity-85 disabled:opacity-60"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <p className="text-center mt-3 text-[13px] text-muted">
              Didn&apos;t receive?{' '}
              <span onClick={handleSendOTP} className="text-accent cursor-pointer font-semibold">Resend OTP</span>
            </p>
          </form>
        </div>
      )}

      {/* Step 3: New Password */}
      {step === 3 && (
        <div className="bg-surface border border-border rounded-[4px] px-8 pt-7 pb-5 mb-2.5">
          <p className="text-center text-[16px] font-semibold mb-4 font-[family-name:var(--font-playfair)] leading-[1.4]">
            Set new password
          </p>
          <form onSubmit={handleReset}>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New Password (min 6 chars)" />
            <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm New Password" />
            {error && <p className="text-danger text-xs text-center mt-1.5 min-h-4">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-[9px] bg-accent text-white border-none rounded-[8px] text-[14px] font-semibold cursor-pointer mt-2 transition-opacity hover:opacity-85 disabled:opacity-60"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
