"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import styles from './Auth.module.css';

interface Family {
  id: string;
  name: string;
}

export function FamilySelection() {
  const [familyMode, setFamilyMode] = useState<'create' | 'join'>('create');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [familySearch, setFamilySearch] = useState('');
  const [searchResults, setSearchResults] = useState<Family[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { createOrJoinFamily, user } = useAuth();
  const router = useRouter();

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

  // Also allow searching public families by name (optional)
  useEffect(() => {
    if (familyMode === 'join' && familySearch.trim().length > 0 && inviteCode.trim().length === 0) {
      const searchTimeout = setTimeout(async () => {
        setSearching(true);
        try {
          const response = await fetch(`/api/families?search=${encodeURIComponent(familySearch.trim())}`);
          if (response.ok) {
            const families = await response.json();
            setSearchResults(families);
          }
        } catch (err) {
          console.error('Error searching families:', err);
        } finally {
          setSearching(false);
        }
      }, 300); // Debounce search

      return () => clearTimeout(searchTimeout);
    } else if (inviteCode.trim().length > 0) {
      setSearchResults([]);
    }
  }, [familySearch, familyMode, inviteCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate family selection
    if (familyMode === 'create' && !familyName.trim()) {
      setError('Please enter a family name');
      return;
    }

    // When joining, invite code is REQUIRED
    if (familyMode === 'join') {
      if (!inviteCode.trim()) {
        setError('Please enter an invite code to join an existing family');
        return;
      }
      
      if (!selectedFamilyId) {
        setError('Invalid invite code. Please check and try again.');
        return;
      }
    }

    setLoading(true);

    const { error: familyError, familyId } = await createOrJoinFamily(
      familyMode === 'create' ? familyName.trim() : '',
      familyMode === 'join' ? (selectedFamilyId || undefined) : undefined
    );

    if (familyError) {
      setError(familyError.message);
      setLoading(false);
    } else if (familyId) {
      // Successfully created/joined family, redirect to home
      router.push('/');
    } else {
      setError('Failed to create or join family');
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h2>Welcome to HolidayHero!</h2>
        <p className={styles.subtitle}>Let&apos;s set up your family</p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Family</label>
            <div className={styles.toggleButtonGroup}>
              <button
                type="button"
                onClick={() => {
                  setFamilyMode('create');
                  setFamilySearch('');
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
                autoFocus
              />
            ) : (
              <div>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                    setFamilySearch('');
                  }}
                  disabled={loading}
                  placeholder="Enter family invite code (e.g., abc12345)"
                  className={styles.searchInputWrapper}
                  autoFocus
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
            {loading ? 'Setting up...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

