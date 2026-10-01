'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export default function VerifyPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef([]);
  const { login } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const email = typeof window !== 'undefined' ? sessionStorage.getItem('verify_email') || '' : '';

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('verify_email')) {
      router.push('/register');
    }
  }, [router]);

  const handleChange = (idx, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[idx] = value.slice(-1);
    setOtp(next);
    setError('');
    if (value && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
    if (next.every(d => d !== '')) {
      handleVerify(next.join(''));
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async (code) => {
    const otpCode = code || otp.join('');
    if (otpCode.length !== 6) {
      setError('Enter a valid 6-digit OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await api.post('/auth/verify-email', { email, otp: otpCode });
      login(data);
      sessionStorage.removeItem('verify_email');
      showToast('Email verified!');
      router.push('/feed');
    } catch (err) {
      setError(err.message || 'Verification failed');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await api.post('/auth/resend-verify', { email });
      showToast('OTP resent!');
      setCooldown(60);
    } catch (err) {
      showToast(err.message || 'Failed to resend');
    }
  };

  return (
    <>
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

      <div className="bg-surface border border-border rounded-[4px] px-8 pt-7 pb-5 mb-2.5">
        <div className="text-center mb-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#0095f6] to-[#00d4ff] flex items-center justify-center mx-auto mb-3.5">
            <svg width="28" height="28" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <p className="text-[16px] font-semibold font-[family-name:var(--font-playfair)] leading-[1.4] m-0">
            Verify your email
          </p>
          <p className="text-[13px] text-muted mt-1.5">
            We sent a 6-digit code to<br />
            <strong>{email}</strong>
          </p>
        </div>

        <div className="flex gap-2.5 justify-center my-5 mb-2">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => inputRefs.current[i] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-[46px] h-[54px] rounded-[12px] border-2 border-border bg-surface2 text-text text-[22px] font-bold text-center outline-none transition-all focus:border-accent focus:shadow-[0_0_0_3px_rgba(0,149,246,0.15)] focus:scale-[1.06]"
              style={{ caretColor: 'var(--color-accent)' }}
            />
          ))}
        </div>

        {error && (
          <p className="text-danger text-xs text-center mt-1.5 mb-0 animate-shake">{error}</p>
        )}

        <button
          onClick={() => handleVerify()}
          disabled={loading || otp.some(d => d === '')}
          className="w-full py-[9px] bg-accent text-white border-none rounded-[8px] text-[14px] font-semibold cursor-pointer mt-2 transition-opacity hover:opacity-85 disabled:opacity-60"
        >
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>

        <p className="text-center text-[13px] text-muted mt-3.5">
          Didn&apos;t receive it?{' '}
          {cooldown > 0 ? (
            <span className="text-muted">Resend in {cooldown}s</span>
          ) : (
            <span onClick={handleResend} className="text-accent cursor-pointer font-semibold">
              Resend OTP
            </span>
          )}
        </p>
      </div>

      <div className="bg-surface border border-border rounded-[4px] py-3.5 text-center text-[13px] text-muted">
        <Link href="/register" className="text-accent font-semibold cursor-pointer hover:underline">
          ← Back to Sign Up
        </Link>
      </div>
    </>
  );
}
