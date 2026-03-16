import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(null); // null = unknown

  const checkOnboarding = async (userId) => {
    const { data, error } = await supabase
      .from('user_settings')
      .select('onboarding_completed')
      .eq('user_id', userId)
      .single();

    if (error) {
      // PGRST116 = row not found → genuinely new user → needs onboarding
      if (error.code === 'PGRST116') {
        setOnboardingCompleted(false);
      } else {
        // Any other error (e.g. column not yet migrated, network error)
        // → assume onboarded to prevent infinite redirect loop
        setOnboardingCompleted(true);
      }
      return;
    }

    setOnboardingCompleted(data?.onboarding_completed ?? false);
  };

  useEffect(() => {
    // Restore session on mount — also check onboarding
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          checkOnboarding(session.user.id);
        } else {
          setOnboardingCompleted(null);
        }
      })
      .catch(() => {
        // getSession() failed (network error, etc.) — unblock the loading spinner
        setLoading(false);
        setOnboardingCompleted(null);
      });

    // Listen for sign-in / sign-out / token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkOnboarding(session.user.id);
      } else {
        setOnboardingCompleted(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  /** Call this after onboarding wizard finishes to skip redirect. */
  const completeOnboarding = () => setOnboardingCompleted(true);

  return (
    <AuthContext.Provider value={{
      user, session, loading,
      onboardingCompleted, completeOnboarding,
      signUp, signIn, signInWithGoogle, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}
