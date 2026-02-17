"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type UserRole = "student" | "teacher" | "admin";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: UserRole;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: "student",
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>("student");

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

    // Safety timeout — if auth takes longer than 5 seconds, stop loading
    const timeout = setTimeout(() => {
      console.warn("[Auth] timeout — forcing loading=false");
      setLoading(false);
    }, 5000);

    // Fetch user role via server API (avoids RLS issues with client-side Supabase)
    const fetchRole = async (): Promise<UserRole> => {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) {
          console.warn("[Auth] /api/me returned", res.status);
          return "student";
        }
        const data = await res.json();
        console.log("[Auth] /api/me result:", { role: data.role, email: data.user?.email });
        
        if (data.role) {
          const r = data.role as UserRole;
          setRole(r);
          return r;
        }
      } catch (err) {
        console.warn("[Auth] /api/me fetch failed:", err);
      }
      return "student";
    };

    // Primary: get initial session from Supabase client, then fetch role from server
    const initAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn("[Auth] getSession error:", error.message);
        }
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        if (initialSession?.user) {
          // Fetch role from server API (reliable, uses server-side Supabase)
          await fetchRole();
        } else {
          console.log("[Auth] No session — user not logged in");
        }
      } catch (err) {
        console.warn("Auth init failed:", err);
      } finally {
        setLoading(false);
        clearTimeout(timeout);
      }
    };

    initAuth();

    // Secondary: listen for subsequent auth changes (sign in/out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      let currentRole: UserRole = "student";
      if (session?.user) {
        currentRole = await fetchRole();
      } else {
        setRole("student");
      }

      // Notify vanilla JS modules about auth state change
      window.dispatchEvent(
        new CustomEvent("ankiflow:auth-change", {
          detail: {
            user: session?.user ?? null,
            accessToken: session?.access_token ?? null,
            role: currentRole,
          },
        })
      );
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
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
    <AuthContext.Provider value={{ user, session, loading, role, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
