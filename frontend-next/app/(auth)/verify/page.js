'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

const styles = {
  page: {
    width: '100%',
  },
  container: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  logoWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 20,
  },
  brand: {
    fontFamily: 'var(--font-dancing), "Dancing Script", cursive',
    fontSize: 52,
    fontWeight: 700,
    lineHeight: 1.3,
    margin: '4px 0 0',
    padding: '0 8px 14 px',
    background: 'linear-gradient(90deg, #4f46e5, #c026d3, #e11d48)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
  },
  card: {
    background: '#ffffff',
    border: '1px solid #dbdbdb',
    borderRadius: 8,
    padding: '28px 24px 20px',
    marginBottom: 12,
    boxSizing: 'border-box',
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #0095f6, #00d4ff)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 14px',
  },
  heading: {
    fontSize: 17,
    fontWeight: 600,
    lineHeight: 1.4,
    color: '#262626',
    margin: 0,
    fontFamily: 'var(--font-playfair), Georgia, serif',
  },
  subText: {
    fontSize: 13,
    color: '#737373',
    lineHeight: 1.5,
    margin: '6px 0 0',
    wordBreak: 'break-all',
  },
  email: {
    color: '#262626',
    fontWeight: 600,
  },
  otpRow: {
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
    margin: '20px 0 8px',
  },
  error: {
    color: '#ed4956',
    fontSize: 13,
    textAlign: 'center',
    margin: '6px 0 0',
  },
  button: {
    width: '100%',
    padding: '11px 0',
    marginTop: 12,
    borderRadius: 8,
    border: 'none',
    background: '#0095f6',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
    transition: 'opacity 0.15s',
  },
  resendWrap: {
    textAlign: 'center',
    fontSize: 13,
    color: '#737373',
    margin: '16px 0 0',
  },
  resendBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    color: '#0095f6',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  switchCard: {
    background: '#ffffff',
    border: '1px solid #dbdbdb',
    borderRadius: 8,
    padding: '20px 16px',
    textAlign: 'center',
    fontSize: 14,
    boxSizing: 'border-box',
  },
  link: {
    color: '#0095f6',
    fontWeight: 600,
    textDecoration: 'none',
  },
};

const otpInputBase = {
  flex: '1 1 0',
  minWidth: 0,
  maxWidth: 46,
  height: 52,
  boxSizing: 'border-box',
  padding: 0,
  borderRadius: 10,
  border: '2px solid #dbdbdb',
  background: '#fafafa',
  color: '#262626',
  fontSize: 22,
  fontWeight: 700,
  textAlign: 'center',
  outline: 'none',
  caretColor: '#0095f6',
  transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
};

export default function VerifyPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const inputRefs = useRef([]);
  const { login } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const email = typeof window !== 'undefined' ? sessionStorage.getItem('verify_email') || '' : '';

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
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
    if (next.every((d) => d !== '')) {
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

  const incomplete = otp.some((d) => d === '');

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <Image
            src="/logo.png"
            alt="SyncSphere"
            width={120}
            height={120}
            style={{ objectFit: 'contain', mixBlendMode: 'multiply' }}
            priority
          />
          <h1 style={styles.brand}>SyncSphere</h1>
        </div>

        {/* Verify card */}
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.iconCircle}>
              <svg width="28" height="28" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <p style={styles.heading}>Verify your email</p>
            <p style={styles.subText}>
              We sent a 6-digit code to
              <br />
              <span style={styles.email}>{email}</span>
            </p>
          </div>

          {/* OTP inputs */}
          <div style={styles.otpRow}>
            {otp.map((digit, i) => {
              const isFocused = focusedIdx === i;
              return (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onFocus={() => setFocusedIdx(i)}
                  onBlur={() => setFocusedIdx(-1)}
                  style={{
                    ...otpInputBase,
                    ...(isFocused
                      ? {
                          borderColor: '#0095f6',
                          background: '#ffffff',
                          boxShadow: '0 0 0 3px rgba(0,149,246,0.15)',
                        }
                      : {}),
                  }}
                />
              );
            })}
          </div>

          {error && (
            <p className="animate-shake" style={styles.error}>
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => handleVerify()}
            disabled={loading || incomplete}
            style={{
              ...styles.button,
              opacity: loading || incomplete ? 0.6 : 1,
              cursor: loading || incomplete ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>

          <p style={styles.resendWrap}>
            Didn&apos;t receive it?{' '}
            {cooldown > 0 ? (
              <span>Resend in {cooldown}s</span>
            ) : (
              <button type="button" onClick={handleResend} style={styles.resendBtn}>
                Resend OTP
              </button>
            )}
          </p>
        </div>

        {/* Back to sign up */}
        <div style={styles.switchCard}>
          <Link href="/register" style={styles.link}>
            ← Back to Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}