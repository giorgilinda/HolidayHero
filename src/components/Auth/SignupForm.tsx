"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './Auth.module.css';

interface Family {
  id: string;
  name: string;
}

export function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [familyMode, setFamilyMode] = useState<'create' | 'join'>('create');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [searchResults, setSearchResults] = useState<Family[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for invite code in URL and pre-fill it
  useEffect(() => {
    const inviteParam = searchParams?.get('invite');
    if (inviteParam) {
      const cleanInviteCode = inviteParam.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
      if (cleanInviteCode.length >= 4) {
        setInviteCode(cleanInviteCode);
        setFamilyMode('join');
      }
    }
  }, [searchParams]);

  // Search for families by invite code
  useEffect(() => {
    if (familyMode === 'join' && inviteCode.trim().length >= 4) {
      const searchTimeout = setTimeout(async () => {
        setSearching(true);
        try {
          const response = await fetch(`/api/families?inviteCode=${encodeURIComponent(inviteCode.trim())}`);
          if (response.ok) {
            const families = await response.json();
            setSearchResults(families);
            if (families.length > 0) {
              setSelectedFamilyId(families[0].id);
            } else {
              setSelectedFamilyId(null);
            }
          }
        } catch (err) {
          console.error('Error searching family by invite code:', err);
        } finally {
          setSearching(false);
        }
      }, 300); // Debounce search

      return () => clearTimeout(searchTimeout);
    } else {
      setSearchResults([]);
      setSelectedFamilyId(null);
    }
  }, [inviteCode, familyMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Validate family selection
    if (familyMode === 'create' && !familyName.trim()) {
      setError('Please enter a family name');
      return;
    }

    if (familyMode === 'join' && !selectedFamilyId && !inviteCode.trim()) {
      setError('Please enter an invite code to join a family');
      return;
    }
    
    if (familyMode === 'join' && inviteCode.trim() && !selectedFamilyId) {
      setError('Invalid invite code. Please check and try again.');
      return;
    }

    // Check if family name already exists (for create mode)
    if (familyMode === 'create' && familyName.trim()) {
      setLoading(true);
      try {
        // Use exact=true to check for duplicate names (bypasses public-only restriction)
        const response = await fetch(`/api/families?search=${encodeURIComponent(familyName.trim())}&exact=true`);
        if (response.ok) {
          const existingFamilies = await response.json();
          // If any family is returned, it means a duplicate exists
          if (existingFamilies && existingFamilies.length > 0) {
            setError(`A family with the name "${familyName.trim()}" already exists. Please ask the family owner for the invite code to join instead.`);
            setLoading(false);
            return;
          }
        } else {
          // If the API call failed, log it
          const errorText = await response.text().catch(() => 'Unknown error');
          console.warn('Failed to check for duplicate family name:', response.status, errorText);
          // Don't block signup - the database constraint will prevent duplicates anyway
        }
      } catch (err) {
        console.error('Error checking family name:', err);
        // Continue with signup if check fails (don't block user)
        // The database constraint will prevent duplicates anyway
      }
      setLoading(false);
    }

    setLoading(true);

    const { error, session } = await signUp(
      email, 
      password, 
      familyMode === 'create' ? familyName.trim() : undefined,
      familyMode === 'join' ? selectedFamilyId || undefined : undefined
    );
    
    if (error) {
      // Display the error message to the user
      const errorMessage = error.message || 'An error occurred during signup';
      setError(errorMessage);
      setLoading(false);
      return;
    } else if (session) {
      // User is immediately authenticated (email confirmations disabled)
      // Redirect to home page
      router.push('/');
    } else {
      // Email confirmation required
      setSuccess(true);
      // Wait a bit then redirect to login or show message
      setTimeout(() => {
        router.push('/auth/login?message=Please check your email to verify your account');
      }, 2000);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      // If successful, the page will redirect to Google OAuth
      // Don't reset loading here - let the redirect happen
      // If there's an error, it will be caught below
    } catch (err) {
      console.error('Google sign-in error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google. Please check your browser console for details.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <h2>Check your email</h2>
          <p className={styles.success}>
            We&apos;ve sent you a confirmation email. Please check your inbox and click the link to verify your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h2>Sign Up</h2>
        <p className={styles.subtitle}>Create an account to get started</p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="your@email.com"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="••••••••"
              minLength={6}
            />
            <small>At least 6 characters</small>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="••••••••"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Family</label>
            <div className={styles.toggleButtonGroup}>
              <button
                type="button"
                onClick={() => {
                  setFamilyMode('create');
                  setInviteCode('');
                  setSelectedFamilyId(null);
                }}
                className={`${styles.toggleButton} ${familyMode === 'create' ? styles.toggleButtonActive : ''}`}
              >
                Create New
              </button>
              <button
                type="button"
                onClick={() => {
                  setFamilyMode('join');
                  setFamilyName('');
                  setInviteCode('');
                }}
                className={`${styles.toggleButton} ${familyMode === 'join' ? styles.toggleButtonActive : ''}`}
              >
                Join Existing
              </button>
            </div>

            {familyMode === 'create' ? (
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                disabled={loading}
                placeholder="Enter family name"
                required
              />
            ) : (
              <div>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                  }}
                  disabled={loading}
                  placeholder="Enter family invite code (e.g., abc12345)"
                  className={styles.searchInputWrapper}
                  maxLength={8}
                  style={{ textTransform: 'lowercase', fontFamily: 'monospace', letterSpacing: '0.1em' }}
                />
                {searching && <small>Searching...</small>}
                {!searching && inviteCode.trim().length >= 4 && searchResults.length > 0 && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'var(--success-background)', borderRadius: '4px', color: 'var(--success-text)' }}>
                    ✓ Found family: <strong>{searchResults[0].name}</strong>
                  </div>
                )}
                {!searching && inviteCode.trim().length >= 4 && searchResults.length === 0 && (
                  <small className={styles.searchMessage}>No family found with this invite code</small>
                )}
                {inviteCode.trim().length > 0 && inviteCode.trim().length < 4 && (
                  <small className={styles.searchMessage}>Enter at least 4 characters</small>
                )}
                {inviteCode.trim().length === 0 && (
                  <small className={styles.searchMessage} style={{ marginTop: '0.5rem', display: 'block' }}>
                    Ask the family owner for the invite code to join their family
                  </small>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={styles.primaryButton}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className={styles.divider}>
          <span>or</span>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className={styles.googleButton}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.467-.806 5.965-2.186l-2.908-2.258c-.806.54-1.837.86-3.057.86-2.35 0-4.34-1.587-5.053-3.72H.957v2.331C2.438 15.983 5.482 18 9 18z"
              fill="#34A853"
            />
            <path
              d="M3.947 10.696c-.18-.54-.282-1.117-.282-1.696s.102-1.156.282-1.696V4.973H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.027l2.99-2.331z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.973L3.947 7.304C4.66 5.17 6.65 3.58 9 3.58z"
              fill="#EA4335"
            />
          </svg>
          Sign up with Google
        </button>

        <p className={styles.footer}>
          Already have an account?{' '}
          <a href="/auth/login" className={styles.link}>
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}

