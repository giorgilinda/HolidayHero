"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabaseClient } from '@/lib/supabase-client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getFamilyId: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabaseClient.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const signOut = async () => {
    await supabaseClient.auth.signOut();
  };

  const getFamilyId = async (): Promise<string | null> => {
    if (!user) return null;

    // Get user's first family (or default family)
    const { data, error } = await supabaseClient
      .from('user_families')
      .select('family_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (error || !data) {
      // If no family exists, try to link to existing "default" family first
      // (in case it was created manually or from migration)
      const { data: defaultFamily } = await supabaseClient
        .from('families')
        .select('id')
        .eq('name', 'default')
        .limit(1)
        .single();

      if (defaultFamily) {
        // Link user to existing default family
        console.log('Linking user to existing default family:', { familyId: defaultFamily.id, userId: user.id });
        const { error: linkError } = await supabaseClient
          .from('user_families')
          .insert({
            user_id: user.id,
            family_id: defaultFamily.id,
            role: 'owner',
          });

        if (!linkError) {
          console.log('Successfully linked to default family');
          return defaultFamily.id;
        } else {
          // Extract link error details
          const linkErrorMessage = linkError.message || linkError.details || linkError.hint || linkError.code || 'Unknown error';
          console.warn('Failed to link to default family, will create new one:', {
            message: linkErrorMessage,
            fullError: linkError,
          });
          
          // If it's a duplicate key error (user already linked), try to get the family_id
          if (linkError.code === '23505' || linkErrorMessage.includes('duplicate') || linkErrorMessage.includes('unique')) {
            console.log('User might already be linked, trying to fetch existing link...');
            const { data: existingLink } = await supabaseClient
              .from('user_families')
              .select('family_id')
              .eq('user_id', user.id)
              .eq('family_id', defaultFamily.id)
              .single();
            
            if (existingLink) {
              console.log('Found existing link to default family');
              return existingLink.family_id;
            }
          }
        }
      }

      // If no default family exists or linking failed, create a new one
      const defaultFamilyName = `${user.email?.split('@')[0] || 'user'}_family`;
      
      console.log('Creating new family:', { defaultFamilyName, userId: user.id });
      
      const { data: newFamily, error: createError, status, statusText } = await supabaseClient
        .from('families')
        .insert({ name: defaultFamilyName })
        .select('id')
        .single();

      console.log('Family creation response:', { 
        hasData: !!newFamily, 
        hasError: !!createError, 
        status, 
        statusText,
        newFamily,
        createError 
      });

      if (createError) {
        // Try multiple ways to extract error information
        let errorMessage = 'Unknown error';
        let errorCode = '';
        let errorDetails = '';
        
        // Try to get error message from various properties
        if (typeof createError === 'string') {
          errorMessage = createError;
        } else if (createError?.message) {
          errorMessage = createError.message;
        } else if (createError?.details) {
          errorMessage = createError.details;
        } else if (createError?.hint) {
          errorMessage = createError.hint;
        }
        
        // Try to get error code
        if (createError?.code) {
          errorCode = createError.code;
        }
        
        // Try to stringify the error (might fail if it has circular references)
        try {
          errorDetails = JSON.stringify(createError, Object.getOwnPropertyNames(createError));
        } catch (e) {
          errorDetails = String(createError);
        }
        
        // Log everything we can
        console.error('=== Family Creation Error ===');
        console.error('Error type:', typeof createError);
        console.error('Error constructor:', createError?.constructor?.name);
        console.error('Error message:', errorMessage);
        console.error('Error code:', errorCode);
        console.error('Error details:', errorDetails);
        console.error('Error keys:', createError ? Object.keys(createError) : 'no keys');
        console.error('Full error object:', createError);
        console.error('===========================');
        
        // Check for common RLS errors
        const errorString = errorMessage.toLowerCase() + errorDetails.toLowerCase();
        if (errorString.includes('permission') || errorString.includes('policy') || errorString.includes('rls') || errorString.includes('23503')) {
          errorMessage = `Permission denied. Please ensure the authentication migration (003_add_authentication.sql) has been run and RLS policies are correctly configured. Error: ${errorMessage || errorCode || 'Unknown'}`;
        }
        
        throw new Error(`Failed to create default family: ${errorMessage || errorCode || 'Unknown error'}`);
      }

      if (!newFamily) {
        console.error('Failed to create default family: No data returned from insert');
        throw new Error('Failed to create default family: No data returned');
      }
      
      console.log('Family created successfully:', newFamily);

      // User will be auto-added as owner via trigger
      // Wait a moment for the trigger to complete, then verify
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify the user was added to the family
      const { data: userFamilyCheck } = await supabaseClient
        .from('user_families')
        .select('family_id')
        .eq('user_id', user.id)
        .eq('family_id', newFamily.id)
        .single();

      if (!userFamilyCheck) {
        console.warn('User was not automatically added to family. This might be a trigger issue.');
        // Try to manually add the user as owner
        const { error: addUserError } = await supabaseClient
          .from('user_families')
          .insert({
            user_id: user.id,
            family_id: newFamily.id,
            role: 'owner',
          });

        if (addUserError) {
          console.error('Failed to manually add user to family:', addUserError);
        }
      }

      return newFamily.id;
    }

    return data.family_id;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        getFamilyId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

