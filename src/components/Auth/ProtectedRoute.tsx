"use client";

import React, { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FamilySelection } from './FamilySelection';
import styles from './Auth.module.css';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, getFamilyId } = useAuth();
  const router = useRouter();
  const [checkingFamily, setCheckingFamily] = useState(true);
  const [hasFamily, setHasFamily] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // Check if user has a family (for Google OAuth users who haven't selected a family yet)
  // Also check if email is confirmed - don't show family selection if email isn't confirmed
  useEffect(() => {
    let isMounted = true;
    
    const checkFamily = async () => {
      if (user && !loading) {
        // Check if email is confirmed - if not, don't show family selection yet
        // For OAuth providers like Google, email_confirmed_at is typically set automatically
        // But if email confirmation is required and not done, we should wait
        if (!user.email_confirmed_at && user.email) {
          // Email not confirmed yet - wait for confirmation
          if (isMounted) {
            setHasFamily(false);
            setCheckingFamily(false);
          }
          return;
        }

        try {
          const familyId = await getFamilyId();
          // Only update state if component is still mounted
          if (isMounted) {
            setHasFamily(!!familyId);
            setCheckingFamily(false);
          }
        } catch (error) {
          console.error('Error checking family:', error);
          if (isMounted) {
            setHasFamily(false);
            setCheckingFamily(false);
          }
        }
      } else if (!user && !loading) {
        if (isMounted) {
          setCheckingFamily(false);
        }
      }
    };

    checkFamily();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [user, loading]); // Removed getFamilyId from dependencies to prevent infinite loop

  if (loading || checkingFamily) {
    return (
      <div className={styles.loadingContainer}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Check if email is confirmed - if not, show a message asking user to confirm email
  if (!user.email_confirmed_at && user.email) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.authCard}>
          <h2>Please confirm your email</h2>
          <p className={styles.subtitle}>
            We&apos;ve sent a confirmation email to <strong>{user.email}</strong>.
            Please check your inbox and click the confirmation link to continue.
          </p>
          <p className={styles.subtitle} style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
            If you don&apos;t see the email, check your spam folder or contact support.
          </p>
        </div>
      </div>
    );
  }

  // If user is authenticated but doesn't have a family, show family selection
  if (!hasFamily) {
    return <FamilySelection />;
  }

  return <>{children}</>;
}

