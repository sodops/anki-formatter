"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if Supabase is configured
  const isConfigured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    if (!isConfigured) {
      // Supabase not configured — skip auth, run as guest
      setLoading(false);
      return;
    }

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Notify vanilla JS modules about auth state change
      window.dispatchEvent(
        new CustomEvent("ankiflow:auth-change", {
          detail: {
            user: session?.user ?? null,
            accessToken: session?.access_token ?? null,
          },
        })
      );
    });

    return () => subscription.unsubscribe();
  }, [isConfigured]);

  const signOut = async () => {
    if (isConfigured) {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
    }
    // Clear cloud sync state, keep localStorage as offline cache
    window.dispatchEvent(
      new CustomEvent("ankiflow:auth-change", {
        detail: { user: null, accessToken: null },
      })
    );
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
