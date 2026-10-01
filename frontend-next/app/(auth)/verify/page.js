'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Redirect if no email
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
    // Auto-submit
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
      <div className="text-center mb-1 flex flex-col items-center gap-0">
        <Image src="/logo.png" alt="SyncSphere" width={80} height={80} className="mx-auto" priority />
        <h1 className="font-[family-name:var(--font-dancing)] text-[52px] font-bold bg-auth-gradient">
          SyncSphere
        </h1>
      </div>

      <div className="bg-surface border border-border rounded-md px-8 py-7 mb-2.5">
        <h2 className="text-center text-lg font-bold mb-2">Verify Email</h2>
        <p className="text-center text-[13px] text-muted mb-6">
          Enter the 6-digit code sent to<br />
          <span className="font-semibold text-text">{email}</span>
        </p>

        {/* OTP Inputs */}
        <div className="flex gap-2 justify-center mb-4">
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
              className="w-11 h-12 text-center text-xl font-bold border-2 border-border rounded-lg outline-none focus:border-accent transition-colors bg-[#fafafa]"
            />
          ))}
        </div>

        {error && (
          <p className="text-danger text-xs text-center mb-3 animate-shake">{error}</p>
        )}

        <button
          onClick={() => handleVerify()}
          disabled={loading || otp.some(d => d === '')}
          className="w-full py-2.5 bg-accent text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-opacity hover:opacity-85 disabled:opacity-60"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>

        <div className="text-center mt-4">
          <button
            onClick={handleResend}
            disabled={cooldown > 0}
            className="text-xs text-accent font-medium hover:underline disabled:text-muted disabled:no-underline cursor-pointer bg-transparent border-none"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
          </button>
        </div>
      </div>
    </>
  );
}
