import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { authConfigured, supabase } from './supabase';

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useSession() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useSession must be wrapped in a <SessionProvider />');
  }
  return value;
}

function germanAuthError(message: string) {
  if (/invalid login credentials/i.test(message)) return 'E-Mail oder Passwort falsch.';
  if (/email not confirmed/i.test(message)) return 'E-Mail-Adresse noch nicht bestätigt. Bitte Posteingang prüfen.';
  if (/network/i.test(message)) return 'Keine Verbindung. Bitte Internet prüfen und erneut versuchen.';
  return message;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(authConfigured);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: 'Anmeldung ist noch nicht konfiguriert.' };
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return { error: error ? germanAuthError(error.message) : null };
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, isLoading, configured: authConfigured, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
