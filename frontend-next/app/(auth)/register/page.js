'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import PasswordInput from '@/components/ui/PasswordInput';
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
    padding: '28px 24px 20px',
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
    transition: 'opacity 0.15s',
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
  link: {
    color: '#0095f6',
    fontWeight: 600,
    textDecoration: 'none',
  },
};

const inputStyle = {
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

function TextInput(props) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...inputStyle,
        ...(focused ? { borderColor: '#a8a8a8', background: '#fff' } : {}),
      }}
    />
  );
}

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

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

        {/* Register card */}
        <div style={styles.card}>
          <p style={styles.heading}>Sign up to see photos from your friends.</p>

          <form onSubmit={handleSubmit} style={styles.form} noValidate>
            <TextInput
              type="text"
              placeholder="Username"
              value={form.username}
              onChange={update('username')}
              autoComplete="username"
            />
            <TextInput
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={update('email')}
              autoComplete="email"
            />
            <PasswordInput
              value={form.password}
              onChange={update('password')}
              placeholder="Password (min 6 chars)"
              autoComplete="new-password"
            />
            <PasswordInput
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              placeholder="Confirm Password"
              autoComplete="new-password"
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
              {loading ? 'Signing up...' : 'Sign Up'}
            </button>
          </form>
        </div>

        {/* Switch to login */}
        <div style={styles.switchCard}>
          Have an account?{' '}
          <Link href="/login" style={styles.link}>
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}