"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabaseClient } from '@/lib/supabase-client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, familyName?: string, familyId?: string) => Promise<{ error: AuthError | null; session?: Session | null }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getFamilyId: () => Promise<string | null>;
  createOrJoinFamily: (familyName: string, familyId?: string) => Promise<{ error: Error | null; familyId: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Cache for family ID to prevent repeated calls
  const familyIdCacheRef = useRef<{ userId: string | null; familyId: string | null; promise: Promise<string | null> | null }>({
    userId: null,
    familyId: null,
    promise: null,
  });

  // Initialize auth state
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
    } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // If user just logged in/confirmed email and has pending family info, link them
      if (session?.user) {
        const pendingFamilyName = localStorage.getItem('pending_family_name');
        const pendingFamilyId = localStorage.getItem('pending_family_id');
        
        if (pendingFamilyName || pendingFamilyId) {
          // Wait for user state to be set, then try to link family
          // Use a retry mechanism to wait for the user state to be available
          const attemptFamilyLink = async (retries = 5) => {
            // Wait a bit for user state to be set
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Get the current user from state (it should be set by now)
            const currentUser = user || session?.user;
            if (!currentUser) {
              if (retries > 0) {
                console.log(`Waiting for user state... ${retries} retries left`);
                return attemptFamilyLink(retries - 1);
              }
              console.error('User state not available after retries');
              return;
            }
            
            // Verify session is available for RLS
            const { data: { session: currentSession }, error: sessionError } = await supabaseClient.auth.getSession();
            if (sessionError || !currentSession) {
              if (retries > 0) {
                console.log(`Waiting for session... ${retries} retries left`);
                return attemptFamilyLink(retries - 1);
              }
              console.error('No valid session available for family creation:', sessionError);
              return;
            }
            
            // Verify the session has a user
            if (!currentSession.user) {
              if (retries > 0) {
                console.log(`Session has no user, retrying... ${retries} retries left`);
                return attemptFamilyLink(retries - 1);
              }
              console.error('Session exists but has no user after retries');
              return;
            }
            
            // Now proceed with family creation
            const currentUserForFamily = currentUser;
            
            try {
              // Check if user has a family already
              const { data: existingFamily } = await supabaseClient
                .from('user_families')
                .select('family_id')
                .eq('user_id', currentUserForFamily.id)
                .limit(1)
                .maybeSingle();
              
              if (existingFamily) {
                // User already has a family, clear pending info
                localStorage.removeItem('pending_family_name');
                localStorage.removeItem('pending_family_id');
                return;
              }
              
              // Create or join family using the same logic as createOrJoinFamily
              // but using currentUser from session instead of user from state
              let targetFamilyId: string | null = null;
              
              try {
                if (pendingFamilyId) {
                  // Join existing family
                  const { error: linkError } = await supabaseClient
                    .from('user_families')
                    .insert({
                      user_id: currentUserForFamily.id,
                      family_id: pendingFamilyId,
                      role: 'member',
                    });
                  
                  if (linkError) {
                    // If it's a duplicate key error, user is already linked
                    if (linkError.code === '23505') {
                      targetFamilyId = pendingFamilyId;
                    } else {
                      throw new Error(`Failed to join family: ${linkError.message}`);
                    }
                  } else {
                    targetFamilyId = pendingFamilyId;
                  }
                } else if (pendingFamilyName && pendingFamilyName.trim().length > 0) {
                  // Check if family name already exists (case-insensitive)
                  const { data: existingFamily } = await supabaseClient
                    .from('families')
                    .select('id, name')
                    .ilike('name', pendingFamilyName.trim())
                    .maybeSingle();
                  
                  if (existingFamily) {
                    console.error(`Family "${pendingFamilyName.trim()}" already exists. User should use invite code instead.`);
                    localStorage.removeItem('pending_family_name');
                    localStorage.removeItem('pending_family_id');
                    return;
                  }
                  
                  // Create new family with invite code (same logic as createOrJoinFamily)
                  const generateInviteCode = () => {
                    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
                    let code = '';
                    for (let i = 0; i < 8; i++) {
                      code += chars.charAt(Math.floor(Math.random() * chars.length));
                    }
                    return code;
                  };
                  
                  let inviteCode = generateInviteCode();
                  let attempts = 0;
                  // Ensure unique invite code (retry if collision)
                  while (attempts < 10) {
                    const { data: existing } = await supabaseClient
                      .from('families')
                      .select('id')
                      .eq('invite_code', inviteCode)
                      .maybeSingle();
                    
                    if (!existing) break;
                    inviteCode = generateInviteCode();
                    attempts++;
                  }
                  
                  // Verify session is available for RLS before creating family
                  console.log('Creating family with authenticated user:', currentUserForFamily.id);
                  
                  // Create new family (private by default, with invite code)
                  const { data: newFamily, error: createError } = await supabaseClient
                    .from('families')
                    .insert({ 
                      name: pendingFamilyName.trim(),
                      invite_code: inviteCode,
                      is_public: false,
                      allow_public_join: false
                    })
                    .select('id')
                    .single();
                  
                  if (createError || !newFamily) {
                    // Check if it's a unique constraint violation on name
                    if (createError?.code === '23505') {
                      console.error(`Family "${pendingFamilyName.trim()}" already exists. User should use invite code instead.`);
                      localStorage.removeItem('pending_family_name');
                      localStorage.removeItem('pending_family_id');
                      return;
                    }
                    // Log full error details for RLS debugging
                    console.error('Failed to create family:', {
                      error: createError,
                      message: createError?.message,
                      code: createError?.code,
                      details: createError?.details,
                      hint: createError?.hint,
                      userId: currentUserForFamily.id
                    });
                    throw new Error(`Failed to create family: ${createError?.message || 'Unknown error'}`);
                  }
                  
                  // User will be auto-added as owner via trigger
                  targetFamilyId = newFamily.id;
                  
                  // Wait a moment for trigger to complete, then verify
                  await new Promise(resolve => setTimeout(resolve, 200));
                  
                  // Verify the user was added to the family
                  const { data: userFamilyCheck } = await supabaseClient
                    .from('user_families')
                    .select('family_id')
                    .eq('user_id', currentUserForFamily.id)
                    .eq('family_id', newFamily.id)
                    .maybeSingle();
                  
                  if (!userFamilyCheck) {
                    console.warn('User was not automatically added to family. Trying to manually add...');
                    // Try to manually add the user as owner
                    const { error: addUserError } = await supabaseClient
                      .from('user_families')
                      .insert({
                        user_id: currentUserForFamily.id,
                        family_id: newFamily.id,
                        role: 'owner',
                      });
                    
                    if (addUserError) {
                      console.error('Failed to manually add user to family:', addUserError);
                    }
                  }
                }
                
                if (targetFamilyId) {
                  console.log('Successfully linked to family after email confirmation:', targetFamilyId);
                  // Update cache
                  if (currentUserForFamily) {
                    familyIdCacheRef.current = {
                      userId: currentUserForFamily.id,
                      familyId: targetFamilyId,
                      promise: null,
                    };
                  }
                  localStorage.removeItem('pending_family_name');
                  localStorage.removeItem('pending_family_id');
                } else {
                  console.error('Failed to link family after email confirmation: No family ID returned');
                }
              } catch (error) {
                console.error('Failed to link family after email confirmation:', error);
                // Log full error details for debugging
                if (error instanceof Error) {
                  console.error('Error details:', {
                    message: error.message,
                    stack: error.stack
                  });
                } else {
                  console.error('Error object:', error);
                }
              }
            } catch (error) {
              console.error('Unexpected error linking pending family:', error);
            }
          };
          
          // Start the retry mechanism
          attemptFamilyLink();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [user, session]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, familyName?: string, familyId?: string) => {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { error };
    }

    // If user was created and family info provided, handle family linking
    if (data.user && (familyName || familyId)) {
      // Store family info in localStorage to link after email confirmation
      // (in case email confirmation is required)
      if (familyName) {
        localStorage.setItem('pending_family_name', familyName);
      }
      if (familyId) {
        localStorage.setItem('pending_family_id', familyId);
      }

      // If user is immediately authenticated (no email confirmation required),
      // try to link the family right away using data.user directly
      if (data.session && data.user) {
        try {
          console.log('User authenticated immediately, linking family...', { 
            userId: data.user.id, 
            familyName, 
            familyId 
          });
          
          // Create or join family directly using the authenticated user from signup
          let targetFamilyId: string | null = null;
          
          if (familyId) {
            // Join existing family
            const { error: linkError } = await supabaseClient
              .from('user_families')
              .insert({
                user_id: data.user.id,
                family_id: familyId,
                role: 'member',
              });
            
            if (linkError) {
              if (linkError.code === '23505') {
                // Already linked
                targetFamilyId = familyId;
              } else {
                throw new Error(`Failed to join family: ${linkError.message}`);
              }
            } else {
              targetFamilyId = familyId;
            }
          } else if (familyName && familyName.trim().length > 0) {
            // Check if family name already exists (case-insensitive)
            const { data: existingFamily, error: existingFamilyError } = await supabaseClient
              .from('families')
              .select('id, name')
              .ilike('name', familyName.trim())
              .maybeSingle();
            
            if (existingFamilyError) {
              // If RLS blocks the check, log it but continue
              // The database constraint will prevent duplicates anyway
              console.warn('Could not check for existing family name due to RLS, but continuing. Database constraint will prevent duplicates:', existingFamilyError);
            } else if (existingFamily) {
              throw new Error(`A family with the name "${familyName.trim()}" already exists. Please ask the family owner for the invite code to join instead.`);
            }
            
            // Create new family with invite code
            // Generate a random 8-character invite code
            const generateInviteCode = () => {
              const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
              let code = '';
              for (let i = 0; i < 8; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
              }
              return code;
            };
            
            let inviteCode = generateInviteCode();
            let attempts = 0;
            // Ensure unique invite code (retry if collision)
            while (attempts < 10) {
              const { data: existing } = await supabaseClient
                .from('families')
                .select('id')
                .eq('invite_code', inviteCode)
                .maybeSingle();
              
              if (!existing) break;
              inviteCode = generateInviteCode();
              attempts++;
            }
            
            // Create new family (private by default, with invite code)
            const { data: newFamily, error: createError } = await supabaseClient
              .from('families')
              .insert({ 
                name: familyName.trim(),
                invite_code: inviteCode,
                is_public: false,
                allow_public_join: false
              })
              .select('id')
              .single();
            
            if (createError || !newFamily) {
              // Log full error for debugging
              console.error('Failed to create family - Full error details:', {
                error: createError,
                code: createError?.code,
                message: createError?.message,
                details: createError?.details,
                hint: createError?.hint,
                constraint: createError?.details?.includes('idx_families_name_unique_lower') || createError?.hint?.includes('idx_families_name_unique_lower')
              });
              
              // Check if it's a unique constraint violation on name
              // Error code 23505 = unique_violation
              // Also check the error message and details for duplicate/unique keywords
              const isDuplicateError = 
                createError?.code === '23505' || 
                createError?.message?.toLowerCase().includes('unique') || 
                createError?.message?.toLowerCase().includes('duplicate') ||
                createError?.details?.includes('idx_families_name_unique_lower') ||
                createError?.hint?.includes('idx_families_name_unique_lower') ||
                createError?.message?.toLowerCase().includes('already exists');
              
              if (isDuplicateError) {
                const duplicateError = new Error(`A family with the name "${familyName.trim()}" already exists. Please ask the family owner for the invite code to join instead.`);
                console.error('Duplicate family name detected, throwing error:', duplicateError.message);
                throw duplicateError;
              }
              
              throw new Error(`Failed to create family: ${createError?.message || 'Unknown error'}`);
            }
            
            // User will be auto-added as owner via trigger
            targetFamilyId = newFamily.id;
            
            // Wait a moment for trigger to complete, then verify
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Verify the user was added to the family
            const { data: userFamilyCheck } = await supabaseClient
              .from('user_families')
              .select('family_id')
              .eq('user_id', data.user.id)
              .eq('family_id', newFamily.id)
              .maybeSingle();
            
            if (!userFamilyCheck) {
              console.warn('User was not automatically added to family. Trying to manually add...');
              // Try to manually add the user as owner
              const { error: addUserError } = await supabaseClient
                .from('user_families')
                .insert({
                  user_id: data.user.id,
                  family_id: newFamily.id,
                  role: 'owner',
                });
              
              if (addUserError) {
                console.error('Failed to manually add user to family:', addUserError);
              }
            }
          }
          
          if (targetFamilyId) {
            console.log('Successfully linked to family during signup:', targetFamilyId);
            // Update cache
            if (data.user) {
              familyIdCacheRef.current = {
                userId: data.user.id,
                familyId: targetFamilyId,
                promise: null,
              };
            }
            // Clear pending family info since we successfully linked
            localStorage.removeItem('pending_family_name');
            localStorage.removeItem('pending_family_id');
          } else {
            console.error('Failed to link family during signup - family info stored for later');
          }
        } catch (familyError) {
          console.error('Error linking family during signup:', familyError);
          // If it's a duplicate family name error, return it so the user sees the error
          if (familyError instanceof Error && 
              (familyError.message.includes('already exists') || 
               familyError.message.includes('duplicate') ||
               familyError.message.includes('unique'))) {
            // Create an AuthError-like object to return
            const authError: AuthError = {
              name: 'AuthError',
              message: familyError.message,
            } as AuthError;
            return { error: authError, session: null };
          }
          // For other errors, don't fail signup - family info is stored in localStorage and will be processed later
        }
      } else {
        console.log('Email confirmation required - family will be linked after confirmation');
      }
    }

    return { error: null, session: data.session };
  };

  const createOrJoinFamily = async (familyName: string, familyId?: string): Promise<{ error: Error | null; familyId: string | null }> => {
    if (!user) {
      return { error: new Error('User not authenticated'), familyId: null };
    }

    try {
      let targetFamilyId: string | null = null;

      if (familyId) {
        // Join existing family
        const { error: linkError } = await supabaseClient
          .from('user_families')
          .insert({
            user_id: user.id,
            family_id: familyId,
            role: 'member',
          });

        if (linkError) {
          // If it's a duplicate key error, user is already linked
          if (linkError.code === '23505') {
            targetFamilyId = familyId;
          } else {
            throw new Error(`Failed to join family: ${linkError.message}`);
          }
        } else {
          targetFamilyId = familyId;
        }
      } else if (familyName && familyName.trim().length > 0) {
        const trimmedName = familyName.trim();
        
        // Check if family name already exists (case-insensitive)
        // Try multiple approaches to catch duplicates
        let existingFamily = null;
        
        // First, try a direct case-insensitive search
        const { data: directMatch, error: directError } = await supabaseClient
          .from('families')
          .select('id, name')
          .ilike('name', trimmedName)
          .maybeSingle();
        
        if (!directError && directMatch) {
          existingFamily = directMatch;
        } else {
          // If direct search fails, try fetching all and checking manually
          // This is a fallback in case RLS blocks the direct query
          const { data: allFamilies, error: allError } = await supabaseClient
            .from('families')
            .select('id, name');
          
          if (!allError && allFamilies) {
            const match = allFamilies.find(
              f => f.name && f.name.trim().toLowerCase() === trimmedName.toLowerCase()
            );
            if (match) {
              existingFamily = match;
            }
          }
        }
        
        // If we found an existing family, throw an error
        if (existingFamily) {
          throw new Error(`A family with the name "${trimmedName}" already exists. Please ask the family owner for the invite code to join instead.`);
        }
        
        // Create new family with invite code
        // Generate a random 8-character invite code
        const generateInviteCode = () => {
          const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
          let code = '';
          for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return code;
        };
        
        let inviteCode = generateInviteCode();
        let attempts = 0;
        // Ensure unique invite code (retry if collision)
        while (attempts < 10) {
          const { data: existing } = await supabaseClient
            .from('families')
            .select('id')
            .eq('invite_code', inviteCode)
            .maybeSingle();
          
          if (!existing) break;
          inviteCode = generateInviteCode();
          attempts++;
        }
        
        // Create new family (private by default, with invite code)
        const { data: newFamily, error: createError } = await supabaseClient
          .from('families')
          .insert({ 
            name: trimmedName,
            invite_code: inviteCode,
            is_public: false,
            allow_public_join: false
          })
          .select('id')
          .single();

        if (createError || !newFamily) {
          // Check if it's a unique constraint violation on name
          // Error code 23505 = unique_violation
          // Check multiple ways the error might be reported
          const errorMessage = createError?.message?.toLowerCase() || '';
          const errorDetails = createError?.details?.toLowerCase() || '';
          const errorHint = createError?.hint?.toLowerCase() || '';
          const isDuplicateError = 
            createError?.code === '23505' || 
            errorMessage.includes('unique') || 
            errorMessage.includes('duplicate') ||
            errorMessage.includes('already exists') ||
            errorDetails.includes('idx_families_name_unique_lower') ||
            errorDetails.includes('unique') ||
            errorHint.includes('idx_families_name_unique_lower') ||
            errorHint.includes('unique');
          
          if (isDuplicateError) {
            throw new Error(`A family with the name "${trimmedName}" already exists. Please ask the family owner for the invite code to join instead.`);
          }
          
          // Log full error for debugging
          console.error('Failed to create family:', {
            error: createError,
            code: createError?.code,
            message: createError?.message,
            details: createError?.details,
            hint: createError?.hint
          });
          throw new Error(`Failed to create family: ${createError?.message || 'Unknown error'}`);
        }

        // User will be auto-added as owner via trigger
        targetFamilyId = newFamily.id;
      } else {
        return { error: new Error('Family name or ID is required'), familyId: null };
      }

      // Clear cache when family is created/joined
      if (targetFamilyId && user) {
        familyIdCacheRef.current = {
          userId: user.id,
          familyId: targetFamilyId,
          promise: null,
        };
      }

      return { error: null, familyId: targetFamilyId };
    } catch (error) {
      return { 
        error: error instanceof Error ? error : new Error('Unknown error'), 
        familyId: null 
      };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('Error initiating Google OAuth:', error);
        throw error;
      }

      // If data.url exists, the redirect should happen automatically
      // If not, there might be an issue with the OAuth configuration
      if (!data?.url) {
        console.error('No redirect URL returned from OAuth');
        throw new Error('Failed to initiate Google sign-in. Please check your OAuth configuration.');
      }
    } catch (error) {
      console.error('Error in signInWithGoogle:', error);
      throw error;
    }
  };

  const signOut = async () => {
    // Clear cache on sign out
    familyIdCacheRef.current = { userId: null, familyId: null, promise: null };
    await supabaseClient.auth.signOut();
  };

  const getFamilyId = useCallback(async (): Promise<string | null> => {
    if (!user) {
      // Clear cache if user is null
      familyIdCacheRef.current = { userId: null, familyId: null, promise: null };
      return null;
    }

    // If we have a cached result for this user, return it
    if (familyIdCacheRef.current.userId === user.id && familyIdCacheRef.current.familyId !== null) {
      // Return cached result without logging (to reduce console noise)
      return familyIdCacheRef.current.familyId;
    }

    // If there's already a pending request for this user, return that promise
    if (familyIdCacheRef.current.userId === user.id && familyIdCacheRef.current.promise) {
      return familyIdCacheRef.current.promise;
    }

    // Create a new request
    const fetchPromise = (async () => {
      try {
        // Get user's first family
        // Use maybeSingle() instead of single() to avoid throwing when no rows found
        const { data, error } = await supabaseClient
          .from('user_families')
          .select('family_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        let result: string | null = null;
        if (!error && data) {
          result = data.family_id;
        }

        // Cache the result
        if (familyIdCacheRef.current.userId === user.id) {
          familyIdCacheRef.current.familyId = result;
          familyIdCacheRef.current.promise = null;
        }

        return result;
      } catch (err) {
        // Clear promise on error
        if (familyIdCacheRef.current.userId === user.id) {
          familyIdCacheRef.current.promise = null;
        }
        // Catch any unexpected errors and return null instead of throwing
        console.error('Unexpected error in getFamilyId:', err);
        return null;
      }
    })();

    // Store the promise in cache
    familyIdCacheRef.current = {
      userId: user.id,
      familyId: null,
      promise: fetchPromise,
    };

    return fetchPromise;
  }, [user]);

  // Clear cache when user changes
  useEffect(() => {
    if (!user || familyIdCacheRef.current.userId !== user.id) {
      familyIdCacheRef.current = { userId: user?.id || null, familyId: null, promise: null };
    }
  }, [user]);

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
        createOrJoinFamily,
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

