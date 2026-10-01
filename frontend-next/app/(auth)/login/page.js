'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import PasswordInput from '@/components/ui/PasswordInput';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px',
    background: '#fafafa',
    boxSizing: 'border-box',
  },
  container: {
    width: '100%',
    maxWidth: 380,
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
    lineHeight: 1.1,
    margin: '4px 0 0',
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
    padding: '32px 40px 24px',
    marginBottom: 12,
    boxSizing: 'border-box',
  },
  heading: {
    textAlign: 'center',
    fontSize: 17,
    fontWeight: 600,
    lineHeight: 1.4,
    color: '#262626',
    margin: '0 0 24px',
    fontFamily: 'var(--font-playfair), Georgia, serif',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  error: {
    color: '#ed4956',
    fontSize: 13,
    textAlign: 'center',
    margin: '2px 0 0',
  },
  button: {
    width: '100%',
    padding: '11px 0',
    marginTop: 8,
    borderRadius: 8,
    border: 'none',
    background: '#0095f6',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  forgotWrap: { textAlign: 'center', marginTop: 20 },
  forgot: {
    fontSize: 13,
    fontWeight: 600,
    color: '#00376b',
    textDecoration: 'none',
  },
  switchCard: {
    background: '#ffffff',
    border: '1px solid #dbdbdb',
    borderRadius: 8,
    padding: '20px 16px',
    textAlign: 'center',
    fontSize: 14,
    color: '#737373',
    boxSizing: 'border-box',
  },
  signup: {
    color: '#0095f6',
    fontWeight: 600,
    textDecoration: 'none',
  },
};

export const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 12px',
  fontSize: 14,
  lineHeight: 1.2,
  color: '#262626',
  background: '#fafafa',
  border: '1px solid #dbdbdb',
  borderRadius: 6,
  outline: 'none',
  display: 'block',
  transition: 'border-color 0.15s, background 0.15s',
};

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const data = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password,
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
    <main style={styles.page}>
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

        {/* Login card */}
        <div style={styles.card}>
          <p style={styles.heading}>Sign in to see photos from your friends.</p>

          <form onSubmit={handleSubmit} style={styles.form} noValidate>
            <input
              type="text"
              placeholder="Email or Username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoComplete="username"
              style={{
                ...inputStyle,
                ...(focused ? { borderColor: '#a8a8a8', background: '#fff' } : {}),
              }}
            />

            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && <p style={styles.error}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <div style={styles.forgotWrap}>
            <Link href="/forgot" style={styles.forgot}>
              Forgot password?
            </Link>
          </div>
        </div>

        {/* Switch to register */}
        <div style={styles.switchCard}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={styles.signup}>
            Sign up
          </Link>
        </div>
      </div>
    </main>
  );
}