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
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isAdmin: false,
    isSuperAdmin: false,
    role: null,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    const checkRolesWithTimeout = async (userId: string) => {
      try {
        return await Promise.race<{ isAdmin: boolean; isSuperAdmin: boolean; role: UserRole }>([
          checkRoles(userId),
          new Promise<{ isAdmin: boolean; isSuperAdmin: boolean; role: UserRole }>((resolve) =>
            setTimeout(() => resolve({ isAdmin: false, isSuperAdmin: false, role: null }), 8000)
          ),
        ]);
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

        if (session?.user) {
          const roleInfo = await checkRolesWithTimeout(session.user.id);
          if (cancelled) return;

          setAuthState({
            user: session.user,
            session,
            isAdmin: roleInfo.isAdmin,
            isSuperAdmin: roleInfo.isSuperAdmin,
            role: roleInfo.role,
            isLoading: false,
          });
        } else {
          setAuthState({
            user: null,
            session: null,
            isAdmin: false,
            isSuperAdmin: false,
            role: null,
            isLoading: false,
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
          });
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          if (session?.user) {
            const roleInfo = await checkRolesWithTimeout(session.user.id);
            if (cancelled) return;

            setAuthState({
              user: session.user,
              session,
              isAdmin: roleInfo.isAdmin,
              isSuperAdmin: roleInfo.isSuperAdmin,
              role: roleInfo.role,
              isLoading: false,
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