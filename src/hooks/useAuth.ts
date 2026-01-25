import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

export type UserRole = 'super_admin' | 'admin' | 'user' | null;

interface AuthState {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: UserRole;
  isLoading: boolean;
  // True when role verification RPCs have finished (success or failure)
  isRoleCheckComplete: boolean;
} 

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isAdmin: false,
    isSuperAdmin: false,
    role: null,
    isLoading: true,
    isRoleCheckComplete: false,
  });

  useEffect(() => {
    let cancelled = false;

    const checkRolesWithTimeout = async (userId: string) => {
    try {
      // Race a role check against a short timeout to avoid long waits on slow RPCs.
      // If the timeout fires, retry once without a timeout to avoid false negatives
      // (which can cause the app to sign the user out).
      const result = await Promise.race<any>([
        checkRoles(userId),
        new Promise<{ timeout: true }>((resolve) =>
          setTimeout(() => resolve({ timeout: true }), 8000)
        ),
      ]);

      if ((result as any).timeout) {
        console.warn('Role check timed out, retrying once without timeout for user', userId);
        try {
          return await checkRoles(userId);
        } catch (e) {
          console.error('Role re-check failed:', e);
          return { isAdmin: false, isSuperAdmin: false, role: null };
        }
      }

      return result as { isAdmin: boolean; isSuperAdmin: boolean; role: UserRole };
    } catch (e) {
      console.error('Error checking roles:', e);
      return { isAdmin: false, isSuperAdmin: false, role: null };
    }
  };

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const session = data.session;

        if (cancelled) return;

        // Debug: log initial session info
        console.debug('[useAuth] getInitialSession', { time: new Date().toISOString(), userId: session?.user?.id });

        if (session?.user) {
          const roleInfo = await checkRolesWithTimeout(session.user.id);
          if (cancelled) return;

          console.debug('[useAuth] roleInfo (initial)', { userId: session.user.id, roleInfo });

          setAuthState({
            user: session.user,
            session,
            isAdmin: roleInfo.isAdmin,
            isSuperAdmin: roleInfo.isSuperAdmin,
            role: roleInfo.role,
            isLoading: false,
            isRoleCheckComplete: true,
          });
        } else {
          setAuthState({
            user: null,
            session: null,
            isAdmin: false,
            isSuperAdmin: false,
            role: null,
            isLoading: false,
            isRoleCheckComplete: true,
          });
        }
      } catch (e) {
        console.error('Auth init error:', e);
        if (!cancelled) {
          setAuthState({
            user: null,
            session: null,
            isAdmin: false,
            isSuperAdmin: false,
            role: null,
            isLoading: false,
            isRoleCheckComplete: true,
          });
        }
      }
    }; 

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          // Debug: log auth change events
          console.debug('[useAuth] onAuthStateChange', { time: new Date().toISOString(), event, userId: session?.user?.id });

          if (session?.user) {
            const roleInfo = await checkRolesWithTimeout(session.user.id);
            if (cancelled) return;

            console.debug('[useAuth] roleInfo (onAuthStateChange)', { userId: session.user.id, roleInfo });

            setAuthState({
              user: session.user,
              session,
              isAdmin: roleInfo.isAdmin,
              isSuperAdmin: roleInfo.isSuperAdmin,
              role: roleInfo.role,
              isLoading: false,
              isRoleCheckComplete: true,
            });
          } else {
            if (cancelled) return;
            setAuthState({
              user: null,
              session: null,
              isAdmin: false,
              isSuperAdmin: false,
              role: null,
              isLoading: false,
              isRoleCheckComplete: true,
            });
          }
        } catch (e) {
          console.error('Auth change error:', e);
          if (!cancelled) {
            setAuthState({
              user: session?.user ?? null,
              session: session ?? null,
              isAdmin: false,
              isSuperAdmin: false,
              role: null,
              isLoading: false,
              isRoleCheckComplete: true,
            });
          }
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return authState;
};

const checkRoles = async (userId: string): Promise<{ isAdmin: boolean; isSuperAdmin: boolean; role: UserRole }> => {
  // Check for super_admin first
  const { data: isSuperAdmin, error: superError } = await supabase.rpc('is_super_admin', {
    _user_id: userId,
  });

  if (superError) {
    console.error('Error checking super_admin role:', superError);
  }

  if (isSuperAdmin) {
    return { isAdmin: true, isSuperAdmin: true, role: 'super_admin' };
  }

  // Check for regular admin
  const { data: isAdmin, error: adminError } = await supabase.rpc('has_role', {
    _user_id: userId,
    _role: 'admin',
  });

  if (adminError) {
    console.error('Error checking admin role:', adminError);
    return { isAdmin: false, isSuperAdmin: false, role: null };
  }

  if (isAdmin) {
    return { isAdmin: true, isSuperAdmin: false, role: 'admin' };
  }

  return { isAdmin: false, isSuperAdmin: false, role: 'user' };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

export const signUp = async (email: string, password: string) => {
  const redirectUrl = `${window.location.origin}/`;
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
    },
  });

  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};