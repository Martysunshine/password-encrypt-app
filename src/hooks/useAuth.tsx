import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";

function sanitizeAuthError(error: { message?: string; status?: number }): Error {
  const msg = error.message ?? "";
  if (/invalid login credentials/i.test(msg) || /invalid password/i.test(msg)) {
    return new Error("Invalid credentials. Please check your email and password.");
  }
  if (/email not confirmed/i.test(msg)) {
    return new Error("Please confirm your email address before signing in.");
  }
  if (/user already registered/i.test(msg) || /already been registered/i.test(msg)) {
    return new Error("An account with this email already exists.");
  }
  if (/rate limit/i.test(msg) || /too many requests/i.test(msg) || error.status === 429) {
    return new Error("Too many attempts. Please wait a moment and try again.");
  }
  if (/password should be/i.test(msg) || /password must be/i.test(msg)) {
    return new Error("Password does not meet the minimum requirements.");
  }
  if (/invalid email/i.test(msg)) {
    return new Error("Please enter a valid email address.");
  }
  return new Error("Something went wrong. Please try again.");
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren): JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadSession = async (): Promise<void> => {
      const { data, error } = await supabase.auth.getSession();
      if (!isActive) {
        return;
      }
      if (error !== null) {
        setSession(null);
        setUser(null);
        setIsLoading(false);
        return;
      }

      setSession(data.session);
      setUser(data.session?.user ?? null);
      setIsLoading(false);
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isActive) {
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error !== null) {
      throw sanitizeAuthError(error);
    }
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error !== null) {
      throw sanitizeAuthError(error);
    }
  };

  const signOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error !== null) {
      throw sanitizeAuthError(error);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isAuthenticated: user !== null,
      isLoading,
      signUp,
      signIn,
      signOut,
    }),
    [isLoading, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
