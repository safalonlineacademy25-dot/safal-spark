import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isAdmin: false,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    const checkAdminRoleWithTimeout = async (userId: string) => {
      try {
        return await Promise.race<boolean>([
          checkAdminRole(userId),
          new Promise<boolean>((resolve) =>
            setTimeout(() => resolve(false), 8000)
          ),
        ]);
      } catch (e) {
        console.error('Error checking admin role:', e);
        return false;
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
          const isAdmin = await checkAdminRoleWithTimeout(session.user.id);
          if (cancelled) return;

          setAuthState({
            user: session.user,
            session,
            isAdmin,
            isLoading: false,
          });
        } else {
          setAuthState({
            user: null,
            session: null,
            isAdmin: false,
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
            const isAdmin = await checkAdminRoleWithTimeout(session.user.id);
            if (cancelled) return;

            setAuthState({
              user: session.user,
              session,
              isAdmin,
              isLoading: false,
            });
          } else {
            if (cancelled) return;
            setAuthState({
              user: null,
              session: null,
              isAdmin: false,
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

const checkAdminRole = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc('has_role', {
    _user_id: userId,
    _role: 'admin',
  });

  if (error) {
    console.error('Error checking admin role:', error);
    return false;
  }

  return !!data;
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
